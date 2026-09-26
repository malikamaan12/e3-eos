import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbPool } from '../packages/db/src/client.js';
import { AllocationRegisterService, validateAllocationDraft } from '../apps/api/src/scope/allocation-register.service.js';
import { RequirementIntakeService, requirementSnapshotHash } from '../apps/api/src/scope/requirement-intake.service.js';

// Runs in the parent's combined verification after migration 0024.
const pool = getDbPool(), database = { getPool: () => pool } as any;
type Actor = { id: string; membership: string; token: string; org: string };
const organisations: string[] = [], users: string[] = [];
let org: string, foreignOrg: string, project: string, secondProject: string;
let manager: Actor, designer: Actor, viewer: Actor, client: Actor, finance: Actor, unassigned: Actor;
let service: AllocationRegisterService, intake: RequirementIntakeService;
const request = (person = manager, key = randomUUID()) => ({ organisationId: person.org,
  headers: { authorization: `Bearer ${person.token}`, 'idempotency-key': key } }) as any;
const draft = (extra = {}) => ({ title: 'Synthetic accessible counter', originalWording: 'Provide accessible counters.', sourceType: 'manual', reason: 'Record scope note', ...extra });
async function organisation() {
  const id = randomUUID(); organisations.push(id);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [id, 'Synthetic allocation fixture', `ALLOC-${id}`]); return id;
}
async function actor(role: string, audience = 'internal') {
  const row = { id: randomUUID(), membership: randomUUID(), token: randomUUID(), org }; users.push(row.id);
  await pool.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [row.id, `${row.id}@example.test`, 'Synthetic allocation actor']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [row.membership, org, row.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,clock_timestamp()+INTERVAL '1 hour')", [row.id, row.token]); return row;
}
async function makeProject() {
  const id = randomUUID(); await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
    VALUES($1,$2,$3,'Synthetic allocation project','Test-only allocation planning','INTERNAL_IDEA',$4,$4,$4)`, [id, org, `ALLOC-${id}`, manager.id]); return id;
}
async function grant(person: Actor, level = 'editor', scope = project) {
  await pool.query(`INSERT INTO project_access_grants(organisation_id,project_id,membership_id,access_level,granted_by,reason)
    VALUES($1,$2,$3,$4,$5,'Synthetic allocation grant')`, [org, scope, person.membership, level, manager.id]);
}
async function requirement(extra = {}) { return (await intake.create(project, draft(extra), request())).data; }
const input = (source: any, extra = {}) => ({ requirementId: source.id, expectedRequirementVersion: source.rowVersion, reason: 'Plan the physical allocation', ...extra });
async function counts() {
  return (await pool.query(`SELECT (SELECT count(*)::int FROM requirement_allocations WHERE organisation_id=$1) allocations,
    (SELECT count(*)::int FROM requirement_allocation_revisions WHERE organisation_id=$1) revisions,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) events,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [org])).rows[0];
}
beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false'); org = await organisation(); foreignOrg = await organisation();
  manager = await actor('project_manager'); designer = await actor('design_production'); viewer = await actor('operations');
  client = await actor('client_user', 'client'); finance = await actor('finance'); unassigned = await actor('super_admin');
  project = await makeProject(); secondProject = await makeProject();
  await grant(manager); await grant(manager, 'editor', secondProject); await grant(designer); await grant(viewer, 'viewer'); await grant(client, 'viewer'); await grant(finance);
  service = new AllocationRegisterService(database); intake = new RequirementIntakeService(database);
});
afterEach(async () => {
  try {
    await pool.query('UPDATE requirement_allocations SET current_revision_id=NULL WHERE organisation_id=ANY($1::uuid[])', [organisations]);
    await pool.query('UPDATE requirements SET current_revision_id=NULL WHERE organisation_id=ANY($1::uuid[])', [organisations]);
    for (const table of ['requirement_allocation_revisions', 'requirement_allocations', 'requirement_revisions', 'requirements', 'idempotency_records', 'audit_events', 'outbox', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [organisations]);
  } finally { organisations.length = 0; users.length = 0; vi.unstubAllEnvs(); }
});

describe('Canonical allocation planning register', () => {
  it('records unknown quantity/location separately from explicit zero with immutable exact source pins', async () => {
    const source = await requirement(), first = (await service.create(project, input(source), request())).data;
    expect(first).toMatchObject({ requirementId: source.id, requirementVersion: 1, quantity: null, unit: null, location: null, zone: null,
      department: null, ownerId: null, status: 'draft', rowVersion: 1, revision: 1, staleSource: false, authorityEffect: 'planning_only' });
    const zero = (await service.create(project, input(source, { quantity: '0.000000', zone: 'A', department: 'Production' }), request(designer))).data;
    expect(zero).toMatchObject({ quantity: '0', unit: null, zone: 'A', department: 'Production', location: null });
    const stored = (await service.revisions(project, first.id, request())).data[0];
    expect(stored.snapshot).toMatchObject({ allocationId: first.id, requirementId: source.id, requirementVersion: 1, status: 'draft', authorityEffect: 'planning_only' });
    expect(stored.snapshotHash).toBe(requirementSnapshotHash(stored.snapshot)); expect(stored.snapshotIntegrityVerified).toBe(true);
  });
  it('rejects numeric rounding, invented authority fields and missing version contracts', async () => {
    const source = await requirement();
    for (const extra of [{ quantity: 0 }, { quantity: '-1' }, { quantity: '1e3' }, { quantity: '0.0000001' }, { status: 'approved' }, { completionPct: 100 }, { requiredDate: '2026-12-01' }, { expectedRequirementVersion: 0 }, { organisationId: foreignOrg }]) {
      expect(() => validateAllocationDraft(input(source, extra))).toThrow();
    }
    expect(() => validateAllocationDraft(input(source), true)).toThrow(); expect((await counts()).allocations).toBe(0);
  });
  it('does not derive business access from ownership, spoofed headers, audience or grants without permissions', async () => {
    const source = await requirement();
    await expect(service.list(project, { organisationId: org, headers: { 'x-user-role': 'super_admin' } } as any)).rejects.toMatchObject({ status: 401 });
    await expect(service.list(project, request(unassigned))).rejects.toMatchObject({ status: 404 });
    await expect(service.list(project, request(client))).rejects.toMatchObject({ status: 403 });
    await expect(service.list(project, request(finance))).rejects.toMatchObject({ status: 403 });
    expect((await service.list(project, request(viewer))).meta.capabilities.canCreateDraft).toBe(false);
    await expect(service.create(project, input(source), request(viewer))).rejects.toMatchObject({ status: 403 });
    const forged = request(); forged.organisationId = foreignOrg;
    await expect(service.list(project, forged)).rejects.toMatchObject({ status: 401 });
  });
  it('scopes requirements, details, history and owners to this project', async () => {
    const source = await requirement(), row = (await service.create(project, input(source), request())).data;
    await expect(service.create(secondProject, input(source), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.get(secondProject, row.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.revisions(secondProject, row.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.revise(secondProject, row.id, input(source, { expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.create(project, input(source, { ownerId: unassigned.id }), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.create(project, input(source, { ownerId: client.id }), request())).rejects.toMatchObject({ status: 404 });
    expect((await service.create(project, input(source, { ownerId: designer.id }), request())).data.ownerId).toBe(designer.id);
  });
  it('deduplicates concurrent identical commands and rejects key reuse for changed input', async () => {
    const source = await requirement(), req = request(designer), before = await counts();
    const [one, two] = await Promise.all([service.create(project, input(source), req), new AllocationRegisterService(database).create(project, input(source), req)]);
    expect(two).toEqual(one); expect(await counts()).toEqual({ allocations: 1, revisions: 1, audits: before.audits + 1, events: before.events + 1, receipts: before.receipts + 1 });
    await expect(service.create(project, input(source, { quantity: '2' }), req)).rejects.toMatchObject({ status: 409 });
    await pool.query('UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=clock_timestamp() WHERE membership_id=$1', [designer.membership, manager.id]);
    await expect(service.create(project, input(source), req)).rejects.toMatchObject({ status: 404 });
  });
  it('rechecks linked owner access before receipt replay', async () => {
    const source = await requirement(), req = request();
    await service.create(project, input(source, { ownerId: designer.id }), req);
    await pool.query('UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=clock_timestamp() WHERE membership_id=$1', [designer.membership, manager.id]);
    await expect(service.create(project, input(source, { ownerId: designer.id }), req)).rejects.toMatchObject({ status: 404 });
  });
  it('flags earlier source pins and requires deliberate current-source revision without rewriting earlier history', async () => {
    const source = await requirement({ quantity: '20', unit: 'counter' });
    const row = (await service.create(project, input(source, { quantity: '12', unit: 'counter', zone: 'A' }), request())).data;
    const old = (await service.revisions(project, row.id, request())).data[0];
    const changed = (await intake.revise(project, source.id, draft({ quantity: '22', unit: 'counter', expectedVersion: 1 }), request())).data;
    expect((await service.get(project, row.id, request())).data).toMatchObject({ staleSource: true, quantity: '12', requirementVersion: 1 });
    await expect(service.revise(project, row.id, input(source, { expectedVersion: 1, quantity: '14' }), request())).rejects.toMatchObject({ status: 409 });
    const command = request(), payload = input(changed, { expectedVersion: 1, quantity: '14', unit: 'counter', zone: 'A' });
    const revised = await service.revise(project, row.id, payload, command);
    expect(revised.data).toMatchObject({ id: row.id, requirementVersion: 2, rowVersion: 2, revision: 2, staleSource: false, quantity: '14' });
    expect(await service.revise(project, row.id, payload, command)).toEqual(revised);
    expect((await service.revisions(project, row.id, request())).data[1]).toEqual(old);
    await expect(pool.query("UPDATE requirement_allocation_revisions SET reason='Rewrite past' WHERE id=$1", [old.id])).rejects.toThrow('immutable');
  });
  it('cannot silently move allocation identity to another requirement or rewrite an out-of-history value', async () => {
    const source = await requirement(), other = await requirement({ title: 'Other obligation' }), row = (await service.create(project, input(source), request())).data;
    await expect(service.revise(project, row.id, input(other, { expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409, response: { code: 'ALLOCATION_REQUIREMENT_IMMUTABLE' } });
    await pool.query("UPDATE requirement_allocations SET quantity='8' WHERE id=$1", [row.id]);
    await expect(service.revise(project, row.id, input(source, { expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409, response: { code: 'ALLOCATION_HISTORY_CONFLICT' } });
  });
  it('rejects stale, approved, legacy or corrupted requirement sources', async () => {
    const source = await requirement();
    await expect(service.create(project, input(source, { expectedRequirementVersion: 2 }), request())).rejects.toMatchObject({ status: 409 });
    await pool.query("UPDATE requirements SET original_wording='Unrecorded alteration' WHERE id=$1", [source.id]);
    await expect(service.create(project, input(source), request())).rejects.toMatchObject({ status: 409, response: { code: 'ALLOCATION_REQUIREMENT_HISTORY_CONFLICT' } });
    const approved = await requirement(); await pool.query("UPDATE requirements SET is_approved=true,status='approved' WHERE id=$1", [approved.id]);
    await expect(service.create(project, input(approved), request())).rejects.toMatchObject({ status: 409 });
    const legacy = randomUUID(); await pool.query("INSERT INTO requirements(id,organisation_id,project_id,title,description) VALUES($1,$2,$3,'Legacy','Unverified source')", [legacy, org, project]);
    await expect(service.create(project, { requirementId: legacy, expectedRequirementVersion: 1, reason: 'Plan legacy' }, request())).rejects.toMatchObject({ status: 409 });
  });
  it('keeps legacy allocations visible but uneditable without inventing controlled history', async () => {
    const source = await requirement(), id = randomUUID();
    await pool.query("INSERT INTO requirement_allocations(id,organisation_id,project_id,requirement_id,quantity,unit,location,zone,status) VALUES($1,$2,$3,$4,7,'counter','Hall','A','accepted')", [id, org, project, source.id]);
    expect((await service.get(project, id, request())).data).toMatchObject({ provenanceState: 'legacy_unverified', status: 'legacy_unverified', canRevise: false });
    expect((await service.revisions(project, id, request())).data).toEqual([]);
    await expect(service.revise(project, id, input(source, { expectedVersion: 1 }), request())).rejects.toMatchObject({ status: 409 });
  });
  it('uses exact decimal arithmetic while quantity-basis applicability and incomplete comparisons stay unknown', async () => {
    const source = await requirement({ quantity: '9007199254740994.123456', unit: 'counter' });
    await service.create(project, input(source, { quantity: '9007199254740993.123456', unit: 'counter', department: 'Production', zone: 'A' }), request());
    await service.create(project, input(source, { quantity: '0.000001', unit: 'counter', department: 'Design', zone: 'B' }), request());
    let comparison = (await service.list(project, request())).meta.quantityComparisons[0];
    expect(comparison).toMatchObject({ knownAllocationQuantity: '9007199254740993.123457', arithmeticDifference: '0.999999', quantityBasis: 'unspecified', applicability: 'unknown', unitMismatchCount: 0, unknownQuantityCount: 0 });
    await service.create(project, input(source, { quantity: null, unit: 'counter' }), request());
    await service.create(project, input(source, { quantity: '3', unit: 'metre' }), request());
    comparison = (await service.list(project, request())).meta.quantityComparisons[0];
    expect(comparison).toMatchObject({ knownAllocationQuantity: '9007199254740993.123457', arithmeticDifference: null, unknownQuantityCount: 1, unitMismatchCount: 1, applicability: 'unknown' });
  });
  it('permits exactly one concurrent revision at an expected version', async () => {
    const source = await requirement(), row = (await service.create(project, input(source), request())).data, before = await counts();
    const result = await Promise.allSettled([service.revise(project, row.id, input(source, { expectedVersion: 1, quantity: '3' }), request()), service.revise(project, row.id, input(source, { expectedVersion: 1, quantity: '4' }), request(designer))]);
    expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1); expect(result.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(await counts()).toEqual({ ...before, revisions: before.revisions + 1, audits: before.audits + 1, events: before.events + 1, receipts: before.receipts + 1 });
  });
  it('rolls back row, revision, audit and receipt together when durable event insertion fails', async () => {
    const source = await requirement(), before = await counts();
    const failing = new AllocationRegisterService({ getPool: () => ({ connect: async () => {
      const tx = await pool.connect(); return { query: (sql: string, values?: any[]) => {
        if (/INSERT\s+INTO\s+outbox\b/i.test(sql)) throw new Error('Synthetic event outage'); return tx.query(sql, values);
      }, release: () => tx.release() };
    } }) } as any);
    await expect(failing.create(project, input(source), request())).rejects.toMatchObject({ status: 503 }); expect(await counts()).toEqual(before);
  });
});
