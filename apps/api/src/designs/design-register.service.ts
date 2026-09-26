import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { CANONICAL_ROLES, hasRolePermission, normalizeRole } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';
import { requirementQuantity, requirementSnapshotHash } from '../scope/requirement-intake.service.js';

const permissions = ['projects.manage', 'design.version'];
const readAccess = { level: 'viewer' as const, audiences: ['internal'] as Array<'internal'>, permissions };
const writeAccess = { ...readAccess, level: 'editor' as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, title: detail, detail }, status); };
const date = (value: unknown) => value ? new Date(value as string).toISOString() : null;
const fields = ['title', 'brief', 'discipline', 'materials', 'dimensions', 'locationZone', 'ownerId'] as const;
export interface DesignBriefInput {
  title: string; brief: string; discipline: string | null; materials: string | null; dimensions: string | null;
  locationZone: string | null; ownerId: string | null;
  requirementRefs: Array<{ requirementId: string; expectedVersion: number }>;
  allocationRefs: Array<{ allocationId: string; expectedVersion: number }>;
  reason: string; expectedVersion?: number;
}
export interface RequirementPin { requirementId: string; requirementVersion: number; requirementRevisionId: string; requirementSnapshotHash: string }
export interface AllocationPin { allocationId: string; allocationVersion: number; allocationRevisionId: string; allocationSnapshotHash: string;
  requirementId: string; requirementVersion: number; requirementRevisionId: string }
interface Pins { requirements: RequirementPin[]; allocations: AllocationPin[] }
const requiredText = (value: unknown, label: string, max: number) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('DESIGN_INPUT_INVALID', `${label} requires 1–${max} characters.`);
  return (value as string).trim();
};
const optionalText = (value: unknown, label: string, max: number) => value == null || value === '' ? null : requiredText(value, label, max);
const id = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !UUID.test(value)) fail('DESIGN_INPUT_INVALID', `${label} must be a UUID.`);
  return (value as string).toLowerCase();
};
const version = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || Number(value) < 1) fail('DESIGN_VERSION_REQUIRED', 'A positive expectedVersion is required for each selected record.');
  return value as number;
};
export function validateDesignBrief(body: any, revision = false): DesignBriefInput {
  const allowed: string[] = [...fields, 'requirementRefs', 'allocationRefs', 'reason', ...(revision ? ['expectedVersion'] : [])];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) {
    fail('DESIGN_INPUT_INVALID', 'Only design brief metadata and selected source versions are accepted. Files, approval and production release require separate controls.');
  }
  function refs(value: any, name: 'requirementId' | 'allocationId', required: boolean) {
    if (value == null && !required) return [];
    if (!Array.isArray(value) || value.length > 100 || (required && !value.length)) fail('DESIGN_SOURCE_INVALID', 'Select 1–100 requirements and at most 100 optional allocations.');
    const rows = (value as any[]).map(ref => {
      if (!ref || typeof ref !== 'object' || Array.isArray(ref) || Object.keys(ref).some(key => ![name, 'expectedVersion'].includes(key))) fail('DESIGN_SOURCE_INVALID', 'A source selection must contain its identifier and expectedVersion only.');
      return { [name]: id(ref[name], name), expectedVersion: version(ref.expectedVersion) };
    });
    if (new Set(rows.map(row => row[name])).size !== rows.length) fail('DESIGN_SOURCE_INVALID', 'A source record may only be selected once.');
    return rows.sort((a, b) => String(a[name]).localeCompare(String(b[name])));
  }
  return { title: requiredText(body.title, 'Title', 300), brief: requiredText(body.brief, 'Brief', 16000),
    discipline: optionalText(body.discipline, 'Discipline', 120), materials: optionalText(body.materials, 'Materials', 8000),
    dimensions: optionalText(body.dimensions, 'Dimensions', 2000), locationZone: optionalText(body.locationZone, 'Location or zone', 250),
    ownerId: body.ownerId == null || body.ownerId === '' ? null : id(body.ownerId, 'Owner'),
    requirementRefs: refs(body.requirementRefs, 'requirementId', true) as DesignBriefInput['requirementRefs'],
    allocationRefs: refs(body.allocationRefs, 'allocationId', false) as DesignBriefInput['allocationRefs'],
    reason: requiredText(body.reason, 'Reason', 2000), ...(revision ? { expectedVersion: version(body.expectedVersion) } : {}) };
}
const metadata = (input: Pick<DesignBriefInput, typeof fields[number]>) => Object.fromEntries(fields.map(field => [field, input[field]]));
const rowMetadata = (row: any) => ({ title: row.title, brief: row.brief, discipline: row.discipline, materials: row.materials,
  dimensions: row.dimensions, locationZone: row.location_zone, ownerId: row.lead_designer_id });
