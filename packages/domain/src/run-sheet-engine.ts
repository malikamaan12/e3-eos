export type CueStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'skipped';

export interface LiveRunSheetItem {
  id: string;
  projectId: string;
  cueNumber: string;
  title: string;
  department: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  delayMinutes: number;
  status: CueStatus;
  dependentOnCues: string[]; // array of cueNumbers or IDs
  responsiblePerson: string;
  notes?: string;
  isCriticalPath?: boolean;
}

export interface CuePropagationResult {
  updatedItem: LiveRunSheetItem;
  propagatedItems: LiveRunSheetItem[];
  totalDelayedMinutes: number;
  impactedCuesCount: number;
  criticalPathImpacted: boolean;
}

export class LiveRunSheetEngine {
  /**
   * Applies an operational update or delay to a cue, propagating downstream delays to dependent cues (AT-062).
   */
  static applyCueDelay(
    cueNumber: string,
    delayMinutes: number,
    items: LiveRunSheetItem[],
    options?: {
      actualStart?: string;
      actualEnd?: string;
      status?: CueStatus;
      notes?: string;
    }
  ): CuePropagationResult {
    const itemsMap = new Map<string, LiveRunSheetItem>();
    for (const item of items) {
      itemsMap.set(item.cueNumber, { ...item });
    }

    const targetCue = itemsMap.get(cueNumber);
    if (!targetCue) {
      throw new Error(`CUE_NOT_FOUND: Cue with number '${cueNumber}' does not exist on the run sheet.`);
    }

    targetCue.delayMinutes = delayMinutes;
    targetCue.status = options?.status ?? (delayMinutes > 0 ? 'delayed' : targetCue.status);
    if (options?.actualStart) targetCue.actualStart = options.actualStart;
    if (options?.actualEnd) targetCue.actualEnd = options.actualEnd;
    if (options?.notes) targetCue.notes = options.notes;

    // Propagate downstream
    const propagated: LiveRunSheetItem[] = [];
    const queue: string[] = [cueNumber];
    const visited = new Set<string>([cueNumber]);

    while (queue.length > 0) {
      const currentCueNum = queue.shift()!;
      const currentCue = itemsMap.get(currentCueNum)!;
      const currentDelay = currentCue.delayMinutes;

      // Find all cues directly dependent on currentCueNum
      for (const [otherNum, otherCue] of itemsMap.entries()) {
        if (otherCue.dependentOnCues && otherCue.dependentOnCues.includes(currentCueNum)) {
          if (!visited.has(otherNum)) {
            visited.add(otherNum);

            // Shift planned times by the delay
            const oldStart = new Date(otherCue.plannedStart).getTime();
            const oldEnd = new Date(otherCue.plannedEnd).getTime();
            const delayMs = currentDelay * 60 * 1000;

            otherCue.delayMinutes = Math.max(otherCue.delayMinutes, currentDelay);
            otherCue.plannedStart = new Date(oldStart + delayMs).toISOString();
            otherCue.plannedEnd = new Date(oldEnd + delayMs).toISOString();
            if (otherCue.status === 'pending' && currentDelay > 0) {
              otherCue.status = 'delayed';
            }
            otherCue.notes = otherCue.notes
              ? `${otherCue.notes} (Delayed by +${currentDelay}m via upstream cue ${currentCueNum})`
              : `Delayed by +${currentDelay}m via upstream cue ${currentCueNum}`;

            propagated.push(otherCue);
            queue.push(otherNum);
          }
        }
      }
    }

    const criticalPathImpacted = [targetCue, ...propagated].some((c) => c.isCriticalPath);

    return {
      updatedItem: targetCue,
      propagatedItems: propagated,
      totalDelayedMinutes: delayMinutes,
      impactedCuesCount: propagated.length + 1,
      criticalPathImpacted,
    };
  }

  /**
   * Evaluates overall run sheet schedule adherence and identifies current active cue.
   */
  static getActiveRunSheetOverview(items: LiveRunSheetItem[], referenceTime: Date = new Date()): {
    totalCues: number;
    completedCues: number;
    pendingCues: number;
    delayedCues: number;
    activeCue?: LiveRunSheetItem;
    nextCriticalCue?: LiveRunSheetItem;
    totalCumulativeDelayMinutes: number;
  } {
    const completed = items.filter((i) => i.status === 'completed').length;
    const pending = items.filter((i) => i.status === 'pending').length;
    const delayed = items.filter((i) => i.status === 'delayed').length;

    const ref = referenceTime.getTime();
    const inProgress = items.find((i) => i.status === 'in_progress');
    const activeCue =
      inProgress ||
      items.find((i) => {
        const start = new Date(i.plannedStart).getTime();
        const end = new Date(i.plannedEnd).getTime();
        return ref >= start && ref <= end;
      });

    const nextCriticalCue = items.find(
      (i) => i.isCriticalPath && i.status !== 'completed' && i.status !== 'skipped'
    );

    const maxDelay = items.reduce((max, i) => Math.max(max, i.delayMinutes), 0);

    return {
      totalCues: items.length,
      completedCues: completed,
      pendingCues: pending,
      delayedCues: delayed,
      activeCue,
      nextCriticalCue,
      totalCumulativeDelayMinutes: maxDelay,
    };
  }
}
