import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbPool } from '../packages/db/src/client.js';
import { RequirementIntakeService } from '../apps/api/src/scope/requirement-intake.service.js';
import { AllocationRegisterService } from '../apps/api/src/scope/allocation-register.service.js';
import { DesignRegisterService, validateDesignBrief } from '../apps/api/src/designs/design-register.service.js';

// Runs with the combined planning batch, after migrations 0024–0026.
const pool = getDbPool(), database = { getPool: () => pool } as any;
type Actor = { id: string; membership: string; token: string; org: string };
const orgs: string[] = [], users: string[] = [];
let org: string, otherOrg: string, project: string, otherProject: string, manager: Actor, designer: Actor, viewer: Actor, client: Actor, outsider: Actor;
let requirements: RequirementIntakeService, allocations: AllocationRegisterService, service: DesignRegisterService, requirementId: string;
const request = (actor = manager, key = randomUUID()) => ({ method: 'POST', organisationId: actor.org,
  headers: { authorization: `Bearer ${actor.token}`, 'idempotency-key': key } }) as any;
const requirementBody = (extra = {}) => ({ title: 'Accessible counter', originalWording: 'Provide an accessible information counter.', sourceType: 'manual', reason: 'Record the planning source', ...extra });
const brief = (extra = {}) => ({ title: 'Counter concept', brief: 'Develop an accessible counter layout.', requirementRefs: [{ requirementId, expectedVersion: 1 }], reason: 'Develop source requirements', ...extra });
async function organisation() {
  const value = randomUUID(); orgs.push(value);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [value, 'Synthetic design register', `DSG-${value}`]); return value;
}
async function actor(role: string, audience = 'internal') {
  const value = { id: randomUUID(), membership: randomUUID(), token: randomUUID(), org }; users.push(value.id);
  await pool.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [value.id, `${value.id}@example.test`, 'Synthetic design actor']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [value.membership, org, value.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,clock_timestamp()+INTERVAL '1 hour')", [value.id, value.token]); return value;
}
async function makeProject() {
  const value = randomUUID();
  await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
    VALUES($1,$2,$3,'Synthetic design scope','Test-only brief','INTERNAL_IDEA',$4,$4,$4)`, [value, org, `DSG-${value}`, manager.id]); return value;
}
async function grant(person: Actor, level = 'editor', scope = project) {
  await pool.query(`INSERT INTO project_access_grants(organisation_id,project_id,membership_id,access_level,granted_by,reason)
    VALUES($1,$2,$3,$4,$5,'Synthetic design fixture')`, [org, scope, person.membership, level, manager.id]);
}
async function counts() {
  return (await pool.query(`SELECT (SELECT count(*)::int FROM design_packages WHERE organisation_id=$1) designs,
    (SELECT count(*)::int FROM design_package_revisions WHERE organisation_id=$1) revisions,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) events,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [org])).rows[0];
}
beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false'); org = await organisation(); otherOrg = await organisation();
  manager = await actor('project_manager'); designer = await actor('design_production'); viewer = await actor('design_production'); client = await actor('client_user', 'client'); outsider = await actor('super_admin');
  project = await makeProject(); otherProject = await makeProject();
  await grant(manager); await grant(manager, 'editor', otherProject); await grant(designer); await grant(viewer, 'viewer'); await grant(client, 'viewer');
  requirements = new RequirementIntakeService(database); allocations = new AllocationRegisterService(database); service = new DesignRegisterService(database);
  requirementId = (await requirements.create(project, requirementBody(), request())).data.id;
});
afterEach(async () => {
  try {
    for (const table of ['design_packages', 'requirement_allocations', 'requirements']) await pool.query(`UPDATE ${table} SET current_revision_id=NULL WHERE organisation_id=ANY($1::uuid[])`, [orgs]);
    for (const table of ['impact_review_assessments', 'design_package_revisions', 'design_packages', 'requirement_allocation_revisions', 'requirement_allocations', 'requirement_revisions', 'requirements', 'idempotency_records', 'audit_events', 'outbox', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [orgs]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [users]); await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [orgs]);
  } finally { orgs.length = 0; users.length = 0; vi.unstubAllEnvs(); }
});

