export interface StageInstance {
  id: string;
  templateStageId: string;
  name: string;
  order: number;
  isArchived: boolean;
  cycleNumber: number; // 1 for initial, 2+ for repeats/reopens
  previousCycleInstanceId?: string; // Stable lineage pointer
}

export interface TaskNode {
  id: string;
  stageInstanceId: string;
  title: string;
  assigneeId?: string;
  isCompleted: boolean;
  completedAt?: string;
  deliverablePackageId?: string;
}

export interface DependencyEdge {
  id: string;
  predecessorId: string; // Task ID
  successorId: string;   // Task ID
  type: 'FS' | 'SS' | 'FF';
}

export class StageGraphEngine {
  /**
   * Validates that adding a dependency edge does not introduce a cyclic dependency.
   * Performs DFS / cycle detection on the directed graph.
   */
  static assertAcyclic(edges: DependencyEdge[], candidateEdge: DependencyEdge): void {
    const adj = new Map<string, string[]>();

    const allEdges = [...edges, candidateEdge];
    for (const edge of allEdges) {
      if (!adj.has(edge.predecessorId)) {
        adj.set(edge.predecessorId, []);
      }
      adj.get(edge.predecessorId)!.push(edge.successorId);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    function dfs(node: string): boolean {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected!
        }
      }

      recStack.delete(node);
      return false;
    }

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          throw new Error(
            `Cycle detected in task schedule graph: edge ${candidateEdge.predecessorId} -> ${candidateEdge.successorId} creates a circular dependency.`
          );
        }
      }
    }
  }

  /**
   * Reopens or repeats a stage by creating a new stage cycle instance with stable lineage,
   * avoiding circular graph dependencies (AT-018).
   */
  static repeatStage(
    currentInstances: StageInstance[],
    stageInstanceIdToRepeat: string
  ): { newInstance: StageInstance; updatedInstances: StageInstance[] } {
    const target = currentInstances.find((s) => s.id === stageInstanceIdToRepeat);
    if (!target) {
      throw new Error(`Stage instance ${stageInstanceIdToRepeat} not found`);
    }

    const nextCycle = target.cycleNumber + 1;
    const newInstanceId = `${target.templateStageId}-cycle-${nextCycle}-${Date.now()}`;

    const newInstance: StageInstance = {
      id: newInstanceId,
      templateStageId: target.templateStageId,
      name: `${target.name} (Cycle ${nextCycle})`,
      order: target.order + 0.1,
      isArchived: false,
      cycleNumber: nextCycle,
      previousCycleInstanceId: target.id,
    };

    return {
      newInstance,
      updatedInstances: [...currentInstances, newInstance],
    };
  }

  /**
   * Safely archives a stage instance.
   * Requirement preservation guarantee:
   * Archiving a stage never deletes attached requirements or obligations;
   * unmapped requirements are identified so they can be explicitly dispositioned or remapped (AT-017).
   */
  static archiveStage(
    instances: StageInstance[],
    stageIdToArchive: string,
    attachedRequirementIds: string[]
  ): {
    updatedInstances: StageInstance[];
    preservedRequirementsNeedingRemap: string[];
  } {
    const target = instances.find((s) => s.id === stageIdToArchive);
    if (!target) {
      throw new Error(`Stage instance ${stageIdToArchive} not found`);
    }

    const updatedInstances = instances.map((s) =>
      s.id === stageIdToArchive ? { ...s, isArchived: true } : s
    );

    return {
      updatedInstances,
      preservedRequirementsNeedingRemap: [...attachedRequirementIds],
    };
  }
}
