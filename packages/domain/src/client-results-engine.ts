export interface ClientScopeItem {
  id: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  status: 'completed' | 'delivered' | 'operational';
  completionDate: string;
  // Sensitive internal fields that must be redacted
  buyRate?: number;
  internalMargin?: number;
  supplierName?: string;
}

export interface ClientAttendanceMetrics {
  totalAttendance: number;
  vipAttendance: number;
  peakOccupancyTime: string;
  accessPacePerHour: number;
  turnstileScanCount: number;
}

export interface ClientHighlight {
  id: string;
  title: string;
  description: string;
  category: 'opening' | 'milestone' | 'technical' | 'audience' | 'vip';
  timestamp: string;
}

export interface ClientResultsRoomData {
  projectId: string;
  projectName: string;
  eventDates: { start: string; end: string };
  venueName: string;
  deliveredScope: ClientScopeItem[];
  attendanceMetrics: ClientAttendanceMetrics;
  executiveHighlights: ClientHighlight[];
  curatedPhotos: Array<{ url: string; caption: string; zone: string }>;
  clientBillingSummary?: {
    contractValue: string;
    billedToDate: string;
    collectedToDate: string;
    remainingMilestones: string;
  };
  // Sensitive fields to sanitize
  internalIncidents?: any[];
  contractorMarkups?: any[];
  profitabilityAnalysis?: any;
}

export interface RedactedClientResultsRoom {
  projectId: string;
  projectName: string;
  eventDates: { start: string; end: string };
  venueName: string;
  deliveredScope: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    quantity: number;
    unit: string;
    status: string;
    completionDate: string;
  }>;
  attendanceMetrics: ClientAttendanceMetrics;
  executiveHighlights: ClientHighlight[];
  curatedPhotos: Array<{ url: string; caption: string; zone: string }>;
  clientBillingSummary?: {
    contractValue: string;
    billedToDate: string;
    collectedToDate: string;
    remainingMilestones: string;
  };
  serverRedactionVerified: boolean;
  redactedAt: string;
}

export class ClientResultsEngine {
  /**
   * Sanitizes project operational and commercial data for safe presentation in the Client Results Room.
   * Strictly filters out buy rates, internal labor margins, contractor markups, and internal incidents.
   */
  static buildRedactedResultsRoom(raw: ClientResultsRoomData): RedactedClientResultsRoom {
    // 1. Sanitize scope items - remove internal buy rates, contractor markups, supplier names
    const sanitizedScope = raw.deliveredScope.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      status: item.status,
      completionDate: item.completionDate,
    }));

    // 2. Deep sanitize any rogue internal fields
    const sanitizedHighlights = (raw.executiveHighlights || []).map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      category: h.category,
      timestamp: h.timestamp,
    }));

    return {
      projectId: raw.projectId,
      projectName: raw.projectName,
      eventDates: { ...raw.eventDates },
      venueName: raw.venueName,
      deliveredScope: sanitizedScope,
      attendanceMetrics: { ...raw.attendanceMetrics },
      executiveHighlights: sanitizedHighlights,
      curatedPhotos: [...(raw.curatedPhotos || [])],
      clientBillingSummary: raw.clientBillingSummary ? { ...raw.clientBillingSummary } : undefined,
      serverRedactionVerified: true,
      redactedAt: new Date().toISOString(),
    };
  }

  /**
   * Validates that an object contains zero leaked sensitive internal commercial keys.
   */
  static verifyZeroSensitiveLeaks(obj: unknown): boolean {
    const sensitiveTokens = [
      'buyrate',
      'buy_rate',
      'costprice',
      'cost_price',
      'contractormarkup',
      'contractor_markup',
      'internalmargin',
      'internal_margin',
      'internalincident',
      'internal_incident',
      'suppliercost',
      'supplier_cost',
      'wholesalecost',
      'labormargin',
      'labor_margin',
    ];

    const jsonStr = JSON.stringify(obj).toLowerCase();
    for (const token of sensitiveTokens) {
      if (jsonStr.includes(`"${token}"`)) {
        return false;
      }
    }
    return true;
  }
}
