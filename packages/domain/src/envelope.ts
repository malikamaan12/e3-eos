import { KnowledgeStatus } from './states.js';

export interface RecordProvenance {
  sourceType: 'user_input' | 'system_transition' | 'integration_import' | 'offline_sync';
  sourceRef?: string;
  sourceVersion?: string;
  correlationId?: string;
  causationId?: string;
}

export interface DomainRecordEnvelope {
  id: string; // Stable UUID
  organisationId: string; // Tenant boundary
  projectId?: string; // Optional project scope
  rowVersion: number; // Monotonically increasing optimistic concurrency counter
  knowledgeStatus: KnowledgeStatus;
  createdAt: string; // UTC ISO 8601
  updatedAt: string; // UTC ISO 8601
  createdBy: string; // Actor UUID
  updatedBy: string; // Actor UUID
  provenance: RecordProvenance;
}

export interface ScopedIdentity {
  userId: string;
  organisationId: string;
  roles: string[];
  permissions: string[];
  delegations?: Array<{
    delegatorId: string;
    validUntil: string;
    scope: string;
  }>;
}
