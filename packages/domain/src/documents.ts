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

/**
 * Generates an ISO-standard E3 engineering document identifier.
 * Format: E3-[PROJECT]-[DISCIPLINE]-[TYPE]-[SEQUENCE]
 * Example: E3-QND26-AV-DWG-0001
 */
export function generateDocumentNumber(params: {
  projectCode: string;
  discipline: EngineeringDiscipline;
  documentType: ControlledDocumentType;
  sequence: number;
}): string {
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

  const dCode = disciplineCodes[params.discipline] || 'GEN';
  const tCode = typeCodes[params.documentType] || 'DOC';
  const seqStr = String(params.sequence).padStart(4, '0');
  const proj = params.projectCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return `E3-${proj}-${dCode}-${tCode}-${seqStr}`;
}

/**
 * Validates document content integrity using SHA-256 canonical hashing.
 */
export function verifyDocumentIntegrity(contentBuffer: Buffer | string, expectedHash: string): boolean {
  const actualHash = createHash('sha256').update(contentBuffer).digest('hex');
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Enforces Zero Profit Margin & Supplier Cost Leakage on client transmittals.
 * Strips internal unit costs, margins, and proprietary supplier references.
 */
export function redactDocumentForClientDistribution<T extends Record<string, any>>(data: T): Partial<T> {
  const redacted = { ...data };
  const sensitiveKeys = [
    'unitCost',
    'unit_cost',
    'totalCost',
    'total_cost',
    'supplierMargin',
    'marginPercent',
    'margin_percent',
    'internalMargin',
    'internal_margin',
    'markupPercent',
    'internalRate',
    'buyRate',
    'buy_rate',
    'subcontractorCost',
    'subcontractor_cost',
    'supplierName',
    'contractorQuoteRef',
  ];

  for (const key of sensitiveKeys) {
    if (key in redacted) {
      delete (redacted as any)[key];
    }
  }

  return redacted;
}
