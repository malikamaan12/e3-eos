import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbPool } from '../packages/db/src/client.js';
import { ImpactRegisterService } from '../apps/api/src/scope/impact-register.service.js';
import { RequirementIntakeService } from '../apps/api/src/scope/requirement-intake.service.js';
import { AllocationRegisterService } from '../apps/api/src/scope/allocation-register.service.js';
import { DesignRegisterService } from '../apps/api/src/designs/design-register.service.js';

// Run as one batch after reviewed migrations 0024–0026 are installed.
const pool = getDbPool(), db = { getPool: () => pool } as any;
const organisations: string[] = [], users: string[] = [];
type Actor = { id: string; membership: string; org: string; token: string };
let org: string, project: string, otherProject: string;
let manager: Actor, operations: Actor, viewer: Actor, client: Actor, unassigned: Actor;
let service: ImpactRegisterService;
const requirements = new RequirementIntakeService(db), allocations = new AllocationRegisterService(db), designs = new DesignRegisterService(db);
const requirementInput = { title: 'Counters', originalWording: 'Provide counters at each entry', sourceType: 'manual', quantity: '20', unit: 'each', reason: 'Record supplied scope wording' };
async function actor(role: string, audience = 'internal') {
  const result = { id: randomUUID(), membership: randomUUID(), org, token: randomUUID() }; users.push(result.id);
  await pool.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [result.id, `${result.id}@example.test`, 'Synthetic impact reviewer']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [result.membership, org, result.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,clock_timestamp()+INTERVAL '1 hour')", [result.id, result.token]);
  return result;
}
async function makeProject() {
  const id = randomUUID();
  await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
    VALUES($1,$2,$3,'Synthetic impact project','Isolated version review test','INTERNAL_IDEA',$4,$4,$4)`, [id, org, `IMPACT-${id}`, manager.id]);
  return id;
}
async function grant(person: Actor, level = 'editor', projectId = project) {
  await pool.query(`INSERT INTO project_access_grants(id,organisation_id,project_id,membership_id,access_level,granted_by,reason)
    VALUES($1,$2,$3,$4,$5,$6,'Synthetic impact regression')`, [randomUUID(), org, projectId, person.membership, level, manager.id]);
}
const request = (person = manager, key = randomUUID()) => ({ method: 'POST', organisationId: org, headers: { authorization: `Bearer ${person.token}`, 'idempotency-key': key } }) as any;
const assessment = (item: any, extra = {}) => ({ targetType: item.targetType, targetId: item.targetId, expectedTargetVersion: item.targetVersion,
  impactFingerprint: item.impactFingerprint, assessment: 'The source quantity has changed; the earlier distribution needs review.',
  proposedAction: 'Ask the planning owner to review the allocation.', reason: 'Retain the source change assessment', ...extra });
async function chain(withDesign = true) {
  const requirement = (await requirements.create(project, requirementInput, request())).data;
  const allocation = (await allocations.create(project, { requirementId: requirement.id, expectedRequirementVersion: 1, quantity: '12', unit: 'each', location: 'Zone A', notes: 'Source plan', reason: 'Plan a location' }, request())).data;
  const design = withDesign ? (await designs.create(project, { title: 'Entry counter layout', brief: 'Unapproved planning layout metadata',
    requirementRefs: [{ requirementId: requirement.id, expectedVersion: 1 }], allocationRefs: [{ allocationId: allocation.id, expectedVersion: 1 }], reason: 'Prepare a concept brief' }, request())).data : null;
  return { requirement, allocation, design };
}
async function reviseSource(id: string, expectedVersion = 1, quantity = '24') {
  return requirements.revise(project, id, { ...requirementInput, quantity, expectedVersion, reason: 'Correct the supplied quantity claim' }, request());
}
async function counts() {
  return (await pool.query(`SELECT
    (SELECT count(*)::int FROM impact_review_assessments WHERE organisation_id=$1) assessments,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) events,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [org])).rows[0];
}
beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  org = randomUUID(); organisations.push(org);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [org, 'Synthetic impact tests', `IMPACT-${org}`]);
  manager = await actor('project_manager'); operations = await actor('operations'); viewer = await actor('design_production');
  client = await actor('client_user', 'client'); unassigned = await actor('super_admin');
  project = await makeProject(); otherProject = await makeProject();
  await grant(manager); await grant(manager, 'editor', otherProject); await grant(operations); await grant(viewer, 'viewer'); await grant(client, 'viewer');
  service = new ImpactRegisterService(db);
});
afterEach(async () => {
  try {
    await pool.query('DELETE FROM impact_review_assessments WHERE organisation_id=ANY($1::uuid[])', [organisations]);
    for (const table of ['design_packages', 'requirement_allocations', 'requirements']) await pool.query(`UPDATE ${table} SET current_revision_id=NULL WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    for (const table of ['design_package_revisions', 'design_packages', 'requirement_allocation_revisions', 'requirement_allocations',
      'requirement_revisions', 'requirements', 'idempotency_records', 'audit_events', 'outbox', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [organisations]);
  } finally { organisations.length = 0; users.length = 0; vi.unstubAllEnvs(); }
});

describe('Immutable advisory impact review', () => {
  it('detects changed requirements for allocations and designs, preserving exact old and current wording', async () => {
    const { requirement } = await chain();
    const before = await service.list(project, request());
    expect(before.data).toEqual([]); expect(before.meta).toMatchObject({ scannedTargets: 2, totalDraftTargets: 2, truncated: false });
    await reviseSource(requirement.id);
    const result = await service.list(project, request());
    expect(result.meta.counts).toEqual({ allocations: 1, designs: 1, affected: 2 });
    for (const item of result.data) {
      expect(item.impactFingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(item.changes).toHaveLength(1);
      expect(item.changes[0]).toMatchObject({ sourceType: 'requirement', sourceId: requirement.id, pinnedVersion: 1, currentVersion: 2,
        pinnedSnapshot: { quantity: '20' }, currentSnapshot: { quantity: '24' } });
    }
  });

  it('records the authenticated reviewer and atomic receipt without updating or approving targets', async () => {
    const { requirement, allocation } = await chain(false); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data[0], req = request(), before = await counts();
    const result = await service.create(project, assessment(item), req);
    expect(result.data).toMatchObject({ targetType: 'allocation', targetId: allocation.id, targetVersion: 1, actorId: manager.id, authorityEffect: 'advisory_only',
      sourceSnapshot: { targetSnapshot: { quantity: '12' } } });
    expect(result.data.auditEventId).toBeTruthy(); expect(result.data.eventId).toBeTruthy();
    expect(await new ImpactRegisterService(db).create(project, assessment(item), req)).toEqual(result);
    expect(await counts()).toEqual({ assessments: 1, audits: before.audits + 1, events: before.events + 1, receipts: before.receipts + 1 });
    expect((await service.list(project, request())).data[0].impactFingerprint).toBe(item.impactFingerprint);
    expect((await allocations.get(project, allocation.id, request())).data).toMatchObject({ rowVersion: 1, quantity: '12', status: 'draft', staleSource: true });
    const event = (await pool.query('SELECT payload FROM outbox WHERE event_id=$1', [result.data.eventId])).rows[0].payload;
    expect(event).not.toHaveProperty('assessment'); expect(event).not.toHaveProperty('sourceSnapshot');
    expect((await service.assessments(project, request(), 'allocation', allocation.id)).data[0]).toMatchObject({ id: result.data.id, actorId: manager.id });
  });

  it('rejects stale source fingerprints even on retries while retaining the original assessment', async () => {
    const { requirement } = await chain(false); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data[0], req = request();
    const recorded = await service.create(project, assessment(item), req);
    await reviseSource(requirement.id, 2, '28');
    await expect(service.create(project, assessment(item), req)).rejects.toMatchObject({ status: 409 });
    await expect(service.create(project, assessment(item), request())).rejects.toMatchObject({ status: 409 });
    const history = await service.assessments(project, request());
    expect(history.data).toHaveLength(1); expect(history.data[0].id).toBe(recorded.data.id);
    expect(history.data[0].sourceSnapshot.sources[0].currentSnapshot.quantity).toBe('24');
    expect((await service.list(project, request())).data[0].changes[0].currentSnapshot.quantity).toBe('28');
  });

  it('rejects changed targets and shows allocation version changes on the pinned design', async () => {
    const { requirement, allocation, design } = await chain(); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data.find(row => row.targetId === allocation.id)!;
    await allocations.revise(project, allocation.id, { requirementId: requirement.id, expectedRequirementVersion: 2, expectedVersion: 1, quantity: '16', unit: 'each', reason: 'Review changed source' }, request());
    await expect(service.create(project, assessment(item), request())).rejects.toMatchObject({ status: 409 });
    const result = await service.list(project, request());
    expect(result.data).toHaveLength(1); expect(result.data[0].targetId).toBe(design!.id);
    expect(result.data[0].changes.map(row => row.sourceType).sort()).toEqual(['allocation', 'requirement']);
    expect(result.data[0].changes.find(row => row.sourceType === 'requirement')?.pinnedVersion).toBe(1);
  });

  it('limits operations roles to allocation impact and excludes design history', async () => {
    const { requirement, design } = await chain(); await reviseSource(requirement.id);
    const all = (await service.list(project, request())).data;
    const designItem = all.find(row => row.targetType === 'design')!;
    await service.create(project, assessment(designItem), request());
    const visible = await service.list(project, request(operations));
    expect(visible.data.map(row => row.targetType)).toEqual(['allocation']); expect(visible.meta.totalDraftTargets).toBe(1);
    expect((await service.assessments(project, request(operations))).data).toEqual([]);
    await expect(service.assessments(project, request(operations), 'design', design!.id)).rejects.toMatchObject({ status: 403 });
    await expect(service.create(project, assessment(designItem), request(operations))).rejects.toMatchObject({ status: 403 });
  });

  it('checks current sessions, project grants, audiences, write levels and nested target scope', async () => {
    const { requirement, allocation } = await chain(false); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data[0];
    await expect(service.list(project, { organisationId: org, headers: { 'x-user-role': 'super_admin' } } as any)).rejects.toMatchObject({ status: 401 });
    await expect(service.list(project, request(unassigned))).rejects.toMatchObject({ status: 404 });
    await expect(service.list(project, request(client))).rejects.toMatchObject({ status: 403 });
    expect((await service.list(project, request(viewer))).meta.capabilities.canAssess).toBe(false);
    await expect(service.create(project, assessment(item), request(viewer))).rejects.toMatchObject({ status: 403 });
    await expect(service.create(otherProject, assessment(item), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.assessments(otherProject, request(), 'allocation', allocation.id)).rejects.toMatchObject({ status: 404 });
    const req = request(operations); await service.create(project, assessment(item), req);
    await pool.query('UPDATE project_access_grants SET is_revoked=true,revoked_at=clock_timestamp(),revoked_by=$2 WHERE membership_id=$1', [operations.membership, manager.id]);
    await expect(service.create(project, assessment(item), req)).rejects.toMatchObject({ status: 404 });
  });

  it('deduplicates concurrent identical commands and rejects payload changes under the same key', async () => {
    const { requirement } = await chain(false); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data[0], req = request();
    const result = await Promise.all([service.create(project, assessment(item), req), service.create(project, assessment(item), req)]);
    expect(result[0]).toEqual(result[1]); expect((await counts()).assessments).toBe(1);
    await expect(service.create(project, assessment(item, { proposedAction: 'Different follow-up' }), req)).rejects.toMatchObject({ status: 409 });
  });

  it('rejects approval claims, caller identities and malformed target filters', async () => {
    const { requirement } = await chain(false); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data[0];
    for (const extra of [{ approved: true }, { actorId: unassigned.id }, { assessment: '' }, { expectedTargetVersion: 0 }, { impactFingerprint: 'wrong' }, { sourceSnapshot: {} }]) {
      await expect(service.create(project, assessment(item, extra), request())).rejects.toMatchObject({ status: 400 });
    }
    await expect(service.assessments(project, request(), 'allocation')).rejects.toMatchObject({ status: 400 });
    await expect(service.assessments(project, request(), undefined, randomUUID())).rejects.toMatchObject({ status: 400 });
    expect((await counts()).assessments).toBe(0);
  });

  it('preserves immutable history and rolls back assessment, audit and receipt on event failure', async () => {
    const { requirement } = await chain(false); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data[0], before = await counts();
    const failing = new ImpactRegisterService({ getPool: () => ({ connect: async () => {
      const tx = await pool.connect(); return { query: (sql: string, values?: any[]) => {
        if (/INSERT\s+INTO\s+outbox\b/i.test(sql)) throw new Error('Synthetic event failure');
        return tx.query(sql, values);
      }, release: () => tx.release() };
    } }) } as any);
    await expect(failing.create(project, assessment(item), request())).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
    const saved = await service.create(project, assessment(item), request());
    await expect(pool.query('UPDATE impact_review_assessments SET assessment=$2 WHERE id=$1', [saved.data.id, 'Overwritten'])).rejects.toThrow(/immutable/);
  });

  it('does not trust current source columns that drift from the immutable snapshot', async () => {
    const { requirement } = await chain(false); await reviseSource(requirement.id);
    const item = (await service.list(project, request())).data[0];
    await pool.query('UPDATE requirements SET original_wording=$2 WHERE id=$1', [requirement.id, 'Drifted source column']);
    await expect(service.list(project, request())).rejects.toMatchObject({ status: 409 });
    await expect(service.create(project, assessment(item), request())).rejects.toMatchObject({ status: 409 });
    expect((await counts()).assessments).toBe(0);
  });
});
