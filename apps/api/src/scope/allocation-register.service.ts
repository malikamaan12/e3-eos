import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { CANONICAL_ROLES, hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';
import { requirementQuantity, requirementSnapshotHash } from './requirement-intake.service.js';

const permissions = ['projects.manage', 'design.version', 'operations.manage'];
const readAccess = { level: 'viewer' as const, audiences: ['internal'] as Array<'internal'>, permissions };
const writeAccess = { ...readAccess, level: 'editor' as const };
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, title: detail, detail }, status); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = (value: any) => value ? new Date(value).toISOString() : null;
function identifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) fail('ALLOCATION_INPUT_INVALID', `${label} must be a UUID.`);
  return (value as string).toLowerCase();
}
function version(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) fail('ALLOCATION_VERSION_REQUIRED', `${label} must be a positive integer.`);
  return value as number;
}
function optional(value: unknown, label: string, max: number): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > max) fail('ALLOCATION_INPUT_INVALID', `${label} must be text of at most ${max} characters or null.`);
  return (value as string).trim() || null;
}
export interface AllocationDraftInput {
  requirementId: string; expectedRequirementVersion: number; quantity: string | null; unit: string | null;
  location: string | null; zone: string | null; subLocation: string | null; department: string | null;
  ownerId: string | null; notes: string | null; reason: string; expectedVersion?: number;
}
export function validateAllocationDraft(body: any, revision = false): AllocationDraftInput {
  const keys = ['requirementId', 'expectedRequirementVersion', 'quantity', 'unit', 'location', 'zone', 'subLocation', 'department', 'ownerId', 'notes', 'reason', ...(revision ? ['expectedVersion'] : [])];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key))) fail('ALLOCATION_INPUT_INVALID', 'Only allocation planning fields are accepted. Approval, progress, dates and release states cannot be supplied.');
  const reason = optional(body.reason, 'Reason', 2000);
  if (!reason) fail('ALLOCATION_REASON_REQUIRED', 'Record a reason for this planning revision.');
  return { requirementId: identifier(body.requirementId, 'Requirement'), expectedRequirementVersion: version(body.expectedRequirementVersion, 'expectedRequirementVersion'),
    quantity: requirementQuantity(body.quantity), unit: optional(body.unit, 'Unit', 80), location: optional(body.location, 'Location', 250),
    zone: optional(body.zone, 'Zone', 250), subLocation: optional(body.subLocation, 'Sub-location', 250), department: optional(body.department, 'Department', 250),
    ownerId: body.ownerId == null || body.ownerId === '' ? null : identifier(body.ownerId, 'Owner'), notes: optional(body.notes, 'Notes', 4000),
    reason: reason!, ...(revision ? { expectedVersion: version(body.expectedVersion, 'expectedVersion') } : {}) };
}
const select = `SELECT a.*,r.title AS requirement_title,r.row_version AS source_version,r.current_revision_id AS source_revision_id,
  r.provenance_state AS source_provenance,r.status AS source_status,r.is_approved AS source_approved,r.is_archived AS source_archived,
  v.snapshot AS current_snapshot,v.snapshot_hash AS current_snapshot_hash
  FROM requirement_allocations a JOIN requirements r ON r.id=a.requirement_id AND r.organisation_id=a.organisation_id AND r.project_id=a.project_id
  LEFT JOIN requirement_allocation_revisions v ON v.id=a.current_revision_id AND v.allocation_id=a.id AND v.organisation_id=a.organisation_id AND v.project_id=a.project_id`;
const currentFields = (row: any) => ({ quantity: row.quantity == null ? null : requirementQuantity(String(row.quantity)), unit: row.unit,
  location: row.location, zone: row.zone, subLocation: row.sub_location, department: row.department, ownerId: row.owner_id, notes: row.location_notes });
const inputFields = (input: AllocationDraftInput) => ({ quantity: input.quantity, unit: input.unit, location: input.location, zone: input.zone,
  subLocation: input.subLocation, department: input.department, ownerId: input.ownerId, notes: input.notes });

