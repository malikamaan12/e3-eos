import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MembershipAdminService } from '../apps/api/src/identity/membership-admin.service.js';
import { MembershipAdminController } from '../apps/api/src/identity/membership-admin.controller.js';
import { IdentityController } from '../apps/api/src/identity/identity.controller.js';
import { TenantIsolationGuard, ALLOWED_AUDIENCES_KEY, REQUIRED_ROLES_KEY } from '../apps/api/src/common/tenant.guard.js';
import { getDbPool } from '../packages/db/src/client.js';

const pool = getDbPool();
const database = { getPool: () => pool } as any;
type Actor = { userId: string; membershipId: string; organisationId: string; token: string };
let organisationId: string;
let admin: Actor;
let target: Actor;
let service: MembershipAdminService;
let fetchSpy: ReturnType<typeof vi.fn>;
const ownedOrganisations: string[] = [];
const ownedUsers: string[] = [];

async function addOrganisation() {
  const id = randomUUID(); ownedOrganisations.push(id);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [id, 'Isolated membership administration tests', `MEM-ADMIN-${id}`]);
  return id;
}
async function addMember(role = 'operations', orgId = organisationId, audience = 'internal', globalAdmin = false): Promise<Actor> {
  const actor = { userId: randomUUID(), membershipId: randomUUID(), organisationId: orgId, token: randomUUID() };
  ownedUsers.push(actor.userId);
  await pool.query('INSERT INTO users(id,email,name,is_super_admin) VALUES($1,$2,$3,$4)', [actor.userId, `membership-${actor.userId}@example.test`, 'Isolated membership test identity', globalAdmin]);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [actor.membershipId, orgId, actor.userId, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [actor.userId, actor.token]);
  return actor;
}
function request(actor = admin, key = randomUUID(), orgId = actor.organisationId) {
  return { organisationId: orgId, userId: actor.userId, actorId: actor.userId, role: 'super_admin', isSuperAdmin: true,
    headers: { authorization: `Bearer ${actor.token}`, 'idempotency-key': key, 'x-user-role': 'super_admin' } } as any;
}
function roleBody(overrides: Record<string, unknown> = {}) { return { role: 'procurement', reason: 'Controlled staffing change', expectedVersion: 1, ...overrides }; }
function restoreBody(overrides: Record<string, unknown> = {}) { return { reason: 'Controlled return to work', expectedVersion: 1, ...overrides }; }
async function revokeFixture(actor = target) { await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [actor.membershipId]); }
async function addGrant(actor = target, isRevoked = false) {
  const projectId = randomUUID(), id = randomUUID();
  await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
    VALUES($1,$2,$3,'Isolated membership access fixture','No operational work','DIRECT_AWARD',$4,$4,$4)`,
  [projectId, actor.organisationId, `MEM-PROJECT-${projectId}`, admin.userId]);
  await pool.query(`INSERT INTO project_access_grants(id,organisation_id,project_id,membership_id,access_level,granted_by,reason,is_revoked,revoked_by,revoked_at)
    VALUES($1,$2,$3,$4,'viewer',$5,'Isolated retained grant',$6,$7,$8)`,
  [id, actor.organisationId, projectId, actor.membershipId, admin.userId, isRevoked, isRevoked ? admin.userId : null, isRevoked ? new Date() : null]);
  return { id, projectId };
}
async function snapshot(actor = target) {
  const membership = (await pool.query('SELECT role,audience,is_revoked,row_version,updated_at FROM memberships WHERE id=$1', [actor.membershipId])).rows[0];
  const counts = (await pool.query(`SELECT
    (SELECT count(*)::int FROM sessions WHERE user_id=$1) sessions,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$2) audit,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$2) events,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$2) receipts`, [actor.userId, actor.organisationId])).rows[0];
  const grants = (await pool.query('SELECT id,is_revoked,row_version,revoked_by,revoked_at,reason FROM project_access_grants WHERE membership_id=$1 ORDER BY id', [actor.membershipId])).rows;
  return { membership, ...counts, grants };
}
function failingService(statement: string) {
  return new MembershipAdminService({ getPool: () => ({ connect: async () => {
    const client = await pool.connect();
    return { query: (sql: string, values?: any[]) => {
      if (sql.includes(statement)) return Promise.reject(new Error('Injected isolated transactional failure'));
      return client.query(sql, values);
    }, release: () => client.release() };
  } }) } as any);
}
function guardContext(actor: Actor, token = actor.token, orgId = actor.organisationId) {
  return { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({
    headers: { authorization: `Bearer ${token}`, 'x-organisation-id': orgId },
  }) }) } as any;
}

beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  fetchSpy = vi.fn().mockRejectedValue(new Error('No external transport is allowed in membership tests'));
  vi.stubGlobal('fetch', fetchSpy);
  organisationId = await addOrganisation();
  admin = await addMember('super_admin');
  target = await addMember();
  service = new MembershipAdminService(database);
});
afterEach(async () => {
  try {
    for (const table of ['idempotency_records', 'outbox', 'audit_events', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [ownedOrganisations]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [ownedUsers]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [ownedUsers]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [ownedOrganisations]);
    expect((await pool.query('SELECT id FROM users WHERE id=ANY($1::uuid[])', [ownedUsers])).rows).toEqual([]);
    expect((await pool.query('SELECT id FROM organisations WHERE id=ANY($1::uuid[])', [ownedOrganisations])).rows).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    ownedOrganisations.length = 0; ownedUsers.length = 0;
    vi.unstubAllGlobals(); vi.unstubAllEnvs();
  }
});

describe('Controlled membership role change and restoration', () => {
  it('changes only the scoped ordinary role, increments its version, and appends durable audit/outbox/receipt', async () => {
    const grant = await addGrant();
    const foreignOrg = await addOrganisation();
    const foreignMembership = randomUUID();
    await pool.query("INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,'logistics','internal')", [foreignMembership, foreignOrg, target.userId]);
    const result = await service.changeRole(target.membershipId, roleBody(), request());
    expect(result.data).toMatchObject({ id: target.membershipId, organisationId, userId: target.userId, role: 'procurement', audience: 'internal',
      isRevoked: false, rowVersion: 2, status: 'role_changed', changedBy: admin.userId, requiresFreshSignIn: true, invalidatedSessionCount: 1, revokedProjectGrantCount: 0 });
    expect(await snapshot()).toMatchObject({ membership: { role: 'procurement', row_version: 2 }, audit: 1, events: 1, receipts: 1, sessions: 0,
      grants: [{ id: grant.id, is_revoked: false, row_version: 1 }] });
    expect((await pool.query('SELECT role,row_version,is_revoked FROM memberships WHERE id=$1', [foreignMembership])).rows)
      .toEqual([{ role: 'logistics', row_version: 1, is_revoked: false }]);
    const audit = (await pool.query('SELECT action,target_version,payload_digest FROM audit_events WHERE id=$1', [result.data.auditEventId])).rows[0];
    expect(audit).toMatchObject({ action: 'membership.role_changed', target_version: 2, payload_digest: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect((await pool.query('SELECT payload FROM outbox WHERE event_id=$1', [result.data.eventId])).rows[0].payload)
      .toMatchObject({ previousRole: 'operations', previousVersion: 1, reason: roleBody().reason, rowVersion: 2 });
  });

  it('restores the same membership but revokes old grants and requires fresh sign-in across organisations', async () => {
    const activeGrant = await addGrant(); const priorRevokedGrant = await addGrant(target, true);
    const otherOrg = await addOrganisation();
    await pool.query("INSERT INTO memberships(organisation_id,user_id,role,audience) VALUES($1,$2,'operations','internal')", [otherOrg, target.userId]);
    const otherToken = randomUUID();
    await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [target.userId, otherToken]);
    await revokeFixture();
    const result = await service.restore(target.membershipId, restoreBody(), request());
    expect(result.data).toMatchObject({ id: target.membershipId, status: 'restored', role: 'operations', rowVersion: 2,
      invalidatedSessionCount: 2, revokedProjectGrantCount: 1, requiresFreshSignIn: true });
    const grants = (await snapshot()).grants;
    expect(grants.find((grant) => grant.id === activeGrant.id)).toMatchObject({ is_revoked: true, row_version: 2, revoked_by: admin.userId });
    expect(grants.find((grant) => grant.id === priorRevokedGrant.id)).toMatchObject({ is_revoked: true, row_version: 1 });
    const guard = new TenantIsolationGuard(undefined, database);
    await expect(guard.canActivate(guardContext(target))).rejects.toMatchObject({ status: 401 });
    await expect(guard.canActivate(guardContext(target, otherToken, otherOrg))).rejects.toMatchObject({ status: 401 });
    const freshToken = randomUUID();
    await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [target.userId, freshToken]);
    await expect(guard.canActivate(guardContext(target, freshToken))).resolves.toBe(true);
  });

  it.each(['role', 'restore'] as const)('replays identical %s commands across instances without repeating effects or deleting fresh sessions', async (kind) => {
    if (kind === 'restore') await revokeFixture();
    const req = request(); const body = kind === 'role' ? roleBody() : restoreBody();
    const execute = (instance: MembershipAdminService) => kind === 'role'
      ? instance.changeRole(target.membershipId, body, req) : instance.restore(target.membershipId, body, req);
    const results = await Promise.all(Array.from({ length: 3 }, () => execute(new MembershipAdminService(database))));
    results.forEach((result) => expect(result).toEqual(results[0]));
    await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [target.userId, randomUUID()]);
    const before = await snapshot();
    expect(await execute(new MembershipAdminService(database))).toEqual(results[0]);
    expect(await snapshot()).toEqual(before);
    expect(before).toMatchObject({ audit: 1, events: 1, receipts: 1, sessions: 1 });
  });

  it('rejects changed body, version, operation or actor reusing a committed key', async () => {
    const key = randomUUID(); await service.changeRole(target.membershipId, roleBody(), request(admin, key));
    const secondAdmin = await addMember('super_admin');
    for (const body of [roleBody({ reason: 'Different reason' }), roleBody({ expectedVersion: 2 }), roleBody({ role: 'logistics' })]) {
      await expect(service.changeRole(target.membershipId, body, request(admin, key))).rejects.toMatchObject({ status: 409, response: { code: 'IDEMPOTENCY_CONFLICT' } });
    }
    await expect(service.changeRole(target.membershipId, roleBody(), request(secondAdmin, key))).rejects.toMatchObject({ status: 409 });
    await expect(service.restore(target.membershipId, restoreBody(), request(admin, key))).rejects.toMatchObject({ status: 409 });
    expect(await snapshot()).toMatchObject({ audit: 1, events: 1, receipts: 1 });
  });

  it('serializes different concurrent role commands so stale expectedVersion cannot overwrite the first change', async () => {
    const outcomes = await Promise.allSettled([
      service.changeRole(target.membershipId, roleBody(), request()),
      new MembershipAdminService(database).changeRole(target.membershipId, roleBody({ role: 'logistics' }), request()),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((outcomes.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason)
      .toMatchObject({ status: 409, response: { code: 'MEMBERSHIP_VERSION_CONFLICT' } });
    expect(await snapshot()).toMatchObject({ membership: { row_version: 2 }, audit: 1, events: 1, receipts: 1 });
  });

  it('consumes the version increment from revocation before restoration', async () => {
    await new IdentityController(database).revokeMembership(target.membershipId, request(), { reason: 'Versioned offboarding' });
    await expect(service.restore(target.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 409, response: { code: 'MEMBERSHIP_VERSION_CONFLICT' } });
    const result = await service.restore(target.membershipId, restoreBody({ expectedVersion: 2 }), request());
    expect(result.data).toMatchObject({ rowVersion: 3, status: 'restored' });
    expect((await snapshot()).audit).toBe(2);
  });

  it('hides foreign membership IDs and never changes another organisation through request fields', async () => {
    const foreign = await addMember('operations', await addOrganisation());
    const before = await snapshot(foreign);
    await expect(service.changeRole(foreign.membershipId, roleBody(), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.restore(foreign.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.changeRole(foreign.membershipId, roleBody(), request(admin, randomUUID(), foreign.organisationId))).rejects.toMatchObject({ status: 401 });
    expect(await snapshot(foreign)).toEqual(before);
  });

  it.each(['demoted', 'revoked', 'expired', 'external'] as const)('rejects %s issuer authority even for a prior command receipt', async (state) => {
    const req = request(); await service.changeRole(target.membershipId, roleBody(), req);
    if (state === 'demoted') await pool.query("UPDATE memberships SET role='operations' WHERE id=$1", [admin.membershipId]);
    if (state === 'revoked') await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [admin.membershipId]);
    if (state === 'expired') await pool.query("UPDATE sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id=$1", [admin.userId]);
    if (state === 'external') await pool.query("UPDATE memberships SET audience='client' WHERE id=$1", [admin.membershipId]);
    const before = await snapshot();
    await expect(service.changeRole(target.membershipId, roleBody(), req)).rejects.toMatchObject({ status: ['revoked', 'expired'].includes(state) ? 401 : 403 });
    expect(await snapshot()).toEqual(before);
  });

  it('does not accept role flags, a forged actor ID or the global admin flag of an external membership', async () => {
    const forged = request(target); forged.actorId = admin.userId; forged.userId = admin.userId;
    const before = await snapshot();
    await expect(service.changeRole(target.membershipId, roleBody(), forged)).rejects.toMatchObject({ status: 403 });
    const externalAdmin = await addMember('super_admin', organisationId, 'client', true);
    await expect(service.restore(target.membershipId, restoreBody(), request(externalAdmin))).rejects.toMatchObject({ status: 403 });
    expect(await snapshot()).toEqual(before);
  });

  it('prohibits self changes and all privileged target changes or promotions', async () => {
    await expect(service.changeRole(admin.membershipId, roleBody(), request())).rejects.toMatchObject({ status: 403, response: { code: 'SELF_MEMBERSHIP_CHANGE_FORBIDDEN' } });
    await expect(service.restore(admin.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 403 });
    for (const role of ['super_admin', 'executive']) {
      await expect(service.changeRole(target.membershipId, roleBody({ role }), request())).rejects.toMatchObject({ status: 403 });
      const privileged = await addMember(role);
      await expect(service.changeRole(privileged.membershipId, roleBody(), request())).rejects.toMatchObject({ status: 403 });
      await revokeFixture(privileged);
      await expect(service.restore(privileged.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 403 });
    }
    const flagged = await addMember('operations', organisationId, 'internal', true);
    await expect(service.changeRole(flagged.membershipId, roleBody(), request())).rejects.toMatchObject({ status: 403 });
    expect(await snapshot()).toMatchObject({ audit: 0, events: 0, receipts: 0 });
  });

  it('forbids role changes across audiences and fails closed on inconsistent legacy audience data', async () => {
    await expect(service.changeRole(target.membershipId, roleBody({ role: 'client_user' }), request())).rejects.toMatchObject({ status: 403 });
    const client = await addMember('client_user', organisationId, 'client');
    await expect(service.changeRole(client.membershipId, roleBody(), request())).rejects.toMatchObject({ status: 403 });
    await pool.query("UPDATE memberships SET audience='supplier',is_revoked=true WHERE id=$1", [target.membershipId]);
    await expect(service.restore(target.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 403 });
    expect(await snapshot()).toMatchObject({ audit: 0, events: 0, receipts: 0 });
  });

  it('rejects no-op, revoked role change, active restoration and stale versions without writing', async () => {
    const before = await snapshot();
    await expect(service.changeRole(target.membershipId, roleBody({ role: 'operations' }), request())).rejects.toMatchObject({ status: 409 });
    await expect(service.changeRole(target.membershipId, roleBody({ expectedVersion: 2 }), request())).rejects.toMatchObject({ status: 409 });
    await expect(service.restore(target.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 409 });
    expect(await snapshot()).toEqual(before);
    await revokeFixture();
    await expect(service.changeRole(target.membershipId, roleBody(), request())).rejects.toMatchObject({ status: 409 });
  });

  it.each(['INSERT INTO audit_events', 'INSERT INTO outbox', 'INSERT INTO idempotency_records', 'DELETE FROM sessions'])
  ('rolls back role/version/session changes when %s fails', async (statement) => {
    const before = await snapshot(); const req = request();
    await expect(failingService(statement).changeRole(target.membershipId, roleBody(), req)).rejects.toMatchObject({ status: 503 });
    expect(await snapshot()).toEqual(before);
    await expect(service.changeRole(target.membershipId, roleBody(), req)).resolves.toMatchObject({ data: { rowVersion: 2 } });
  });

  it.each(['UPDATE project_access_grants', 'INSERT INTO audit_events', 'INSERT INTO outbox', 'INSERT INTO idempotency_records'])
  ('rolls back restoration, old grants and sessions when %s fails', async (statement) => {
    await addGrant(); await revokeFixture(); const before = await snapshot();
    await expect(failingService(statement).restore(target.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 503 });
    expect(await snapshot()).toEqual(before);
  });

  it('validates positive integer versions, bounded reason/key and an actual session before mutation', async () => {
    const before = await snapshot();
    for (const expectedVersion of [0, -1, 1.5, '1', undefined, Number.NaN]) {
      await expect(service.changeRole(target.membershipId, roleBody({ expectedVersion }), request())).rejects.toMatchObject({ status: 400 });
    }
    for (const reason of ['', ' ', 'x'.repeat(2001)]) {
      await expect(service.restore(target.membershipId, restoreBody({ reason }), request())).rejects.toMatchObject({ status: 400 });
    }
    await expect(service.changeRole(target.membershipId, roleBody({ role: 'invented_role' }), request())).rejects.toMatchObject({ status: 400 });
    for (const key of ['', 'x'.repeat(201)]) await expect(service.changeRole(target.membershipId, roleBody(), request(admin, key))).rejects.toMatchObject({ status: 400 });
    const noSession = request(); delete noSession.headers.authorization;
    await expect(service.changeRole(target.membershipId, roleBody(), noSession)).rejects.toMatchObject({ status: 401 });
    expect(await snapshot()).toEqual(before);
  });

  it('fails closed when storage cannot be reached', async () => {
    const unavailable = new MembershipAdminService({ getPool: () => ({ connect: vi.fn().mockRejectedValue(new Error('Unavailable')) }) } as any);
    await expect(unavailable.restore(target.membershipId, restoreBody(), request())).rejects.toMatchObject({ status: 503 });
  });

  it('marks controller commands as internal Super Admin operations', () => {
    for (const handler of [MembershipAdminController.prototype.changeRole, MembershipAdminController.prototype.restore]) {
      expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual(['super_admin']);
      expect(Reflect.getMetadata(ALLOWED_AUDIENCES_KEY, handler)).toEqual(['internal']);
    }
  });
});
