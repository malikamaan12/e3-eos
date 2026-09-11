/**
 * Document Control & Transmittal Engine
 * Core domain logic for E3 Event Operating System (EOS)
 *
 * Enforces standardized document numbering, SHA-256 integrity, controlled transmittals,
 * and client profit margin redaction.
 */

import { createHash } from 'crypto';

export type EngineeringDiscipline =
  | 'staging'
  | 'lighting'
  | 'audio_visual'
  | 'scenic'
  | 'power_hvac'
  | 'rigging'
  | 'health_safety'
  | 'operations';

export type ControlledDocumentType =
  | 'drawing'
  | 'specification'
  | 'method_statement'
  | 'schedule'
  | 'calculation'
  | 'report'
  | 'transmittal';

export type TransmittalPurpose =
  | 'for_information'
  | 'for_client_approval'
  | 'for_fabrication'
  | 'for_tender'
  | 'as_built';

export interface ControlledDocumentRecord {
  id: string;
  projectId: string;
  projectCode: string; // e.g. "QND26"
  documentNumber: string; // e.g. "E3-QND26-AV-DWG-0012"
  title: string;
  discipline: EngineeringDiscipline;
  documentType: ControlledDocumentType;
  confidentialityLevel: 'internal' | 'client_confidential' | 'public';
  currentRevisionCode: string; // e.g. "Rev 01"
  revisionsCount: number;
  createdBy: string;
  createdAt: string;
}