/** Canonical allocation planning; no allocation here grants delivery or approval authority. */
export class AllocationRegisterService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); this.commands = new DurableProjectCommand(db); }
  private capabilities(access: ProjectAccessContext) {
    const edit = access.accessLevel === 'editor' && permissions.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin));
    return { canCreateDraft: edit, canReviseDraft: edit, canApprove: false, canRelease: false };
  }
  private stale(row: any) { return row.requirement_version !== row.source_version || row.requirement_revision_id !== row.source_revision_id
    || row.source_provenance !== 'manually_recorded' || row.source_status !== 'draft' || row.source_approved !== false || row.source_archived !== false; }
  private revisable(row: any) { return row.provenance_state === 'manually_recorded' && row.status === 'draft' && !!row.current_revision_id; }
  private summary(row: any, access: ProjectAccessContext) {
    return { id: row.id, projectId: row.project_id, requirementId: row.requirement_id, requirementVersion: row.requirement_version,
      requirementRevisionId: row.requirement_revision_id, requirementTitle: row.requirement_title, quantity: row.quantity == null ? null : String(row.quantity),
      unit: row.unit, location: row.location, zone: row.zone, subLocation: row.sub_location, department: row.department, ownerId: row.owner_id,
      notes: row.location_notes, status: row.provenance_state === 'manually_recorded' ? row.status : 'legacy_unverified',
      rowVersion: row.row_version, currentRevisionId: row.current_revision_id, revision: row.revision, provenanceState: row.provenance_state,
      staleSource: this.stale(row), currentRequirementVersion: row.source_version, canRevise: this.capabilities(access).canReviseDraft && this.revisable(row),
      authorityEffect: 'planning_only', createdAt: date(row.created_at), updatedAt: date(row.updated_at) };
  }
  private async scoped(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string) {
    const row = (await tx.query(`${select} WHERE a.id=$1 AND a.organisation_id=$2 AND a.project_id=$3 FOR UPDATE OF a`, [id, access.organisationId, access.project.id])).rows[0];
    if (!row) fail('ALLOCATION_NOT_FOUND', 'Allocation is unavailable in this project scope.', 404);
    return row;
  }
  private async requirement(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string, expected?: number) {
    const row = (await tx.query(`SELECT r.*,v.snapshot,v.snapshot_hash,v.provenance_state AS revision_provenance FROM requirements r
      LEFT JOIN requirement_revisions v ON v.id=r.current_revision_id AND v.requirement_id=r.id AND v.organisation_id=r.organisation_id AND v.project_id=r.project_id
      WHERE r.id=$1 AND r.organisation_id=$2 AND r.project_id=$3 FOR UPDATE OF r`, [id, access.organisationId, access.project.id])).rows[0];
    if (!row) fail('ALLOCATION_REQUIREMENT_NOT_FOUND', 'Requirement is unavailable in this project scope.', 404);
    if (expected === undefined) return row;
    if (row.row_version !== expected) fail('ALLOCATION_REQUIREMENT_VERSION_CONFLICT', 'Requirement changed. Refresh and deliberately select its current revision.', 409);
    if (row.provenance_state !== 'manually_recorded' || row.revision_provenance !== 'manually_recorded' || row.status !== 'draft'
      || row.is_approved !== false || row.is_archived !== false || !row.current_revision_id) fail('ALLOCATION_REQUIREMENT_UNAVAILABLE', 'Allocation planning requires a recorded, unapproved, unarchived requirement draft.', 409);
    const expectedSnapshot = { requirementId: row.id, projectId: row.project_id, revisionNumber: row.current_revision, title: row.title,
      originalWording: row.original_wording, interpretation: row.interpretation, sourceType: row.source_type, sourceReference: row.source_reference,
      category: row.category, quantity: row.quantity == null ? null : requirementQuantity(String(row.quantity)), unit: row.unit, locationZone: row.location_zone,
      acceptanceCriteria: row.acceptance_criteria, ownerId: row.owner_id, startDate: null, dueDate: null, status: 'draft', isApproved: false,
      sourceVerification: 'unverified', operationalScopePublished: false };
    if (!row.snapshot || row.start_date != null || row.due_date != null || requirementSnapshotHash(row.snapshot) !== row.snapshot_hash
      || requirementSnapshotHash(expectedSnapshot) !== row.snapshot_hash) fail('ALLOCATION_REQUIREMENT_HISTORY_CONFLICT', 'Requirement does not match its immutable snapshot. A controlled reconciliation is required.', 409);
    return row;
  }
  private async owner(tx: ProjectAccessTransaction, access: ProjectAccessContext, ownerId: string | null) {
    if (!ownerId) return;
    const row = (await tx.query(`SELECT m.role FROM memberships m JOIN project_access_grants g ON g.membership_id=m.id AND g.organisation_id=m.organisation_id
      WHERE m.organisation_id=$1 AND m.user_id=$2 AND NOT m.is_revoked AND m.audience='internal' AND g.project_id=$3 AND NOT g.is_revoked FOR UPDATE OF m,g`,
      [access.organisationId, ownerId, access.project.id])).rows[0];
    if (!row || !CANONICAL_ROLES.includes(normalizeRole(row.role) as any) || normalizeRole(row.role) === 'client_user') fail('ALLOCATION_OWNER_UNAVAILABLE', 'Owner must have active internal membership and an explicit project grant.', 404);
  }
  private snapshot(id: string, projectId: string, revision: number, source: any, fields: any) {
    return { allocationId: id, projectId, revisionNumber: revision, requirementId: source.id, requirementVersion: source.row_version,
      requirementRevisionId: source.current_revision_id, requirementSnapshotHash: source.snapshot_hash, ...fields, status: 'draft', authorityEffect: 'planning_only' };
  }
  private async append(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string, revision: number, source: any, input: AllocationDraftInput) {
    const revisionId = randomUUID(), snapshot = this.snapshot(id, access.project.id, revision, source, inputFields(input)), snapshotHash = requirementSnapshotHash(snapshot);
    await tx.query(`INSERT INTO requirement_allocation_revisions(id,organisation_id,project_id,allocation_id,revision_number,snapshot,snapshot_hash,reason,author_id)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`, [revisionId, access.organisationId, access.project.id, id, revision, JSON.stringify(snapshot), snapshotHash, input.reason, access.userId]);
    return { revisionId, snapshotHash };
  }
  async list(project: string, req: Request) {
    return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      const rows = (await tx.query(`${select} WHERE a.organisation_id=$1 AND a.project_id=$2 ORDER BY a.created_at DESC,a.id LIMIT 501`, [access.organisationId, access.project.id])).rows;
      // Aggregate the complete controlled register in PostgreSQL numeric arithmetic; UI grouping never changes totals.
      const totals = (await tx.query(`SELECT r.id AS requirement_id,r.row_version AS requirement_version,r.quantity AS requirement_quantity,r.unit,r.quantity_basis,
        COALESCE(sum(a.quantity) FILTER (WHERE a.unit=r.unit AND r.unit IS NOT NULL),0)::text AS known_allocation_quantity,
        count(*) FILTER (WHERE a.quantity IS NULL)::int AS unknown_quantity_count,
        count(*) FILTER (WHERE a.unit IS NULL OR r.unit IS NULL OR a.unit<>r.unit)::int AS unit_mismatch_count,
        CASE WHEN r.quantity IS NOT NULL AND r.unit IS NOT NULL AND count(*) FILTER (WHERE a.quantity IS NULL OR a.unit IS NULL OR a.unit<>r.unit)=0
          THEN (r.quantity-sum(a.quantity))::text ELSE NULL END AS arithmetic_difference,
        count(*) FILTER (WHERE a.requirement_version<>r.row_version OR a.requirement_revision_id<>r.current_revision_id)::int AS stale_allocation_count
        FROM requirements r JOIN requirement_allocations a ON a.requirement_id=r.id AND a.organisation_id=r.organisation_id AND a.project_id=r.project_id
        WHERE a.organisation_id=$1 AND a.project_id=$2 AND a.provenance_state='manually_recorded'
        GROUP BY r.id,r.row_version,r.quantity,r.unit,r.quantity_basis ORDER BY r.id LIMIT 501`, [access.organisationId, access.project.id])).rows;
      return { data: rows.slice(0, 500).map(row => this.summary(row, access)), meta: { capabilities: this.capabilities(access), limit: 500, truncated: rows.length > 500,
        quantityComparisons: totals.slice(0, 500).map(row => ({ requirementId: row.requirement_id, requirementVersion: row.requirement_version,
          requirementQuantity: row.requirement_quantity == null ? null : String(row.requirement_quantity), unit: row.unit,
          knownAllocationQuantity: row.known_allocation_quantity, unknownQuantityCount: row.unknown_quantity_count, unitMismatchCount: row.unit_mismatch_count,
          arithmeticDifference: row.arithmetic_difference, quantityBasis: row.quantity_basis, applicability: 'unknown', staleAllocationCount: row.stale_allocation_count })),
        quantityComparisonsTruncated: totals.length > 500, disclosure: 'Planning drafts only. Arithmetic is not a quantity compliance decision; no approved quantity basis or release authority is inferred.' } };
    });
  }
  async get(project: string, id: string, req: Request) {
    identifier(id, 'Allocation'); return this.access.withAccess(req, project, readAccess, async (tx, access) => ({ data: this.summary(await this.scoped(tx, access, id), access) }));
  }
  async revisions(project: string, id: string, req: Request) {
    identifier(id, 'Allocation'); return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      await this.scoped(tx, access, id);
      const rows = (await tx.query(`SELECT * FROM requirement_allocation_revisions WHERE allocation_id=$1 AND organisation_id=$2 AND project_id=$3 ORDER BY revision_number DESC LIMIT 501`, [id, access.organisationId, access.project.id])).rows;
      return { data: rows.slice(0, 500).map(row => ({ id: row.id, allocationId: row.allocation_id, revisionNumber: row.revision_number,
        snapshot: row.snapshot, snapshotHash: row.snapshot_hash, reason: row.reason, authorId: row.author_id, createdAt: date(row.created_at),
        snapshotIntegrityVerified: requirementSnapshotHash(row.snapshot) === row.snapshot_hash })), meta: { truncated: rows.length > 500, limit: 500 } };
    });
  }
  async create(project: string, body: unknown, req: Request) {
    const input = validateAllocationDraft(body);
    return this.commands.run(req, project, { ...writeAccess, operation: 'allocation.register.create', action: 'allocation.draft_recorded', targetType: 'requirement_allocation', input,
      authorize: async (tx, access) => { await this.requirement(tx, access, input.requirementId); await this.owner(tx, access, input.ownerId); },
    }, async (tx, access) => {
      const source = await this.requirement(tx, access, input.requirementId, input.expectedRequirementVersion), id = randomUUID();
      await tx.query(`INSERT INTO requirement_allocations(id,organisation_id,project_id,requirement_id,quantity,unit,location,zone,sub_location,department,owner_id,location_notes,
        status,revision,row_version,provenance_state,requirement_revision_id,requirement_version,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',1,1,'manually_recorded',$13,$14,$15)`,
        [id, access.organisationId, access.project.id, input.requirementId, input.quantity, input.unit, input.location, input.zone, input.subLocation,
          input.department, input.ownerId, input.notes, source.current_revision_id, source.row_version, access.userId]);
      const revision = await this.append(tx, access, id, 1, source, input);
      await tx.query('UPDATE requirement_allocations SET current_revision_id=$4 WHERE id=$1 AND organisation_id=$2 AND project_id=$3', [id, access.organisationId, access.project.id, revision.revisionId]);
      return { id, data: this.summary(await this.scoped(tx, access, id), access), version: 1,
        event: { revisionId: revision.revisionId, snapshotHash: revision.snapshotHash, requirementId: source.id, requirementVersion: source.row_version, authorityEffect: 'planning_only' } };
    });
  }
  async revise(project: string, id: string, body: unknown, req: Request) {
    identifier(id, 'Allocation'); const input = validateAllocationDraft(body, true);
    return this.commands.run(req, project, { ...writeAccess, operation: `allocation.register.${id}.revise`, action: 'allocation.draft_revised', targetType: 'requirement_allocation', input,
      authorize: async (tx, access) => { await this.scoped(tx, access, id); await this.requirement(tx, access, input.requirementId); await this.owner(tx, access, input.ownerId); },
    }, async (tx, access) => {
      const row = await this.scoped(tx, access, id);
      if (!this.revisable(row)) fail('ALLOCATION_REVISION_UNAVAILABLE', 'Only a recorded draft allocation can be revised. Legacy or released records require a separate controlled process.', 409);
      if (row.row_version !== input.expectedVersion) fail('ALLOCATION_VERSION_CONFLICT', 'Allocation changed. Refresh before preparing another revision.', 409);
      if (row.requirement_id !== input.requirementId) fail('ALLOCATION_REQUIREMENT_IMMUTABLE', 'An allocation retains its requirement identity. Record a separate allocation for a different obligation.', 409);
      const snapshot = row.current_snapshot;
      const expectedSnapshot = this.snapshot(id, access.project.id, row.revision, { id: row.requirement_id, row_version: row.requirement_version,
        current_revision_id: row.requirement_revision_id, snapshot_hash: snapshot?.requirementSnapshotHash }, currentFields(row));
      if (!snapshot || requirementSnapshotHash(snapshot) !== row.current_snapshot_hash || requirementSnapshotHash(expectedSnapshot) !== row.current_snapshot_hash) fail('ALLOCATION_HISTORY_CONFLICT', 'Current allocation differs from its immutable revision. A controlled reconciliation is required.', 409);
      const source = await this.requirement(tx, access, input.requirementId, input.expectedRequirementVersion), next = row.row_version + 1;
      const revision = await this.append(tx, access, id, row.revision + 1, source, input);
      await tx.query(`UPDATE requirement_allocations SET quantity=$4,unit=$5,location=$6,zone=$7,sub_location=$8,department=$9,owner_id=$10,location_notes=$11,
        requirement_revision_id=$12,requirement_version=$13,current_revision_id=$14,row_version=$15,revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3`, [id, access.organisationId, access.project.id, input.quantity, input.unit, input.location, input.zone,
          input.subLocation, input.department, input.ownerId, input.notes, source.current_revision_id, source.row_version, revision.revisionId, next]);
      return { id, data: this.summary(await this.scoped(tx, access, id), access), version: next,
        event: { previousRevisionId: row.current_revision_id, revisionId: revision.revisionId, snapshotHash: revision.snapshotHash,
          requirementId: source.id, requirementVersion: source.row_version, authorityEffect: 'planning_only' } };
    });
  }
}