describe('Canonical design brief register', () => {
  it('records metadata and exact requirement pins without invented files, quantities, approvals or release', async () => {
    const result = await service.create(project, brief(), request());
    expect(result.data).toMatchObject({ title: 'Counter concept', rowVersion: 1, currentRevision: 1, fileStatus: 'missing', approvalState: 'not_approved',
      productionReleased: false, materials: null, dimensions: null, ownerId: null, approvedQuantity: null, releasedQuantity: null, canRevise: true, sourceStale: false });
    expect(result.data.requirements).toMatchObject([{ requirementId, requirementVersion: 1 }]);
    expect(result.data.requirements[0].requirementRevisionId).toBeTruthy(); expect(result.data.requirements[0].requirementSnapshotHash).toMatch(/^[a-f0-9]{64}$/);
    const stored = (await pool.query('SELECT * FROM design_packages WHERE id=$1', [result.data.id])).rows[0];
    expect(stored).toMatchObject({ approved_quantity: null, released_quantity: null, internal_approval: false, client_approval: false, production_release_status: 'not_released' });
    expect(await counts()).toEqual({ designs: 1, revisions: 1, audits: 2, events: 2, receipts: 2 });
  });
  it('rejects fabricated file hashes, approvals, quantities, missing source versions and duplicate references', () => {
    for (const extra of [{ fileHash: 'f'.repeat(64) }, { approvalState: 'approved' }, { approvedQuantity: '10' }, { requirementRefs: [] },
      { requirementRefs: [{ requirementId }] }, { requirementRefs: [{ requirementId, expectedVersion: 1 }, { requirementId, expectedVersion: 1 }] }]) {
      expect(() => validateDesignBrief(brief(extra))).toThrow();
    }
    expect(() => validateDesignBrief(brief({ expectedVersion: 1 }))).toThrow();
  });
  it('requires current session, project grant, internal audience and editor permissions', async () => {
    await expect(service.list(project, { organisationId: org, headers: { 'x-user-role': 'super_admin' } } as any)).rejects.toMatchObject({ status: 401 });
    await expect(service.list(project, request(outsider))).rejects.toMatchObject({ status: 404 });
    await expect(service.list(project, request(client))).rejects.toMatchObject({ status: 403 });
    await expect(service.create(project, brief(), request(viewer))).rejects.toMatchObject({ status: 403 });
    expect((await service.list(project, request(viewer))).meta.capabilities.canCreateDraft).toBe(false);
    await expect(service.create(project, brief({ ownerId: outsider.id }), request())).rejects.toMatchObject({ status: 404 });
  });
  it('scopes detail, history and selected sources to the project and organisation', async () => {
    const row = (await service.create(project, brief(), request())).data;
    await expect(service.get(otherProject, row.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.revisions(otherProject, row.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.create(otherProject, brief(), request())).rejects.toMatchObject({ status: 404 });
    const forged = request(); forged.organisationId = otherOrg;
    await expect(service.get(project, row.id, forged)).rejects.toMatchObject({ status: 401 });
  });
  it('pins allocation notes and rejects an allocation outside selected requirements or with stale source pins', async () => {
    const allocation = (await allocations.create(project, { requirementId, expectedRequirementVersion: 1, quantity: '0', unit: 'counter', notes: 'Verify venue clearance', reason: 'Plan zone A' }, request())).data;
    const result = await service.create(project, brief({ allocationRefs: [{ allocationId: allocation.id, expectedVersion: 1 }] }), request());
    expect(result.data.allocations).toMatchObject([{ allocationId: allocation.id, allocationVersion: 1, requirementId, requirementVersion: 1 }]);
    const second = (await requirements.create(project, requirementBody({ title: 'Another counter' }), request())).data.id;
    await expect(service.create(project, brief({ requirementRefs: [{ requirementId: second, expectedVersion: 1 }], allocationRefs: [{ allocationId: allocation.id, expectedVersion: 1 }] }), request())).rejects.toMatchObject({ status: 400 });
    await requirements.revise(project, requirementId, requirementBody({ expectedVersion: 1, quantity: '2' }), request());
    await expect(service.create(project, brief({ requirementRefs: [{ requirementId, expectedVersion: 2 }], allocationRefs: [{ allocationId: allocation.id, expectedVersion: 1 }] }), request())).rejects.toMatchObject({ status: 409 });
  });
  it('preserves earlier design pins and marks source changes until an explicit revision rebases them', async () => {
    const row = (await service.create(project, brief(), request())).data;
    const earlier = (await service.revisions(project, row.id, request())).data[0];
    await requirements.revise(project, requirementId, requirementBody({ expectedVersion: 1, quantity: '2' }), request());
    expect((await service.get(project, row.id, request())).data).toMatchObject({ sourceStale: true, rowVersion: 1, canRevise: true });
    await expect(service.revise(project, row.id, brief({ expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409 });
    const revised = await service.revise(project, row.id, brief({ expectedVersion: 1, requirementRefs: [{ requirementId, expectedVersion: 2 }] }), request());
    expect(revised.data).toMatchObject({ id: row.id, rowVersion: 2, sourceStale: false, productionReleased: false });
    const history = (await service.revisions(project, row.id, request())).data;
    expect(history).toHaveLength(2); expect(history[1].snapshot).toEqual(earlier.snapshot); expect(history[1].snapshotHash).toBe(earlier.snapshotHash);
    expect(history[1].sourceStale).toBe(true); expect(history[0].sourceStale).toBe(false);
    await expect(pool.query("UPDATE design_package_revisions SET reason='Rewrite history' WHERE id=$1", [earlier.id])).rejects.toThrow('cannot be updated');
  });
  it('recovers exact receipts after service restart and prevents changed-payload reuse', async () => {
    const req = request(designer), first = await service.create(project, brief(), req), before = await counts();
    expect(await new DesignRegisterService(database).create(project, brief(), req)).toEqual(first); expect(await counts()).toEqual(before);
    await expect(service.create(project, brief({ title: 'Changed title' }), req)).rejects.toMatchObject({ status: 409 });
    const revisionReq = request(), input = brief({ expectedVersion: 1, title: 'Counter layout revision' });
    const second = await service.revise(project, first.data.id, input, revisionReq);
    expect(await service.revise(project, first.data.id, input, revisionReq)).toEqual(second);
  });
  it('allows one concurrent revision per expected version with no partial competing receipt', async () => {
    const row = (await service.create(project, brief(), request())).data;
    const result = await Promise.allSettled([service.revise(project, row.id, brief({ title: 'Option A', expectedVersion: 1 }), request()), service.revise(project, row.id, brief({ title: 'Option B', expectedVersion: 1 }), request(designer))]);
    expect(result.filter(value => value.status === 'fulfilled')).toHaveLength(1); expect(result.filter(value => value.status === 'rejected')).toHaveLength(1);
    expect(await counts()).toEqual({ designs: 1, revisions: 2, audits: 3, events: 3, receipts: 3 });
  });
  it('fails closed on unrecorded changes, source classification changes and legacy approval claims', async () => {
    const req = request(), row = (await service.create(project, brief(), req)).data;
    await pool.query("UPDATE design_packages SET brief='Changed outside history' WHERE id=$1", [row.id]);
    await expect(service.revise(project, row.id, brief({ expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409 });
    await expect(service.create(project, brief(), req)).rejects.toMatchObject({ status: 409 });
    await pool.query('UPDATE requirements SET is_approved=true WHERE id=$1', [requirementId]);
    await expect(service.create(project, brief(), request())).rejects.toMatchObject({ status: 409 });
    const legacy = randomUUID();
    await pool.query("INSERT INTO design_packages(id,organisation_id,project_id,title,internal_approval) VALUES($1,$2,$3,'Legacy claim',true)", [legacy, org, project]);
    expect((await service.get(project, legacy, request())).data).toMatchObject({ status: 'legacy_unverified', canRevise: false, approvalState: 'legacy_unverified', productionReleased: false });
    await expect(service.revise(project, legacy, brief({ expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409 });
  });
  it('rechecks grant and role before replay and rolls back metadata, history and audit when event persistence fails', async () => {
    const req = request(designer); await service.create(project, brief(), req);
    await pool.query("UPDATE memberships SET role='finance' WHERE id=$1", [designer.membership]);
    await expect(service.create(project, brief(), req)).rejects.toMatchObject({ status: 403 });
    await pool.query("UPDATE memberships SET role='design_production' WHERE id=$1", [designer.membership]);
    await pool.query('UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=clock_timestamp() WHERE membership_id=$1', [designer.membership, manager.id]);
    await expect(service.create(project, brief(), req)).rejects.toMatchObject({ status: 404 });
    const failing = new DesignRegisterService({ getPool: () => ({ connect: async () => {
      const tx = await pool.connect(); return { query: (sql: string, values?: any[]) => {
        if (/INSERT\s+INTO\s+outbox\b/i.test(sql)) throw new Error('Synthetic durable event outage'); return tx.query(sql, values);
      }, release: () => tx.release() };
    } }) } as any), before = await counts();
    await expect(failing.create(project, brief(), request())).rejects.toMatchObject({ status: 503 }); expect(await counts()).toEqual(before);
  });
});