const snapshotFor = (rowId: string, projectId: string, revisionNumber: number, input: any, pins: Pins) => ({
  designPackageId: rowId, projectId, revisionNumber, ...metadata(input), requirements: pins.requirements, allocations: pins.allocations,
  status: 'draft', fileStatus: 'missing', approvalState: 'not_approved', productionReleased: false,
});
const select = `SELECT d.*,v.snapshot,v.snapshot_hash FROM design_packages d LEFT JOIN design_package_revisions v
  ON v.id=d.current_revision_id AND v.design_package_id=d.id AND v.organisation_id=d.organisation_id AND v.project_id=d.project_id`;
const requirementSelect = `SELECT r.*,v.snapshot,v.snapshot_hash,v.provenance_state AS revision_provenance
  FROM requirements r LEFT JOIN requirement_revisions v ON v.id=r.current_revision_id AND v.requirement_id=r.id
  AND v.organisation_id=r.organisation_id AND v.project_id=r.project_id`;
const allocationSelect = `SELECT a.*,v.snapshot,v.snapshot_hash FROM requirement_allocations a LEFT JOIN requirement_allocation_revisions v
  ON v.id=a.current_revision_id AND v.allocation_id=a.id AND v.organisation_id=a.organisation_id AND v.project_id=a.project_id`;
function verifiedRequirement(row: any) {
  if (!row || row.provenance_state !== 'manually_recorded' || row.revision_provenance !== 'manually_recorded' || row.status !== 'draft'
    || row.is_approved !== false || row.is_archived !== false || !row.current_revision_id || !row.snapshot
    || row.start_date != null || row.due_date != null || requirementSnapshotHash(row.snapshot) !== row.snapshot_hash) return false;
  const expected = { requirementId: row.id, projectId: row.project_id, revisionNumber: row.current_revision,
    title: row.title, originalWording: row.original_wording, interpretation: row.interpretation, sourceType: row.source_type,
    sourceReference: row.source_reference, category: row.category, quantity: row.quantity == null ? null : requirementQuantity(String(row.quantity)),
    unit: row.unit, locationZone: row.location_zone, acceptanceCriteria: row.acceptance_criteria, ownerId: row.owner_id,
    startDate: null, dueDate: null, status: 'draft', isApproved: false, sourceVerification: 'unverified', operationalScopePublished: false };
  return requirementSnapshotHash(expected) === row.snapshot_hash;
}
function verifiedAllocation(row: any) {
  if (!row || row.provenance_state !== 'manually_recorded' || row.status !== 'draft' || !row.current_revision_id || !row.snapshot
    || requirementSnapshotHash(row.snapshot) !== row.snapshot_hash) return false;
  const expected = { allocationId: row.id, projectId: row.project_id, revisionNumber: row.revision,
    requirementId: row.requirement_id, requirementVersion: row.requirement_version, requirementRevisionId: row.requirement_revision_id,
    requirementSnapshotHash: row.snapshot.requirementSnapshotHash,
    quantity: row.quantity == null ? null : requirementQuantity(String(row.quantity)), unit: row.unit, location: row.location,
    zone: row.zone, subLocation: row.sub_location, department: row.department, ownerId: row.owner_id, notes: row.location_notes,
    status: 'draft', authorityEffect: 'planning_only' };
  return requirementSnapshotHash(expected) === row.snapshot_hash;
}

