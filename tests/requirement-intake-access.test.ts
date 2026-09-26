import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbPool } from '../packages/db/src/client.js';
import { RequirementIntakeService, requirementQuantity, requirementSnapshotHash, validateRequirementDraft } from '../apps/api/src/scope/requirement-intake.service.js';

// Included in the combined module verification after migration 0021.
const pool = getDbPool();
const database = { getPool: () => pool } as any;
type Actor = { id: string; membership: string; token: string; org: string };
const orgIds: string[] = [], userIds: string[] = [];
let org: string, otherOrg: string, project: string, otherProject: string;
let manager: Actor, designer: Actor, viewer: Actor, finance: Actor, client: Actor, unassigned: Actor;
let service: RequirementIntakeService;
const draft = (extra = {}) => ({ title: 'Temporary wayfinding counter', originalWording: '  Provide accessible information counters.\nKeep client wording.  ', sourceType: 'client_note', reason: 'Record a client note for review', ...extra });
const request = (actor = manager, key = randomUUID()) => ({ method: 'POST', organisationId: actor.org,
  headers: { authorization: `Bearer ${actor.token}`, 'idempotency-key': key } }) as any;
async function organisation() {
  const id = randomUUID(); orgIds.push(id);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [id, 'Synthetic requirement intake', `REQ-${id}`]);
  return id;
}
async function actor(role: string, audience = 'internal') {
  const row = { id: randomUUID(), membership: randomUUID(), token: randomUUID(), org }; userIds.push(row.id);
  await pool.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [row.id, `${row.id}@example.test`, 'Synthetic requirement actor']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [row.membership, org, row.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,clock_timestamp()+INTERVAL '1 hour')", [row.id, row.token]);
  return row;
}
async function makeProject() {
  const id = randomUUID();
  await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
    VALUES($1,$2,$3,'Synthetic intake scope','Test-only requirement draft','INTERNAL_IDEA',$4,$4,$4)`, [id, org, `REQ-${id}`, manager.id]);
  return id;
}
async function grant(person: Actor, level = 'editor', scope = project) {
  await pool.query(`INSERT INTO project_access_grants(organisation_id,project_id,membership_id,access_level,granted_by,reason)
    VALUES($1,$2,$3,$4,$5,'Synthetic requirement fixture grant')`, [org, scope, person.membership, level, manager.id]);
}
async function counts() {
  return (await pool.query(`SELECT (SELECT count(*)::int FROM requirements WHERE organisation_id=$1) requirements,
    (SELECT count(*)::int FROM requirement_revisions WHERE organisation_id=$1) revisions,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) events,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [org])).rows[0];
}
beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  org = await organisation(); otherOrg = await organisation();
  manager = await actor('project_manager'); designer = await actor('design_production'); viewer = await actor('operations');
  finance = await actor('finance'); client = await actor('client_user', 'client'); unassigned = await actor('super_admin');
  project = await makeProject(); otherProject = await makeProject();
  await grant(manager); await grant(manager, 'editor', otherProject); await grant(designer); await grant(viewer, 'viewer'); await grant(finance); await grant(client, 'viewer');
  service = new RequirementIntakeService(database);
});
afterEach(async () => {
  try {
    // Clearing the current pointer is a test teardown action, not an intake API.
    await pool.query('UPDATE requirements SET current_revision_id=NULL WHERE organisation_id=ANY($1::uuid[])', [orgIds]);
    for (const table of ['requirement_revisions', 'requirements', 'idempotency_records', 'audit_events', 'outbox', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [orgIds]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [orgIds]);
  } finally { orgIds.length = 0; userIds.length = 0; vi.unstubAllEnvs(); }
});

describe('Canonical requirement draft intake', () => {
  it('preserves raw wording and unknown quantities, dates, owners and classifications without defaults', async () => {
    const result = await service.create(project, draft(), request());
    expect(result.data).toMatchObject({ originalWording: draft().originalWording, quantity: null, unit: null,
      category: null, ownerId: null, startDate: null, dueDate: null, rowVersion: 1, currentRevision: 1,
      isApproved: false, status: 'draft', sourceVerification: 'unverified', provenanceState: 'manually_recorded', operationalScopePublished: false });
    const stored = (await pool.query('SELECT * FROM requirements WHERE id=$1', [result.data.id])).rows[0];
    expect(stored).toMatchObject({ quantity: null, unit: null, priority: null, risk: null, due_date: null, start_date: null, is_approved: false });
    expect(stored.current_revision_id).toBeTruthy();
    expect(await counts()).toEqual({ requirements: 1, revisions: 1, audits: 1, events: 1, receipts: 1 });
  });

  it('keeps explicit decimal zero and rejects imprecise numbers or manufactured approval fields', async () => {
    expect(requirementQuantity('0.000')).toBe('0'); expect(requirementQuantity(null)).toBeNull();
    expect(requirementQuantity('999999999999999999.123456')).toBe('999999999999999999.123456');
    const result = await service.create(project, draft({ quantity: '0', unit: 'counter' }), request());
    expect(result.data.quantity).toBe('0');
    for (const addition of [{ quantity: 2 }, { quantity: '-1' }, { quantity: '1e6' }, { isApproved: true }, { dueDate: '2026-12-01' }, { sourceVerification: 'verified' }, { sourceEvidenceSpans: [{ page: 1 }] }]) {
      expect(() => validateRequirementDraft(draft(addition))).toThrow();
    }
    expect((await counts()).requirements).toBe(1);
  });

  it('recovers exact receipts in a fresh service and rejects reused keys for changed payloads', async () => {
    const req = request(designer), first = await service.create(project, draft(), req), before = await counts();
    expect(await new RequirementIntakeService(database).create(project, draft(), req)).toEqual(first);
    expect(await counts()).toEqual(before);
    await expect(service.create(project, draft({ title: 'Another obligation' }), req)).rejects.toMatchObject({ status: 409 });
  });

  it('requires actual current session, internal audience, explicit grant and permitted role', async () => {
    await expect(service.list(project, { organisationId: org, headers: { 'x-user-role': 'super_admin' } } as any)).rejects.toMatchObject({ status: 401 });
    await expect(service.list(project, request(unassigned))).rejects.toMatchObject({ status: 404 });
    await expect(service.list(project, request(client))).rejects.toMatchObject({ status: 403 });
    await expect(service.list(project, request(finance))).rejects.toMatchObject({ status: 403 });
    await expect(service.create(project, draft(), request(viewer))).rejects.toMatchObject({ status: 403 });
    const visible = await service.list(project, request(viewer));
    expect(visible.meta.capabilities.canCreateDraft).toBe(false);
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [designer.membership]);
    await expect(service.create(project, draft(), request(designer))).rejects.toMatchObject({ status: 401 });
  });

  it('scopes requirement details and immutable revision history to the same project and organization', async () => {
    const record = (await service.create(project, draft(), request())).data;
    expect((await service.list(otherProject, request())).data).toEqual([]);
    await expect(service.get(otherProject, record.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.revisions(otherProject, record.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.revise(otherProject, record.id, draft({ expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 404 });
    const forged = request(); forged.organisationId = otherOrg;
    await expect(service.get(project, record.id, forged)).rejects.toMatchObject({ status: 401 });
  });

  it('does not infer an owner grant from role or membership', async () => {
    await expect(service.create(project, draft({ ownerId: unassigned.id }), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.create(project, draft({ ownerId: client.id }), request())).rejects.toMatchObject({ status: 404 });
    const valid = await service.create(project, draft({ ownerId: designer.id }), request());
    expect(valid.data.ownerId).toBe(designer.id);
  });

  it('appends a full draft revision while preserving earlier wording, hash and exact stable identity', async () => {
    const first = (await service.create(project, draft({ quantity: '20', unit: 'counter' }), request())).data;
    const before = (await service.revisions(project, first.id, request())).data[0];
    const input = draft({ originalWording: 'Client amended the source wording.', interpretation: 'Review revised layout.', quantity: '22', unit: 'counter', expectedVersion: 1 });
    const req = request(designer), revised = await service.revise(project, first.id, input, req);
    expect(revised.data).toMatchObject({ id: first.id, rowVersion: 2, currentRevision: 2, quantity: '22', isApproved: false });
    const history = (await service.revisions(project, first.id, request())).data;
    expect(history).toHaveLength(2); expect(history[1]).toEqual(before);
    expect(history[1].snapshot.originalWording).toBe(draft().originalWording);
    expect(history[0].snapshotHash).toBe(requirementSnapshotHash(history[0].snapshot));
    expect(history[0].snapshotIntegrityVerified).toBe(true);
    expect(await service.revise(project, first.id, input, req)).toEqual(revised);
    await expect(service.revise(project, first.id, input, request())).rejects.toMatchObject({ status: 409 });
    await expect(pool.query("UPDATE requirement_revisions SET reason_for_change='Rewritten past' WHERE id=$1", [before.id])).rejects.toThrow('cannot be updated');
  });

  it('never overwrites approved or legacy records through the intake path', async () => {
    const approved = (await service.create(project, draft(), request())).data;
    await pool.query("UPDATE requirements SET is_approved=true,status='approved' WHERE id=$1", [approved.id]);
    expect((await service.get(project, approved.id, request())).data.canRevise).toBe(false);
    await expect(service.revise(project, approved.id, draft({ expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409 });
    const legacyId = randomUUID();
    await pool.query(`INSERT INTO requirements(id,organisation_id,project_id,title,description,is_approved,status)
      VALUES($1,$2,$3,'Imported approval claim','Legacy source missing',true,'approved')`, [legacyId, org, project]);
    expect((await service.get(project, legacyId, request())).data).toMatchObject({ provenanceState: 'legacy_unverified', status: 'legacy_unverified', isApproved: false, recordedApproval: true, canRevise: false });
    await expect(service.revise(project, legacyId, draft({ expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409 });
  });

  it('blocks an unrecorded current-row change instead of hiding it in a later history revision', async () => {
    const record = (await service.create(project, draft(), request())).data;
    await pool.query("UPDATE requirements SET original_wording='Changed outside recorded history' WHERE id=$1", [record.id]);
    await expect(service.revise(project, record.id, draft({ expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409, response: { code: 'REQUIREMENT_HISTORY_CONFLICT' } });
    expect((await counts()).revisions).toBe(1);
  });

  it('allows one concurrent revision per expected version and no partial second audit or receipt', async () => {
    const record = (await service.create(project, draft(), request())).data;
    const result = await Promise.allSettled([service.revise(project, record.id, draft({ quantity: '3', expectedVersion: 1 }), request()), service.revise(project, record.id, draft({ quantity: '4', expectedVersion: 1 }), request(designer))]);
    expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(await counts()).toEqual({ requirements: 1, revisions: 2, audits: 2, events: 2, receipts: 2 });
  });

  it('rolls back the current record and immutable history when event insertion fails', async () => {
    const failing = new RequirementIntakeService({ getPool: () => ({ connect: async () => {
      const tx = await pool.connect(); return { query: (sql: string, values?: any[]) => {
        if (/INSERT\s+INTO\s+outbox\b/i.test(sql)) throw new Error('Synthetic durable event outage');
        return tx.query(sql, values);
      }, release: () => tx.release() };
    } }) } as any);
    const before = await counts();
    await expect(failing.create(project, draft(), request())).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
  });

  it('rechecks revoked grant and changed role before returning a stored receipt', async () => {
    const req = request(designer); await service.create(project, draft(), req);
    await pool.query("UPDATE memberships SET role='finance',row_version=row_version+1 WHERE id=$1", [designer.membership]);
    await expect(service.create(project, draft(), req)).rejects.toMatchObject({ status: 403 });
    await pool.query("UPDATE memberships SET role='design_production',row_version=row_version+1 WHERE id=$1", [designer.membership]);
    await pool.query('UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=clock_timestamp() WHERE membership_id=$1', [designer.membership, manager.id]);
    await expect(service.create(project, draft(), req)).rejects.toMatchObject({ status: 404 });
  });
});
