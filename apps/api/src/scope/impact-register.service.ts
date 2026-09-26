import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hasRolePermission } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';
import { requirementQuantity, requirementSnapshotHash } from './requirement-intake.service.js';

const permissions = ['projects.manage', 'design.version', 'operations.manage'];
const readAccess = { level: 'viewer' as const, audiences: ['internal'] as Array<'internal'>, permissions };
const writeAccess = { ...readAccess, level: 'editor' as const };
const schema = z.object({ targetType: z.enum(['allocation', 'design']), targetId: z.string().uuid(),
  expectedTargetVersion: z.number().int().positive(), impactFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  assessment: z.string().trim().min(1).max(4000), proposedAction: z.string().trim().min(1).max(2000),
  reason: z.string().trim().min(1).max(2000) }).strict();
type TargetType = 'allocation' | 'design';
type Scope = ProjectAccessContext;
type Tx = ProjectAccessTransaction;
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, title: detail, detail }, status); };
const missing = () => fail('IMPACT_TARGET_NOT_FOUND', 'This controlled draft target is not available in the current project.', 404);
const integrity = () => fail('IMPACT_SOURCE_UNAVAILABLE', 'An exact source revision could not be verified. Refresh after the source record is repaired.', 409);
const uuid = (value: unknown) => { if (!z.string().uuid().safeParse(value).success) fail('IMPACT_INPUT_INVALID', 'A valid target UUID is required.'); return value as string; };
function matchesCurrentFields(type: 'requirement' | TargetType, row: any, snapshot: any, hash: string) {
  if (type === 'requirement' && (row.start_date != null || row.due_date != null)) return false;
  const quantity = row.quantity == null ? null : requirementQuantity(String(row.quantity));
  const expected = type === 'requirement' ? {
    requirementId: row.id, projectId: row.project_id, revisionNumber: row.current_revision,
    title: row.title, originalWording: row.original_wording, interpretation: row.interpretation, sourceType: row.source_type,
    sourceReference: row.source_reference, category: row.category, quantity, unit: row.unit, locationZone: row.location_zone,
    acceptanceCriteria: row.acceptance_criteria, ownerId: row.owner_id, startDate: null, dueDate: null,
    status: 'draft', isApproved: false, sourceVerification: 'unverified', operationalScopePublished: false,
  } : type === 'allocation' ? {
    allocationId: row.id, projectId: row.project_id, revisionNumber: row.revision,
    requirementId: row.requirement_id, requirementVersion: row.requirement_version, requirementRevisionId: row.requirement_revision_id,
    requirementSnapshotHash: snapshot.requirementSnapshotHash, quantity, unit: row.unit, location: row.location,
    zone: row.zone, subLocation: row.sub_location, department: row.department, ownerId: row.owner_id, notes: row.location_notes,
    status: 'draft', authorityEffect: 'planning_only',
  } : {
    designPackageId: row.id, projectId: row.project_id, revisionNumber: row.revision, title: row.title, brief: row.brief,
    discipline: row.discipline, materials: row.materials, dimensions: row.dimensions, locationZone: row.location_zone,
    ownerId: row.lead_designer_id, requirements: snapshot.requirements, allocations: snapshot.allocations,
    status: 'draft', fileStatus: 'missing', approvalState: 'not_approved', productionReleased: false,
  };
  return requirementSnapshotHash(expected) === hash && (type !== 'design' || Array.isArray(snapshot.requirements) && Array.isArray(snapshot.allocations)
    && requirementSnapshotHash(row.linked_requirement_ids) === requirementSnapshotHash(snapshot.requirements.map((pin: any) => pin.requirementId))
    && requirementSnapshotHash(row.linked_allocation_ids) === requirementSnapshotHash(snapshot.allocations.map((pin: any) => pin.allocationId)));
}
export const IMPACT_DISCLOSURE = 'Advisory review of manual draft allocations and design briefs only. An assessment preserves the reviewed versions; it does not resolve staleness, revise scope, approve or release work. Counts cover the inspected window, not every project obligation.';