/** Versioned metadata in the canonical design register. No file, approval or release authority is manufactured. */
export class DesignRegisterService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); this.commands = new DurableProjectCommand(db); }
  private capabilities(access: ProjectAccessContext) {
    const edit = access.accessLevel === 'editor' && permissions.some(permission => hasRolePermission(access.role, permission, access.isSuperAdmin));
    return { canCreateDraft: edit, canReviseDraft: edit, canUpload: false, canApprove: false, canRelease: false };
  }
  private controlled(row: any) {
    return row.provenance_state === 'manually_recorded' && row.status === 'draft' && row.internal_approval === false
      && row.client_approval === false && row.production_release_status === 'not_released'
      && row.approved_quantity == null && row.released_quantity == null;
  }
  private integrity(row: any) {
    return !!row.current_revision_id && !!row.snapshot && Array.isArray(row.snapshot.requirements) && Array.isArray(row.snapshot.allocations)
      && requirementSnapshotHash(row.snapshot) === row.snapshot_hash
      && requirementSnapshotHash(snapshotFor(row.id, row.project_id, row.revision, rowMetadata(row), row.snapshot)) === row.snapshot_hash
      && requirementSnapshotHash(row.linked_requirement_ids) === requirementSnapshotHash(row.snapshot.requirements.map((pin: RequirementPin) => pin.requirementId))
      && requirementSnapshotHash(row.linked_allocation_ids) === requirementSnapshotHash(row.snapshot.allocations.map((pin: AllocationPin) => pin.allocationId));
  }
  private async scoped(tx: ProjectAccessTransaction, access: ProjectAccessContext, designId: string) {
    const row = (await tx.query(`${select} WHERE d.id=$1 AND d.organisation_id=$2 AND d.project_id=$3 FOR UPDATE OF d`, [designId, access.organisationId, access.project.id])).rows[0];
    if (!row) fail('DESIGN_NOT_FOUND', 'Design brief is not available in the current project.', 404);
    return row;
  }
  private async owner(tx: ProjectAccessTransaction, access: ProjectAccessContext, ownerId: string | null) {
    if (!ownerId) return;
    const member = (await tx.query(`SELECT m.role FROM memberships m JOIN project_access_grants g ON g.membership_id=m.id AND g.organisation_id=m.organisation_id
      WHERE m.organisation_id=$1 AND m.user_id=$2 AND NOT m.is_revoked AND m.audience='internal'
      AND g.project_id=$3 AND NOT g.is_revoked FOR UPDATE OF m,g`, [access.organisationId, ownerId, access.project.id])).rows[0];
    if (!member || !CANONICAL_ROLES.includes(normalizeRole(member.role) as any) || normalizeRole(member.role) === 'client_user') {
      fail('DESIGN_OWNER_UNAVAILABLE', 'Owner requires current internal membership and an explicit grant for this project.', 404);
    }
  }
  private async capturePins(tx: ProjectAccessTransaction, access: ProjectAccessContext, input: DesignBriefInput, exactVersions: boolean): Promise<Pins> {
    const requirements: RequirementPin[] = [], allocations: AllocationPin[] = [];
    for (const ref of input.requirementRefs) {
      const row = (await tx.query(`${requirementSelect} WHERE r.id=$1 AND r.organisation_id=$2 AND r.project_id=$3 FOR UPDATE OF r`, [ref.requirementId, access.organisationId, access.project.id])).rows[0];
      if (!row) fail('DESIGN_REQUIREMENT_UNAVAILABLE', 'A selected requirement is not available in this project.', 404);
      if (!verifiedRequirement(row)) fail('DESIGN_REQUIREMENT_UNVERIFIED', 'Selected requirements must be current, unapproved manual drafts that match their immutable history.', 409);
      if (exactVersions && row.row_version !== ref.expectedVersion) fail('DESIGN_SOURCE_VERSION_CONFLICT', 'A selected requirement changed. Refresh and review its version.', 409);
      requirements.push({ requirementId: row.id, requirementVersion: row.row_version, requirementRevisionId: row.current_revision_id, requirementSnapshotHash: row.snapshot_hash });
    }
    for (const ref of input.allocationRefs) {
      const row = (await tx.query(`${allocationSelect} WHERE a.id=$1 AND a.organisation_id=$2 AND a.project_id=$3 FOR UPDATE OF a`, [ref.allocationId, access.organisationId, access.project.id])).rows[0];
      if (!row) fail('DESIGN_ALLOCATION_UNAVAILABLE', 'A selected allocation is not available in this project.', 404);
      if (!verifiedAllocation(row)) fail('DESIGN_ALLOCATION_UNVERIFIED', 'Selected allocations must be manual planning drafts matching immutable history.', 409);
      const requirement = requirements.find(pin => pin.requirementId === row.requirement_id);
      if (!requirement) return fail('DESIGN_ALLOCATION_REQUIREMENT_MISSING', 'Select the requirement covered by every selected allocation.');
      if (row.requirement_version !== requirement.requirementVersion || row.requirement_revision_id !== requirement.requirementRevisionId
        || row.snapshot.requirementSnapshotHash !== requirement.requirementSnapshotHash) fail('DESIGN_ALLOCATION_SOURCE_STALE', 'An allocation references an earlier requirement. Review and revise the allocation first.', 409);
      if (exactVersions && row.row_version !== ref.expectedVersion) fail('DESIGN_SOURCE_VERSION_CONFLICT', 'A selected allocation changed. Refresh and review its version.', 409);
      allocations.push({ allocationId: row.id, allocationVersion: row.row_version, allocationRevisionId: row.current_revision_id,
        allocationSnapshotHash: row.snapshot_hash, requirementId: row.requirement_id, requirementVersion: row.requirement_version, requirementRevisionId: row.requirement_revision_id });
    }
    return { requirements, allocations };
  }
  private async sourceRows(tx: ProjectAccessTransaction, access: ProjectAccessContext, snapshots: any[]) {
    const requirementIds = [...new Set(snapshots.flatMap(snapshot => (snapshot?.requirements || []).map((pin: RequirementPin) => pin.requirementId)))];
    const allocationIds = [...new Set(snapshots.flatMap(snapshot => (snapshot?.allocations || []).map((pin: AllocationPin) => pin.allocationId)))];
    const requirements = requirementIds.length ? (await tx.query(`${requirementSelect} WHERE r.organisation_id=$1 AND r.project_id=$2 AND r.id=ANY($3::uuid[])`, [access.organisationId, access.project.id, requirementIds])).rows : [];
    const allocations = allocationIds.length ? (await tx.query(`${allocationSelect} WHERE a.organisation_id=$1 AND a.project_id=$2 AND a.id=ANY($3::uuid[])`, [access.organisationId, access.project.id, allocationIds])).rows : [];
    return { requirements: new Map(requirements.map(row => [row.id, row])), allocations: new Map(allocations.map(row => [row.id, row])) };
  }
  private sourceStale(snapshot: any, current: Awaited<ReturnType<DesignRegisterService['sourceRows']>>) {
    if (!snapshot) return true;
    return snapshot.requirements.some((pin: RequirementPin) => {
      const row = current.requirements.get(pin.requirementId);
      return !verifiedRequirement(row) || row.row_version !== pin.requirementVersion || row.current_revision_id !== pin.requirementRevisionId || row.snapshot_hash !== pin.requirementSnapshotHash;
    }) || snapshot.allocations.some((pin: AllocationPin) => {
      const row = current.allocations.get(pin.allocationId);
      return !verifiedAllocation(row) || row.row_version !== pin.allocationVersion || row.current_revision_id !== pin.allocationRevisionId || row.snapshot_hash !== pin.allocationSnapshotHash;
    });
  }
  private summary(row: any, access: ProjectAccessContext, sourceStale: boolean) {
    const recorded = row.provenance_state === 'manually_recorded', snapshot = row.snapshot;
    const requirements: RequirementPin[] = snapshot?.requirements || [], allocations: AllocationPin[] = snapshot?.allocations || [];
    return { id: row.id, projectId: row.project_id, code: null, ...rowMetadata(row), rowVersion: row.row_version,
      currentRevision: row.revision, currentRevisionId: row.current_revision_id, provenanceState: row.provenance_state,
      status: recorded ? row.status : 'legacy_unverified', recordedStatus: row.status,
      fileStatus: 'missing', approvalState: recorded ? 'not_approved' : 'legacy_unverified', productionReleased: false,
      recordedInternalApproval: row.internal_approval, recordedClientApproval: row.client_approval, recordedProductionReleaseStatus: row.production_release_status,
      approvedQuantity: null, releasedQuantity: null, snapshotHash: row.snapshot_hash || null,
      requirementRefs: requirements.map(pin => ({ requirementId: pin.requirementId, expectedVersion: pin.requirementVersion })),
      allocationRefs: allocations.map(pin => ({ allocationId: pin.allocationId, expectedVersion: pin.allocationVersion })),
      requirements, allocations, sourceStale, snapshotIntegrityVerified: this.integrity(row),
      canRevise: this.capabilities(access).canReviseDraft && this.controlled(row) && this.integrity(row),
      createdAt: date(row.created_at), updatedAt: date(row.updated_at) };
  }
  async list(project: string, req: Request) {
    return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      const rows = (await tx.query(`${select} WHERE d.organisation_id=$1 AND d.project_id=$2 ORDER BY d.created_at DESC,d.id LIMIT 201`, [access.organisationId, access.project.id])).rows;
      const current = await this.sourceRows(tx, access, rows.slice(0, 200).map(row => row.snapshot));
      return { data: rows.slice(0, 200).map(row => this.summary(row, access, this.sourceStale(row.snapshot, current))),
        meta: { capabilities: this.capabilities(access), limit: 200, truncated: rows.length > 200,
          disclosure: 'Design brief metadata only. Files are missing, source claims remain unverified, and no approval or production release is created.' } };
    });
  }
  async get(project: string, designId: string, req: Request) {
    id(designId, 'Design');
    return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      const row = await this.scoped(tx, access, designId), current = await this.sourceRows(tx, access, [row.snapshot]);
      return { data: this.summary(row, access, this.sourceStale(row.snapshot, current)), meta: { capabilities: this.capabilities(access) } };
    });
  }
  async revisions(project: string, designId: string, req: Request) {
    id(designId, 'Design');
    return this.access.withAccess(req, project, readAccess, async (tx, access) => {
      const row = await this.scoped(tx, access, designId);
      const revisions = (await tx.query(`SELECT * FROM design_package_revisions WHERE organisation_id=$1 AND project_id=$2 AND design_package_id=$3 ORDER BY revision_number DESC LIMIT 501`, [access.organisationId, access.project.id, designId])).rows;
      const current = await this.sourceRows(tx, access, revisions.slice(0, 500).map(revision => revision.snapshot));
      return { data: revisions.slice(0, 500).map(revision => ({ id: revision.id, designPackageId: designId, revisionNumber: revision.revision_number,
        snapshot: revision.snapshot, snapshotHash: revision.snapshot_hash, reason: revision.reason, authorId: revision.author_id,
        createdAt: date(revision.created_at), sourceStale: this.sourceStale(revision.snapshot, current), snapshotIntegrityVerified: requirementSnapshotHash(revision.snapshot) === revision.snapshot_hash })),
        meta: { rowVersion: row.row_version, currentRevisionId: row.current_revision_id, truncated: revisions.length > 500, limit: 500 } };
    });
  }
  private async append(tx: ProjectAccessTransaction, access: ProjectAccessContext, designId: string, revision: number, input: DesignBriefInput, pins: Pins) {
    const revisionId = randomUUID(), snapshot = snapshotFor(designId, access.project.id, revision, input, pins), snapshotHash = requirementSnapshotHash(snapshot);
    await tx.query(`INSERT INTO design_package_revisions(id,organisation_id,project_id,design_package_id,revision_number,snapshot,snapshot_hash,reason,author_id)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`, [revisionId, access.organisationId, access.project.id, designId, revision, JSON.stringify(snapshot), snapshotHash, input.reason, access.userId]);
    return { revisionId, snapshotHash };
  }
  async create(project: string, body: unknown, req: Request) {
    const input = validateDesignBrief(body);
    return this.commands.run(req, project, { ...writeAccess, operation: 'design.brief.create', action: 'design.brief_recorded', targetType: 'design_package', input,
      authorize: async (tx, access) => {
        await this.owner(tx, access, input.ownerId); await this.capturePins(tx, access, input, false);
        const prior = (await tx.query(`SELECT response_body FROM idempotency_records WHERE organisation_id=$1 AND key=$2 AND actor_id=$3 AND operation='design.brief.create'`,
          [access.organisationId, req.headers?.['idempotency-key'], access.userId])).rows[0];
        if (prior?.response_body?.data?.id) {
          const row = await this.scoped(tx, access, prior.response_body.data.id);
          if (!this.controlled(row) || !this.integrity(row)) fail('DESIGN_REVISION_UNAVAILABLE', 'The recorded design is no longer an editable manual draft.', 409);
        }
      },
    }, async (tx, access) => {
      const pins = await this.capturePins(tx, access, input, true), designId = randomUUID();
      await tx.query(`INSERT INTO design_packages(id,organisation_id,project_id,title,brief,discipline,materials,dimensions,location_zone,lead_designer_id,
        revision,status,internal_approval,client_approval,production_release_status,approved_quantity,released_quantity,linked_requirement_ids,linked_allocation_ids,row_version,provenance_state)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,'draft',false,false,'not_released',NULL,NULL,$11::jsonb,$12::jsonb,1,'manually_recorded')`,
        [designId, access.organisationId, access.project.id, input.title, input.brief, input.discipline, input.materials, input.dimensions, input.locationZone, input.ownerId,
          JSON.stringify(pins.requirements.map(pin => pin.requirementId)), JSON.stringify(pins.allocations.map(pin => pin.allocationId))]);
      const revision = await this.append(tx, access, designId, 1, input, pins);
      await tx.query('UPDATE design_packages SET current_revision_id=$4 WHERE id=$1 AND organisation_id=$2 AND project_id=$3', [designId, access.organisationId, access.project.id, revision.revisionId]);
      const row = await this.scoped(tx, access, designId);
      return { id: designId, data: this.summary(row, access, false), version: 1,
        event: { revisionId: revision.revisionId, snapshotHash: revision.snapshotHash, sourceCount: pins.requirements.length, allocationCount: pins.allocations.length, fileStatus: 'missing', productionReleased: false } };
    });
  }
  async revise(project: string, designId: string, body: unknown, req: Request) {
    id(designId, 'Design'); const input = validateDesignBrief(body, true);
    return this.commands.run(req, project, { ...writeAccess, operation: `design.brief.${designId}.revise`, action: 'design.brief_revised', targetType: 'design_package', input,
      authorize: async (tx, access) => {
        const row = await this.scoped(tx, access, designId);
        if (!this.controlled(row) || !this.integrity(row)) fail('DESIGN_REVISION_UNAVAILABLE', 'Only a recorded manual draft matching immutable history can be revised. Approved, released and legacy records require a separate controlled change.', 409);
        await this.owner(tx, access, input.ownerId); await this.capturePins(tx, access, input, false);
      },
    }, async (tx, access) => {
      const row = await this.scoped(tx, access, designId);
      if (row.row_version !== input.expectedVersion) fail('DESIGN_VERSION_CONFLICT', 'Design brief changed. Refresh and review before recording another revision.', 409);
      const pins = await this.capturePins(tx, access, input, true), nextVersion = row.row_version + 1, nextRevision = row.revision + 1;
      const revision = await this.append(tx, access, designId, nextRevision, input, pins);
      await tx.query(`UPDATE design_packages SET title=$4,brief=$5,discipline=$6,materials=$7,dimensions=$8,location_zone=$9,lead_designer_id=$10,
        revision=$11,current_revision_id=$12,row_version=$13,linked_requirement_ids=$14::jsonb,linked_allocation_ids=$15::jsonb,updated_at=clock_timestamp()
        WHERE id=$1 AND organisation_id=$2 AND project_id=$3`, [designId, access.organisationId, access.project.id, input.title, input.brief,
          input.discipline, input.materials, input.dimensions, input.locationZone, input.ownerId, nextRevision, revision.revisionId, nextVersion,
          JSON.stringify(pins.requirements.map(pin => pin.requirementId)), JSON.stringify(pins.allocations.map(pin => pin.allocationId))]);
      return { id: designId, data: this.summary(await this.scoped(tx, access, designId), access, false), version: nextVersion,
        event: { previousRevisionId: row.current_revision_id, revisionId: revision.revisionId, snapshotHash: revision.snapshotHash,
          previousVersion: row.row_version, fileStatus: 'missing', productionReleased: false } };
    });
  }
}
