import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { CANONICAL_ROLES, hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';

export const REQUIREMENT_INTAKE_PERMISSIONS = ['projects.manage', 'design.version', 'operations.manage'];
export const REQUIREMENT_SOURCE_TYPES = ['manual', 'client_note', 'source_reference'] as const;
const readAccess = { level: 'viewer' as const, audiences: ['internal'] as Array<'internal'>, permissions: REQUIREMENT_INTAKE_PERMISSIONS };
const writeAccess = { ...readAccess, level: 'editor' as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, title: detail, detail }, status); };
const date = (value: unknown) => value ? new Date(value as string).toISOString() : null;
const stable = (value: any): any => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const requirementSnapshotHash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const fields = ['title', 'originalWording', 'interpretation', 'sourceType', 'sourceReference', 'category', 'quantity', 'unit', 'locationZone', 'acceptanceCriteria', 'ownerId'] as const;
export interface RequirementDraftInput {
  title: string; originalWording: string; interpretation: string | null;
  sourceType: typeof REQUIREMENT_SOURCE_TYPES[number]; sourceReference: string | null; category: string | null;
  quantity: string | null; unit: string | null; locationZone: string | null; acceptanceCriteria: string | null; ownerId: string | null;
}
function requiredText(value: unknown, label: string, max: number, preserve = false): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('REQUIREMENT_INPUT_INVALID', `${label} must contain 1–${max} characters.`);
  return preserve ? value as string : (value as string).trim();
}
function nullableText(value: unknown, label: string, max: number) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > max) fail('REQUIREMENT_INPUT_INVALID', `${label} must be text of at most ${max} characters or null.`);
  return (value as string).trim() || null;
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) fail('REQUIREMENT_INPUT_INVALID', `${label} must be a UUID.`);
  return (value as string).toLowerCase();
}
/** Decimal text avoids Number rounding and keeps unknown distinct from explicit zero. */
export function requirementQuantity(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/.test(value)) {
    fail('REQUIREMENT_QUANTITY_INVALID', 'Quantity must be a nonnegative decimal string with up to 18 integer and 6 fractional digits, or null.');
  }
  return (value as string).includes('.') ? (value as string).replace(/0+$/, '').replace(/\.$/, '') : value as string;
}
export function validateRequirementDraft(body: any, revision = false): RequirementDraftInput & { reason: string; expectedVersion?: number } {
  const allowed: readonly string[] = [...fields, 'reason', ...(revision ? ['expectedVersion'] : [])];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) {
    fail('REQUIREMENT_INPUT_INVALID', 'Only reviewed requirement draft fields are accepted. Approval, evidence verification, dates and downstream states cannot be supplied.');
  }
  if (!REQUIREMENT_SOURCE_TYPES.includes(body.sourceType)) fail('REQUIREMENT_SOURCE_INVALID', 'Source type must be manual, client_note or source_reference.');
  if (revision && (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1)) fail('REQUIREMENT_VERSION_REQUIRED', 'A positive expectedVersion is required.');
  return {
    title: requiredText(body.title, 'Title', 300), originalWording: requiredText(body.originalWording, 'Original wording', 16000, true),
    interpretation: nullableText(body.interpretation, 'Interpretation', 16000), sourceType: body.sourceType,
    sourceReference: nullableText(body.sourceReference, 'Source reference', 2000), category: nullableText(body.category, 'Category', 120),
    quantity: requirementQuantity(body.quantity), unit: nullableText(body.unit, 'Unit', 80),
    locationZone: nullableText(body.locationZone, 'Location or zone', 250), acceptanceCriteria: nullableText(body.acceptanceCriteria, 'Acceptance criteria', 8000),
    ownerId: body.ownerId == null || body.ownerId === '' ? null : identifier(body.ownerId, 'Owner'),
    reason: requiredText(body.reason, 'Reason', 2000), ...(revision ? { expectedVersion: body.expectedVersion } : {}),
  };
}
function draftFields(input: RequirementDraftInput): RequirementDraftInput {
  return Object.fromEntries(fields.map(field => [field, input[field]])) as unknown as RequirementDraftInput;
}
function rowFields(row: any): RequirementDraftInput {
  return { title: row.title, originalWording: row.original_wording, interpretation: row.interpretation,
    sourceType: row.source_type, sourceReference: row.source_reference, category: row.category,
    quantity: row.quantity == null ? null : requirementQuantity(String(row.quantity)), unit: row.unit,
    locationZone: row.location_zone, acceptanceCriteria: row.acceptance_criteria, ownerId: row.owner_id };
}
const select = `SELECT r.*,v.provenance_state AS current_revision_provenance FROM requirements r
  LEFT JOIN requirement_revisions v ON v.id=r.current_revision_id AND v.requirement_id=r.id
    AND v.organisation_id=r.organisation_id AND v.project_id=r.project_id`;