export class ImpactRegisterService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); this.commands = new DurableProjectCommand(db); }
  private canAssess(access: Scope) { return access.accessLevel === 'editor' && permissions.some(value => hasRolePermission(access.role, value, access.isSuperAdmin)); }
  private canDesign(access: Scope) { return ['projects.manage', 'design.version'].some(value => hasRolePermission(access.role, value, access.isSuperAdmin)); }

  private async target(tx: Tx, access: Scope, type: TargetType, id: string) {
    if (type === 'design' && !this.canDesign(access)) fail('IMPACT_TARGET_PERMISSION_REQUIRED', 'The current role does not permit design impact reviews.', 403);
    const allocation = type === 'allocation';
    const row = (await tx.query(`SELECT t.*,v.snapshot,v.snapshot_hash,v.revision_number AS snapshot_version
      FROM ${allocation ? 'requirement_allocations' : 'design_packages'} t
      JOIN ${allocation ? 'requirement_allocation_revisions' : 'design_package_revisions'} v
        ON v.id=t.current_revision_id AND v.${allocation ? 'allocation_id' : 'design_package_id'}=t.id
        AND v.organisation_id=t.organisation_id AND v.project_id=t.project_id
      WHERE t.id=$1 AND t.organisation_id=$2 AND t.project_id=$3 AND t.provenance_state='manually_recorded' AND t.status='draft'`,
      [id, access.organisationId, access.project.id])).rows[0];
    if (!row) return missing();
    if (!row.snapshot || row.snapshot_hash !== requirementSnapshotHash(row.snapshot) || row.row_version !== row.snapshot_version
      || row.snapshot.projectId !== access.project.id || row.snapshot[allocation ? 'allocationId' : 'designPackageId'] !== id) return integrity();
    if (!matchesCurrentFields(type, row, row.snapshot, row.snapshot_hash)) return integrity();
    if (!allocation && (row.internal_approval !== false || row.client_approval !== false || row.production_release_status !== 'not_released'
      || row.approved_quantity != null || row.released_quantity != null)) return missing();
    return row;
  }

  private async source(tx: Tx, access: Scope, type: 'requirement' | 'allocation', id: string, revisionId: string, version: number, expectedHash?: string) {
    if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(revisionId).success || !Number.isSafeInteger(version) || version < 1) return integrity();
    const requirement = type === 'requirement';
    const rows = (await tx.query(`SELECT t.*,p.snapshot AS pinned_snapshot,p.snapshot_hash AS pinned_hash,p.revision_number AS pinned_version,
      c.snapshot AS current_snapshot,c.snapshot_hash AS current_hash,c.revision_number AS current_snapshot_version
      FROM ${requirement ? 'requirements' : 'requirement_allocations'} t
      JOIN ${requirement ? 'requirement_revisions' : 'requirement_allocation_revisions'} p
        ON p.id=$4 AND p.${requirement ? 'requirement_id' : 'allocation_id'}=t.id AND p.organisation_id=t.organisation_id AND p.project_id=t.project_id
      LEFT JOIN ${requirement ? 'requirement_revisions' : 'requirement_allocation_revisions'} c
        ON c.id=t.current_revision_id AND c.${requirement ? 'requirement_id' : 'allocation_id'}=t.id AND c.organisation_id=t.organisation_id AND c.project_id=t.project_id
      WHERE t.id=$1 AND t.organisation_id=$2 AND t.project_id=$3`, [id, access.organisationId, access.project.id, revisionId])).rows;
    const row = rows[0];
    if (!row || !row.pinned_snapshot || row.pinned_version !== version || row.pinned_hash !== requirementSnapshotHash(row.pinned_snapshot)
      || (expectedHash !== undefined && row.pinned_hash !== expectedHash)) return integrity();
    if (row.pinned_snapshot[requirement ? 'requirementId' : 'allocationId'] !== id || row.pinned_snapshot.projectId !== access.project.id
      || row.pinned_snapshot.revisionNumber !== version) return integrity();
    if (!row.current_snapshot || row.current_hash !== requirementSnapshotHash(row.current_snapshot) || row.current_snapshot_version !== row.row_version) return integrity();
    if (!matchesCurrentFields(type, row, row.current_snapshot, row.current_hash)) return integrity();
    const eligible = row.provenance_state === 'manually_recorded' && row.status === 'draft'
      && (!requirement || row.is_approved === false && row.is_archived === false);
    const changed = row.row_version !== version || row.current_revision_id !== revisionId || !eligible;
    return { sourceType: type, sourceId: id, title: requirement ? row.title : [row.location, row.zone, row.department].filter(Boolean).join(' · ') || 'Allocation',
      pinnedVersion: version, currentVersion: row.row_version, pinnedRevisionId: revisionId, currentRevisionId: row.current_revision_id,
      pinnedSnapshotHash: row.pinned_hash, currentSnapshotHash: row.current_hash, pinnedSnapshot: row.pinned_snapshot,
      currentSnapshot: row.current_snapshot, currentState: { status: row.status, provenanceState: row.provenance_state,
        isApproved: requirement ? row.is_approved : false, isArchived: requirement ? row.is_archived : false }, changed };
  }

  private async inspect(tx: Tx, access: Scope, type: TargetType, id: string) {
    const target = await this.target(tx, access, type, id), sources: any[] = [];
    const addRequirement = async (pin: any) => {
      if (sources.some(source => source.sourceType === 'requirement' && source.sourceId === pin.requirementId && source.pinnedRevisionId === pin.requirementRevisionId)) return;
      sources.push(await this.source(tx, access, 'requirement', pin.requirementId, pin.requirementRevisionId, pin.requirementVersion, pin.requirementSnapshotHash));
    };
    if (type === 'allocation') await addRequirement(target.snapshot);
    else {
      if (!Array.isArray(target.snapshot.requirements) || !Array.isArray(target.snapshot.allocations)
        || target.snapshot.requirements.length > 100 || target.snapshot.allocations.length > 100) return integrity();
      for (const pin of target.snapshot.requirements) await addRequirement(pin);
      for (const pin of target.snapshot.allocations) {
        const allocation = await this.source(tx, access, 'allocation', pin.allocationId, pin.allocationRevisionId, pin.allocationVersion, pin.allocationSnapshotHash);
        sources.push(allocation);
        // Follow the allocation version used by this design, not a later repin.
        await addRequirement(allocation.pinnedSnapshot);
      }
    }
    sources.sort((a, b) => `${a.sourceType}:${a.sourceId}:${a.pinnedRevisionId}`.localeCompare(`${b.sourceType}:${b.sourceId}:${b.pinnedRevisionId}`));
    const snapshot = { contractVersion: 'impact-review.v1', projectId: access.project.id, targetType: type, targetId: id,
      targetVersion: target.row_version, targetRevisionId: target.current_revision_id, targetSnapshotHash: target.snapshot_hash,
      targetSnapshot: target.snapshot, sources, authorityEffect: 'advisory_only' as const };
    return { targetType: type, targetId: id, title: type === 'design' ? target.title : [target.location, target.zone, target.department].filter(Boolean).join(' · ') || 'Allocation',
      targetVersion: target.row_version, targetRevisionId: target.current_revision_id, impactFingerprint: requirementSnapshotHash(snapshot),
      changes: sources.filter(source => source.changed), sourceSnapshot: snapshot, authorityEffect: 'advisory_only' as const };
  }

  async list(projectId: string, req: Request) {
    return this.access.withAccess(req, projectId, readAccess, async (tx, access) => {
      const targets = (await tx.query(`SELECT * FROM (
        SELECT 'allocation' AS target_type,id,updated_at FROM requirement_allocations WHERE organisation_id=$1 AND project_id=$2 AND provenance_state='manually_recorded' AND status='draft'
        UNION ALL SELECT 'design' AS target_type,id,updated_at FROM design_packages WHERE organisation_id=$1 AND project_id=$2 AND provenance_state='manually_recorded' AND status='draft' AND $3::boolean
      ) t ORDER BY updated_at DESC,id LIMIT 201`, [access.organisationId, access.project.id, this.canDesign(access)])).rows;
      const totals = (await tx.query(`SELECT (
        (SELECT count(*) FROM requirement_allocations WHERE organisation_id=$1 AND project_id=$2 AND provenance_state='manually_recorded' AND status='draft') +
        (SELECT count(*) FROM design_packages WHERE organisation_id=$1 AND project_id=$2 AND provenance_state='manually_recorded' AND status='draft' AND $3::boolean))::integer AS total`, [access.organisationId, access.project.id, this.canDesign(access)])).rows[0];
      const data = [];
      for (const target of targets.slice(0, 200)) {
        const inspected = await this.inspect(tx, access, target.target_type, target.id);
        if (inspected.changes.length) { const { sourceSnapshot: _snapshot, ...item } = inspected; data.push(item); }
      }
      return { data, meta: { dataAsOf: new Date().toISOString(), capabilities: { canAssess: this.canAssess(access) }, limit: 200,
        truncated: targets.length > 200, scannedTargets: Math.min(targets.length, 200), totalDraftTargets: totals.total,
        counts: { allocations: data.filter(item => item.targetType === 'allocation').length, designs: data.filter(item => item.targetType === 'design').length, affected: data.length }, disclosure: IMPACT_DISCLOSURE } };
    });
  }

  private summary(row: any) {
    return { id: row.id, projectId: row.project_id, targetType: row.allocation_id ? 'allocation' : 'design', targetId: row.allocation_id || row.design_package_id,
      targetVersion: row.target_version, targetRevisionId: row.allocation_revision_id || row.design_revision_id, impactFingerprint: row.impact_fingerprint,
      sourceSnapshot: row.source_snapshot, assessment: row.assessment, proposedAction: row.proposed_action, reason: row.reason,
      actorId: row.actor_id, createdAt: new Date(row.created_at).toISOString(), authorityEffect: 'advisory_only' as const };
  }

  async assessments(projectId: string, req: Request, targetType?: string, targetId?: string) {
    if (targetType !== undefined || targetId !== undefined) {
      if (!['allocation', 'design'].includes(targetType || '') || !targetId) fail('IMPACT_INPUT_INVALID', 'Supply both targetType and targetId, or neither.');
      uuid(targetId);
    }
    return this.access.withAccess(req, projectId, readAccess, async (tx, access) => {
      if (targetType && targetId) await this.target(tx, access, targetType as TargetType, targetId);
      const rows = (await tx.query(`SELECT * FROM impact_review_assessments WHERE organisation_id=$1 AND project_id=$2 ${this.canDesign(access) ? '' : 'AND allocation_id IS NOT NULL'}
        ${targetType ? `AND ${targetType === 'allocation' ? 'allocation_id' : 'design_package_id'}=$3` : ''}
        ORDER BY created_at DESC,id DESC LIMIT 201`, [access.organisationId, access.project.id, ...(targetId ? [targetId] : [])])).rows;
      return { data: rows.slice(0, 200).map(row => this.summary(row)), meta: { limit: 200, truncated: rows.length > 200, disclosure: IMPACT_DISCLOSURE } };
    });
  }

  async create(projectId: string, body: unknown, req: Request) {
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail('IMPACT_INPUT_INVALID', 'Supply an exact target version and fingerprint, assessment, proposed action and reason. No approval or release fields are accepted.');
    const input = parsed.data;
    let reviewed: Awaited<ReturnType<ImpactRegisterService['inspect']>>;
    return this.commands.run(req, projectId, { ...writeAccess, operation: `impact.assess:${input.targetType}:${input.targetId}`, action: 'impact.assessment_recorded', targetType: 'impact_assessment', input,
      authorize: async (tx, access) => {
        reviewed = await this.inspect(tx, access, input.targetType, input.targetId);
        if (reviewed.targetVersion !== input.expectedTargetVersion || reviewed.impactFingerprint !== input.impactFingerprint) {
          fail('IMPACT_VERSION_CONFLICT', 'The target or its sources changed. Refresh the impact review before recording an assessment.', 409);
        }
        if (!reviewed.changes.length) fail('IMPACT_NO_CURRENT_CHANGE', 'There is no current source-version change to assess for this draft.', 409);
      } }, async (tx, access) => {
        const id = randomUUID(), allocation = input.targetType === 'allocation';
        const row = (await tx.query(`INSERT INTO impact_review_assessments
          (id,organisation_id,project_id,allocation_id,allocation_revision_id,design_package_id,design_revision_id,target_version,impact_fingerprint,source_snapshot,assessment,proposed_action,reason,actor_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14) RETURNING *`,
          [id, access.organisationId, access.project.id, allocation ? input.targetId : null, allocation ? reviewed.targetRevisionId : null,
            allocation ? null : input.targetId, allocation ? null : reviewed.targetRevisionId, input.expectedTargetVersion, input.impactFingerprint,
            JSON.stringify(reviewed.sourceSnapshot), input.assessment, input.proposedAction, input.reason, access.userId])).rows[0];
        return { id, data: this.summary(row), event: { targetType: input.targetType, assessedTargetId: input.targetId,
          assessedVersion: input.expectedTargetVersion, impactFingerprint: input.impactFingerprint, authorityEffect: 'advisory_only' } };
      });
  }
}