export interface DocumentRevisionRecord {
  id: string;
  documentId: string;
  revisionCode: string; // "Rev A", "Rev B", "Rev 01", etc.
  contentHash: string; // SHA-256 hex
  storageKey: string;
  fileSizeBytes: number;
  purpose: TransmittalPurpose;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  uploadedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface ControlledTransmittalPack {
  id: string;
  transmittalNumber: string; // e.g. "TR-QND26-0001"
  projectId: string;
  recipientOrganisation: string;
  recipientName: string;
  recipientEmail: string;
  purpose: TransmittalPurpose;
  issuedBy: string;
  issuedAt: string;
  items: Array<{
    documentNumber: string;
    title: string;
    revisionCode: string;
    contentHash: string;
    remarks?: string;
  }>;
  isClientFacing: boolean;
  acknowledgementStatus: 'pending' | 'acknowledged' | 'rejected';
}

export type DocumentNumberingProfileType =
  | 'e3_standard'
  | 'iso_19650'
  | 'client_defined'
  | 'authority_defined'
  | 'custom';

export interface DocumentNumberingOptions {
  profile?: DocumentNumberingProfileType;
  projectCode: string;
  discipline?: EngineeringDiscipline;
  documentType: ControlledDocumentType;
  sequence: number;
  // ISO 19650 specific fields
  originator?: string; // e.g. "E3QA"
  volumeOrSystem?: string; // e.g. "01" or "ZZ"
  levelOrLocation?: string; // e.g. "00" or "ZZ"
  role?: string; // e.g. "E", "S", "M"
  // Client / Authority / Custom fields
  clientCode?: string; // e.g. "QT"
  authorityCode?: string; // e.g. "QCD" or "MME"
  customTemplate?: string; // e.g. "{CLIENT}-{PROJECT}-{TYPE}-{SEQUENCE}"
}

/**
 * Generates an engineering document identifier according to the selected numbering profile.
 * Profiles:
 * - E3 Standard: E3-[PROJECT]-[DISCIPLINE]-[TYPE]-[SEQUENCE]
 * - ISO 19650: [PROJECT]-[ORIGINATOR]-[VOLUME]-[LEVEL]-[TYPE]-[ROLE]-[NUMBER]
 * - Client-Defined: [CLIENT]-[PROJECT]-[TYPE]-[SEQUENCE]
 * - Authority-Defined: [AUTHORITY]-[PROJECT]-[DISCIPLINE]-[SEQUENCE]
 * - Custom: Evaluated against provided template tokens
 *
 * System IDs (UUID) remain immutable and separate from document numbers.
 */
export function generateDocumentNumber(params: DocumentNumberingOptions): string {
  const profile = params.profile || 'e3_standard';

  const disciplineCodes: Record<EngineeringDiscipline, string> = {
    staging: 'STG',
    lighting: 'LGT',
    audio_visual: 'AV',
    scenic: 'SCN',
    power_hvac: 'PWR',
    rigging: 'RIG',
    health_safety: 'HSE',
    operations: 'OPS',
  };

  const typeCodes: Record<ControlledDocumentType, string> = {
    drawing: 'DWG',
    specification: 'SPC',
    method_statement: 'MS',
    schedule: 'SCH',
    calculation: 'CALC',
    report: 'REP',
    transmittal: 'TR',
  };

  const dCode = params.discipline ? (disciplineCodes[params.discipline] || 'GEN') : 'GEN';
  const tCode = typeCodes[params.documentType] || 'DOC';
  const seqStr = String(params.sequence).padStart(4, '0');
  const proj = params.projectCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  switch (profile) {
    case 'iso_19650': {
      const originator = (params.originator || 'E3QA').toUpperCase();
      const volume = (params.volumeOrSystem || 'ZZ').toUpperCase();
      const level = (params.levelOrLocation || '00').toUpperCase();
      const role = (params.role || 'E').toUpperCase();
      return `${proj}-${originator}-${volume}-${level}-${tCode}-${role}-${seqStr}`;
    }

    case 'client_defined': {
      const client = (params.clientCode || 'CLI').toUpperCase();
      return `${client}-${proj}-${tCode}-${seqStr}`;
    }

    case 'authority_defined': {
      const auth = (params.authorityCode || 'QCD').toUpperCase();
      return `${auth}-${proj}-${dCode}-${seqStr}`;
    }

    case 'custom': {
      if (!params.customTemplate) {
        return `E3-${proj}-${dCode}-${tCode}-${seqStr}`;
      }
      return params.customTemplate
        .replace(/{PROJECT}/g, proj)
        .replace(/{DISCIPLINE}/g, dCode)
        .replace(/{TYPE}/g, tCode)
        .replace(/{SEQUENCE}/g, seqStr)
        .replace(/{CLIENT}/g, (params.clientCode || 'CLI').toUpperCase())
        .replace(/{AUTHORITY}/g, (params.authorityCode || 'QCD').toUpperCase())
        .replace(/{ORIGINATOR}/g, (params.originator || 'E3QA').toUpperCase());
    }

    case 'e3_standard':
    default:
      return `E3-${proj}-${dCode}-${tCode}-${seqStr}`;
  }
}

/**
 * Validates document content integrity using SHA-256 canonical hashing.
 */
export function verifyDocumentIntegrity(contentBuffer: Buffer | string, expectedHash: string): boolean {
  const actualHash = createHash('sha256').update(contentBuffer).digest('hex');
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Enforces Zero Profit Margin & Supplier Cost Leakage on client transmittals and exports.
 * Deeply scrubs internal buy rates, supplier identities, internal margins, and internal commercial notes.
 */
export function redactDocumentForClientDistribution<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactDocumentForClientDistribution(item)) as unknown as T;
  }

  if (typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = new Set([
    'unitcost',
    'unit_cost',
    'totalcost',
    'total_cost',
    'costimpact',
    'cost_impact',
    'suppliermargin',
    'supplier_margin',
    'marginpercent',
    'margin_percent',
    'internalmargin',
    'internal_margin',
    'internalmarginpercent',
    'internal_margin_percent',
    'markuppercent',
    'markup_percent',
    'internalrate',
    'internal_rate',
    'buyrate',
    'buy_rate',
    'unitbuyrate',
    'unit_buy_rate',
    'subcontractorcost',
    'subcontractor_cost',
    'suppliername',
    'supplier_name',
    'supplierid',
    'supplier_id',
    'subcontractorname',
    'subcontractor_name',
    'contractorquoteref',
    'contractor_quote_ref',
    'internalnotes',
    'internal_notes',
    'commercialnotes',
    'commercial_notes',
    'internalremarks',
    'internal_remarks',
    'grossprofit',
    'gross_profit',
  ]);

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (sensitiveKeys.has(normalizedKey) || sensitiveKeys.has(key.toLowerCase())) {
      // Omit sensitive commercial fields completely from client output
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      result[key] = redactDocumentForClientDistribution(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