/** Manual intake is a draft in the canonical register, never an approved scope publication. */
export class RequirementIntakeService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); this.commands = new DurableProjectCommand(db); }

  private capabilities(access: ProjectAccessContext) {
    const canEdit = access.accessLevel === 'editor' && REQUIREMENT_INTAKE_PERMISSIONS.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin));
    return { canCreateDraft: canEdit, canReviseDraft: canEdit, canApprove: false, canPublish: false,
      sourceTypes: [...REQUIREMENT_SOURCE_TYPES], quantityFormat: 'decimal_string_or_null' };
  }
  private revisable(row: any) {
    return row.provenance_state === 'manually_recorded' && row.current_revision_provenance === 'manually_recorded'
      && row.current_revision_id != null && row.is_approved === false && row.is_archived === false && row.status === 'draft'
      && row.start_date == null && row.due_date == null;
  }
  private summary(row: any, access: ProjectAccessContext) {
    const controlled = row.provenance_state === 'manually_recorded';
    return { id: row.id, projectId: row.project_id, code: row.code, title: row.title,
      originalWording: row.original_wording, interpretation: row.interpretation, sourceType: row.source_type,
      sourceReference: row.source_reference, category: row.category, quantity: row.quantity == null ? null : String(row.quantity),
      unit: row.unit, locationZone: row.location_zone, acceptanceCriteria: row.acceptance_criteria, ownerId: row.owner_id,
      startDate: date(row.start_date), dueDate: date(row.due_date), rowVersion: row.row_version,
      currentRevision: row.current_revision, currentRevisionId: row.current_revision_id,
      provenanceState: row.provenance_state, sourceVerification: 'unverified',
      status: controlled ? row.status : 'legacy_unverified', recordedStatus: row.status,
      isApproved: controlled && row.is_approved === true, recordedApproval: row.is_approved === true,
      approvalState: controlled ? (row.is_approved ? 'outside_intake_workflow' : 'not_approved') : 'legacy_unverified',
      isArchived: row.is_archived === true, operationalScopePublished: false,
      canRevise: this.capabilities(access).canReviseDraft && this.revisable(row),
      createdAt: date(row.created_at), updatedAt: date(row.updated_at) };
  }
  private async scoped(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string) {
    const row = (await tx.query(`${select} WHERE r.id=$1 AND r.organisation_id=$2 AND r.project_id=$3 FOR UPDATE OF r`,
      [id, access.organisationId, access.project.id])).rows[0];
    if (!row) fail('REQUIREMENT_NOT_FOUND', 'Requirement is not available in the current project scope.', 404);
    return row;
  }
  private async owner(tx: ProjectAccessTransaction, access: ProjectAccessContext, ownerId: string | null) {
    if (!ownerId) return;
    const member = (await tx.query(`SELECT m.role FROM memberships m JOIN project_access_grants g
      ON g.membership_id=m.id AND g.organisation_id=m.organisation_id
      WHERE m.organisation_id=$1 AND m.user_id=$2 AND NOT m.is_revoked AND m.audience='internal'
        AND g.project_id=$3 AND NOT g.is_revoked FOR UPDATE OF m,g`,
      [access.organisationId, ownerId, access.project.id])).rows[0];
    if (!member || !CANONICAL_ROLES.includes(normalizeRole(member.role) as any) || normalizeRole(member.role) === 'client_user') {
      fail('REQUIREMENT_OWNER_UNAVAILABLE', 'Owner must have active internal membership and an explicit grant for this project.', 404);
    }
  }
  private snapshot(id: string, projectId: string, version: number, input: RequirementDraftInput) {
    return { requirementId: id, projectId, revisionNumber: version, ...draftFields(input),
      startDate: null, dueDate: null, status: 'draft', isApproved: false, sourceVerification: 'unverified', operationalScopePublished: false };
  }
  private async append(tx: ProjectAccessTransaction, access: ProjectAccessContext, id: string, version: number,
    input: RequirementDraftInput, reason: string, previous: RequirementDraftInput | null) {
    const revisionId = randomUUID(), snapshot = this.snapshot(id, access.project.id, version, input), snapshotHash = requirementSnapshotHash(snapshot);
    const changedFields = fields.filter(field => !previous || previous[field] !== input[field]);
    await tx.query(`INSERT INTO requirement_revisions(id,requirement_id,organisation_id,project_id,revision_number,
      changed_fields,previous_values,new_values,reason_for_change,impact,author_id,author_role,snapshot,snapshot_hash,provenance_state)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10::jsonb,$11,$12,$13::jsonb,$14,'manually_recorded')`,
      [revisionId, id, access.organisationId, access.project.id, version, JSON.stringify(changedFields), JSON.stringify(previous || {}),
        JSON.stringify(draftFields(input)), reason, JSON.stringify({ state: 'draft_only', downstreamImpactReviewed: false }),
        access.userId, access.role, JSON.stringify(snapshot), snapshotHash]);
    return { revisionId, snapshotHash };
  }
  async list(project: string, req: Request) {
    return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      const rows = (await tx.query(`${select} WHERE r.organisation_id=$1 AND r.project_id=$2 ORDER BY r.created_at DESC,r.id LIMIT 501`,
        [access.organisationId, access.project.id])).rows;
      return { data: rows.slice(0, 500).map(row => this.summary(row, access)),
        meta: { capabilities: this.capabilities(access), limit: 500, truncated: rows.length > 500,
          disclosure: 'Manual drafts and legacy records only. Source text and approval claims are unverified; no draft is published operational scope.' } };
    });
  }
  async get(project: string, requirementId: string, req: Request) {
    identifier(requirementId, 'Requirement id');
    return this.access.withAccess(req, project, readAccess, async (tx, access) => ({
      data: this.summary(await this.scoped(tx, access, requirementId), access), meta: { capabilities: this.capabilities(access) },
    }));
  }
  async revisions(project: string, requirementId: string, req: Request) {
    identifier(requirementId, 'Requirement id');
    return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      const requirement = await this.scoped(tx, access, requirementId);
      const rows = (await tx.query(`SELECT * FROM requirement_revisions WHERE requirement_id=$1 AND organisation_id=$2 AND project_id=$3
        ORDER BY revision_number DESC,created_at DESC,id LIMIT 501`, [requirementId, access.organisationId, access.project.id])).rows;
      return { data: rows.slice(0, 500).map(row => ({ id: row.id, requirementId: row.requirement_id,
        revisionNumber: row.revision_number, snapshot: row.snapshot, snapshotHash: row.snapshot_hash,
        reason: row.reason_for_change, authorId: row.author_id, authorRole: row.author_role, createdAt: date(row.created_at),
        provenanceState: row.provenance_state, changedFields: row.changed_fields,
        sourceVerification: 'unverified', snapshotIntegrityVerified: row.provenance_state === 'manually_recorded' && !!row.snapshot && requirementSnapshotHash(row.snapshot) === row.snapshot_hash })),
        meta: { rowVersion: requirement.row_version, currentRevisionId: requirement.current_revision_id,
          capabilities: this.capabilities(access), truncated: rows.length > 500, limit: 500 } };
    });
  }
  async create(project: string, body: unknown, req: Request) {
    const input = validateRequirementDraft(body);
    return this.commands.run(req, project, { ...writeAccess, operation: 'requirement.intake.create', action: 'requirement.draft_recorded', targetType: 'requirement', input }, async (tx, access) => {
      await this.owner(tx, access, input.ownerId);
      const id = randomUUID();
      await tx.query(`INSERT INTO requirements(id,organisation_id,project_id,title,description,original_wording,interpretation,
        source_type,source_reference,category,quantity,unit,location_zone,acceptance_criteria,owner_id,
        priority,risk,status,disposition,is_approved,current_revision,is_archived,start_date,due_date,row_version,provenance_state,
        responsible_party,design_status,quantity_comparator,quantity_basis)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NULL,NULL,'draft','applicability_unknown',false,1,false,NULL,NULL,1,'manually_recorded',NULL,NULL,NULL,'unspecified')`,
        [id, access.organisationId, access.project.id, input.title, input.interpretation || input.originalWording,
          input.originalWording, input.interpretation, input.sourceType, input.sourceReference, input.category, input.quantity,
          input.unit, input.locationZone, input.acceptanceCriteria, input.ownerId]);
      const revision = await this.append(tx, access, id, 1, input, input.reason, null);
      await tx.query('UPDATE requirements SET current_revision_id=$4 WHERE id=$1 AND organisation_id=$2 AND project_id=$3',
        [id, access.organisationId, access.project.id, revision.revisionId]);
      const row = await this.scoped(tx, access, id);
      return { id, data: this.summary(row, access), version: 1,
        event: { reason: input.reason, revisionId: revision.revisionId, snapshotHash: revision.snapshotHash, sourceType: input.sourceType, sourceVerification: 'unverified', isApproved: false } };
    });
  }
  async revise(project: string, requirementId: string, body: unknown, req: Request) {
    identifier(requirementId, 'Requirement id'); const input = validateRequirementDraft(body, true);
    return this.commands.run(req, project, { ...writeAccess, operation: `requirement.intake.${requirementId}.revise`, action: 'requirement.draft_revised', targetType: 'requirement', input,
      authorize: async (tx, access) => { await this.scoped(tx, access, requirementId); },
    }, async (tx, access) => {
      const row = await this.scoped(tx, access, requirementId);
      if (!this.revisable(row)) fail('REQUIREMENT_REVISION_UNAVAILABLE', 'Only a recorded, unapproved and unarchived intake draft can be revised. Legacy and approved records require a separate controlled change process.', 409);
      if (row.row_version !== input.expectedVersion) fail('REQUIREMENT_VERSION_CONFLICT', 'Requirement changed. Refresh and review the current version before submitting a new command.', 409);
      const prior = (await tx.query(`SELECT snapshot,snapshot_hash FROM requirement_revisions
        WHERE id=$1 AND requirement_id=$2 AND organisation_id=$3 AND project_id=$4 AND provenance_state='manually_recorded'`,
        [row.current_revision_id, requirementId, access.organisationId, access.project.id])).rows[0];
      const previous = rowFields(row);
      if (!prior?.snapshot || requirementSnapshotHash(prior.snapshot) !== prior.snapshot_hash
        || requirementSnapshotHash(this.snapshot(requirementId, access.project.id, row.current_revision, previous)) !== prior.snapshot_hash) {
        fail('REQUIREMENT_HISTORY_CONFLICT', 'Current draft no longer matches its recorded revision. A controlled reconciliation is required.', 409);
      }
      await this.owner(tx, access, input.ownerId);
      const revisionNumber = row.current_revision + 1, version = row.row_version + 1;
      const revision = await this.append(tx, access, requirementId, revisionNumber, input, input.reason, previous);
      await tx.query(`UPDATE requirements SET title=$4,description=$5,original_wording=$6,interpretation=$7,source_type=$8,
        source_reference=$9,category=$10,quantity=$11,unit=$12,location_zone=$13,acceptance_criteria=$14,owner_id=$15,
        current_revision=$16,current_revision_id=$17,row_version=$18,updated_at=clock_timestamp()
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3`,
        [requirementId, access.organisationId, access.project.id, input.title, input.interpretation || input.originalWording,
          input.originalWording, input.interpretation, input.sourceType, input.sourceReference, input.category, input.quantity,
          input.unit, input.locationZone, input.acceptanceCriteria, input.ownerId, revisionNumber, revision.revisionId, version]);
      const updated = await this.scoped(tx, access, requirementId);
      return { id: requirementId, data: this.summary(updated, access), version,
        event: { reason: input.reason, previousRevisionId: row.current_revision_id, revisionId: revision.revisionId,
          snapshotHash: revision.snapshotHash, previousVersion: row.row_version, sourceVerification: 'unverified', isApproved: false } };
    });
  }
}
