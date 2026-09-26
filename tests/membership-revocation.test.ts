import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { IdentityController } from '../apps/api/src/identity/identity.controller.js';
import { TenantIsolationGuard } from '../apps/api/src/common/tenant.guard.js';
import { getDbPool } from '../packages/db/src/client.js';

const pool = getDbPool();
type Actor = { userId: string; membershipId: string; token: string };
let organisationId: string;
let admin: Actor;
let secondAdmin: Actor;
let worker: Actor;
const ownedOrganisations: string[] = [];
const ownedUsers: string[] = [];
const database = { getPool: () => pool } as any;

async function addMember(role: string, audience = 'internal', isSuperAdmin = false, orgId = organisationId): Promise<Actor> {
  const userId = randomUUID();
  const membershipId = randomUUID();
  const token = randomUUID();
  ownedUsers.push(userId);
  await pool.query('INSERT INTO users (id, email, name, is_super_admin) VALUES ($1, $2, $3, $4)',
    [userId, `revocation-${userId}@example.test`, 'Isolated revocation test identity', isSuperAdmin]);
  await pool.query('INSERT INTO memberships (id, organisation_id, user_id, role, audience) VALUES ($1, $2, $3, $4, $5)',
    [membershipId, orgId, userId, role, audience]);
  await pool.query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')", [userId, token]);
  return { userId, membershipId, token };
}

function request(actor = admin, key = randomUUID()) {
  return { userId: actor.userId, actorId: actor.userId, organisationId, role: 'super_admin', isSuperAdmin: true,
    headers: { authorization: `Bearer ${actor.token}`, 'idempotency-key': key } } as any;
}

async function counts(targetId = worker.membershipId) {
  const status = await pool.query('SELECT is_revoked FROM memberships WHERE id = $1', [targetId]);
  const audit = await pool.query("SELECT count(*)::int AS count FROM audit_events WHERE organisation_id=$1 AND action='membership.revoke'", [organisationId]);
  const events = await pool.query("SELECT count(*)::int AS count FROM outbox WHERE organisation_id=$1 AND event_type='membership.revoked.v1'", [organisationId]);
  const receipts = await pool.query('SELECT count(*)::int AS count FROM idempotency_records WHERE organisation_id=$1', [organisationId]);
  return { revoked: status.rows[0].is_revoked, audit: audit.rows[0].count, events: events.rows[0].count, receipts: receipts.rows[0].count };
}

beforeEach(async () => {
  organisationId = randomUUID();
  ownedOrganisations.push(organisationId);
  await pool.query('INSERT INTO organisations (id, name, code) VALUES ($1, $2, $3)',
    [organisationId, 'Isolated P00 revocation tests', `REV-${organisationId}`]);
  admin = await addMember('super_admin');
  secondAdmin = await addMember('super_admin');
  worker = await addMember('operations');
});

afterEach(async () => {
  // Only UUIDs created by this test are removed; seeded/user organisations are untouched.
  for (const orgId of ownedOrganisations.splice(0)) {
    await pool.query('DELETE FROM idempotency_records WHERE organisation_id=$1', [orgId]);
    await pool.query('DELETE FROM outbox WHERE organisation_id=$1', [orgId]);
    await pool.query('DELETE FROM audit_events WHERE organisation_id=$1', [orgId]);
    await pool.query('DELETE FROM memberships WHERE organisation_id=$1', [orgId]);
    await pool.query('DELETE FROM organisations WHERE id=$1', [orgId]);
  }
  for (const userId of ownedUsers.splice(0)) {
    await pool.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
    await pool.query('DELETE FROM users WHERE id=$1', [userId]);
  }
});

describe('P00 durable scoped membership revocation', () => {
  it('atomically revokes the actual membership, appends audit/outbox and records a durable receipt', async () => {
    const controller = new IdentityController(database);
    const result = await controller.revokeMembership(worker.membershipId, request(), { reason: 'Access no longer required.' });
    expect(result.data).toMatchObject({ id: worker.membershipId, organisationId, userId: worker.userId,
      status: 'revoked', isRevoked: true, revokedBy: admin.userId });
    expect(await counts()).toEqual({ revoked: true, audit: 1, events: 1, receipts: 1 });
    const event = await pool.query('SELECT payload FROM outbox WHERE event_id=$1', [result.data.eventId]);
    expect(event.rows[0].payload).toMatchObject({ reason: 'Access no longer required.', auditEventId: result.data.auditEventId });
    const guard = new TenantIsolationGuard(undefined, database);
    await expect(guard.canActivate({ getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({
      headers: { authorization: `Bearer ${worker.token}`, 'x-organisation-id': organisationId },
    }) }) } as any)).rejects.toMatchObject({ status: 401 });
  });

  it('replays the exact receipt across controller instances without repeating audit or events', async () => {
    const req = request();
    const first = await new IdentityController(database).revokeMembership(worker.membershipId, req, { reason: 'Offboarding.' });
    const replay = await new IdentityController(database).revokeMembership(worker.membershipId, req, { reason: 'Offboarding.' });
    expect(replay).toEqual(first);
    expect(await counts()).toEqual({ revoked: true, audit: 1, events: 1, receipts: 1 });
  });

  it('serializes simultaneous retries from independent controller instances', async () => {
    const req = request();
    const results = await Promise.all(Array.from({ length: 4 }, () =>
      new IdentityController(database).revokeMembership(worker.membershipId, req, { reason: 'Duplicate network delivery.' })));
    results.forEach((result) => expect(result).toEqual(results[0]));
    expect(await counts()).toEqual({ revoked: true, audit: 1, events: 1, receipts: 1 });
  });

  it('rejects a different reason or actor reusing the same key', async () => {
    const key = randomUUID();
    const controller = new IdentityController(database);
    await controller.revokeMembership(worker.membershipId, request(admin, key), { reason: 'Original reason.' });
    await expect(controller.revokeMembership(worker.membershipId, request(admin, key), { reason: 'Different reason.' }))
      .rejects.toMatchObject({ status: 409, response: { code: 'IDEMPOTENCY_CONFLICT' } });
    await expect(controller.revokeMembership(worker.membershipId, request(secondAdmin, key), { reason: 'Original reason.' }))
      .rejects.toMatchObject({ status: 409, response: { code: 'IDEMPOTENCY_CONFLICT' } });
    expect(await counts()).toEqual({ revoked: true, audit: 1, events: 1, receipts: 1 });
  });

  it('rejects unknown and foreign-organisation targets with the same non-leaking response', async () => {
    const foreignOrg = randomUUID();
    ownedOrganisations.push(foreignOrg);
    await pool.query('INSERT INTO organisations (id, name, code) VALUES ($1,$2,$3)', [foreignOrg, 'Other isolated organisation', `REV-${foreignOrg}`]);
    const foreign = await addMember('operations', 'internal', false, foreignOrg);
    for (const id of [randomUUID(), foreign.membershipId]) {
      await expect(new IdentityController(database).revokeMembership(id, request(), { reason: 'Target scope test.' }))
        .rejects.toMatchObject({ status: 404, response: { code: 'MEMBERSHIP_NOT_FOUND' } });
    }
    expect(await counts()).toEqual({ revoked: false, audit: 0, events: 0, receipts: 0 });
  });

  it('does not accept forged request authority for a current non-admin session', async () => {
    const forged = request(worker);
    forged.headers['x-is-super-admin'] = 'true';
    forged.headers['x-user-role'] = 'super_admin';
    await expect(new IdentityController(database).revokeMembership(secondAdmin.membershipId, forged, { reason: 'Forged authority.' }))
      .rejects.toMatchObject({ status: 403 });
    expect(await counts(secondAdmin.membershipId)).toEqual({ revoked: false, audit: 0, events: 0, receipts: 0 });
  });

  it('rejects an external audience even if its user has a Super Admin flag', async () => {
    const client = await addMember('super_admin', 'client', true);
    await expect(new IdentityController(database).revokeMembership(worker.membershipId, request(client), { reason: 'External authority.' }))
      .rejects.toMatchObject({ status: 403 });
  });

  it('allows a current internal Super Admin flag with a non-admin membership role', async () => {
    const flagged = await addMember('operations', 'internal', true);
    await expect(new IdentityController(database).revokeMembership(worker.membershipId, request(flagged), { reason: 'Assigned platform authority.' }))
      .resolves.toMatchObject({ data: { isRevoked: true } });
  });

  it('blocks self-revocation and revoking the last administrator', async () => {
    const controller = new IdentityController(database);
    await expect(controller.revokeMembership(admin.membershipId, request(), { reason: 'Self revocation.' }))
      .rejects.toMatchObject({ status: 409, response: { code: 'SELF_REVOCATION_PROHIBITED' } });
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [secondAdmin.membershipId]);
    await expect(controller.revokeMembership(admin.membershipId, request(), { reason: 'Last administrator.' }))
      .rejects.toMatchObject({ status: 409, response: { code: 'LAST_ADMIN_REVOCATION_PROHIBITED' } });
    expect(await counts(admin.membershipId)).toEqual({ revoked: false, audit: 0, events: 0, receipts: 0 });
  });

  it('serializes opposing administrator revocations so a revoked authorizer cannot continue', async () => {
    const results = await Promise.allSettled([
      new IdentityController(database).revokeMembership(secondAdmin.membershipId, request(admin), { reason: 'Concurrent admin A command.' }),
      new IdentityController(database).revokeMembership(admin.membershipId, request(secondAdmin), { reason: 'Concurrent admin B command.' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 401 });
    const remaining = await pool.query("SELECT count(*)::int AS count FROM memberships WHERE organisation_id=$1 AND role='super_admin' AND NOT is_revoked", [organisationId]);
    expect(remaining.rows[0].count).toBe(1);
    expect((await counts()).audit).toBe(1);
  });

  it('rechecks authorizer membership after an in-flight external revocation transaction', async () => {
    const lock = await pool.connect();
    try {
      await lock.query('BEGIN');
      await lock.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [admin.membershipId]);
      const pending = new IdentityController(database).revokeMembership(worker.membershipId, request(), { reason: 'Racing stale authorizer.' });
      const assertion = expect(pending).rejects.toMatchObject({ status: 401 });
      await lock.query('COMMIT');
      await assertion;
      expect(await counts()).toEqual({ revoked: false, audit: 0, events: 0, receipts: 0 });
    } finally {
      await lock.query('ROLLBACK');
      lock.release();
    }
  });

  it.each(['INSERT INTO audit_events', 'INSERT INTO outbox', 'INSERT INTO idempotency_records'])
  ('rolls back the revocation if %s fails', async (failingStatement) => {
    const failingDatabase = { getPool: () => ({ connect: async () => {
      const client = await pool.connect();
      return { query: (sql: string, parameters?: any[]) => {
        if (sql.includes(failingStatement)) return Promise.reject(new Error('Injected persistence failure'));
        return client.query(sql, parameters);
      }, release: () => client.release() };
    } }) } as any;
    const req = request();
    await expect(new IdentityController(failingDatabase).revokeMembership(worker.membershipId, req, { reason: 'Atomic failure test.' }))
      .rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual({ revoked: false, audit: 0, events: 0, receipts: 0 });
    await expect(new IdentityController(database).revokeMembership(worker.membershipId, req, { reason: 'Atomic failure test.' }))
      .resolves.toMatchObject({ data: { isRevoked: true } });
  });

  it('requires reason, command key and current session before writing', async () => {
    const controller = new IdentityController(database);
    await expect(controller.revokeMembership(worker.membershipId, request(), { reason: '   ' })).rejects.toMatchObject({ status: 400 });
    const noKey = request();
    delete noKey.headers['idempotency-key'];
    await expect(controller.revokeMembership(worker.membershipId, noKey, { reason: 'Missing key.' })).rejects.toMatchObject({ status: 400 });
    const noSession = request();
    delete noSession.headers.authorization;
    await expect(controller.revokeMembership(worker.membershipId, noSession, { reason: 'No current session.' })).rejects.toMatchObject({ status: 401 });
    expect(await counts()).toEqual({ revoked: false, audit: 0, events: 0, receipts: 0 });
  });

  it('fails closed when the database is unavailable', async () => {
    const unavailable = { getPool: () => ({ connect: vi.fn().mockRejectedValue(new Error('unavailable')) }) } as any;
    await expect(new IdentityController(unavailable).revokeMembership(worker.membershipId, request(), { reason: 'Unavailable database.' }))
      .rejects.toMatchObject({ status: 503 });
  });

  it('returns actual canonical role permissions from the verified request identity', () => {
    const result = new IdentityController(database).getMe({ userId: worker.userId, organisationId,
      audience: 'internal', role: 'operations', isSuperAdmin: false } as any);
    expect(result.data.roles).toEqual(['operations']);
    expect(result.data.permissions).not.toContain('configuration_author');
    expect(result.data.permissions).not.toContain('*');
    expect(result.data.permissions.length).toBeGreaterThan(0);
  });

  it('returns the committed revocation through scoped durable audit history with metadata only', async () => {
    const controller = new IdentityController(database);
    const revoked = await controller.revokeMembership(worker.membershipId, request(), { reason: 'Private offboarding reason.' });
    const history = await controller.getAuditEvents(request());
    expect(history.data).toHaveLength(1);
    expect(history.data[0]).toMatchObject({ id: revoked.data.auditEventId, organisationId, action: 'membership.revoke',
      targetType: 'membership', targetId: worker.membershipId, actorId: admin.userId });
    expect(history.data[0].payloadDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(history)).not.toContain('Private offboarding reason.');
    const otherOrg = randomUUID();
    ownedOrganisations.push(otherOrg);
    await pool.query('INSERT INTO organisations (id,name,code) VALUES ($1,$2,$3)', [otherOrg, 'Other audit test organisation', `REV-${otherOrg}`]);
    const otherAdmin = await addMember('super_admin', 'internal', false, otherOrg);
    const otherRequest = request(otherAdmin);
    otherRequest.organisationId = otherOrg;
    expect((await controller.getAuditEvents(otherRequest)).data).toEqual([]);
    otherRequest.organisationId = organisationId;
    await expect(controller.getAuditEvents(otherRequest)).rejects.toMatchObject({ status: 401 });
  });

  it('requires current internal administrative authority to read audit events', async () => {
    const controller = new IdentityController(database);
    await expect(controller.getAuditEvents(request(worker))).rejects.toMatchObject({ status: 403 });
    const externalAdmin = await addMember('super_admin', 'client', true);
    await expect(controller.getAuditEvents(request(externalAdmin))).rejects.toMatchObject({ status: 403 });
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [admin.membershipId]);
    await expect(controller.getAuditEvents(request(admin))).rejects.toMatchObject({ status: 401 });
  });

  it('rejects incomplete controlled invitations without phantom audit records', async () => {
    const controller = new IdentityController(database);
    await expect(controller.createInvitation({ email: 'not-created@example.test', role: 'operations' }, request()))
      .rejects.toMatchObject({ status: 400, response: { code: 'VALIDATION_ERROR' } });
    expect((await controller.getAuditEvents(request())).data).toEqual([]);
    expect(await counts()).toEqual({ revoked: false, audit: 0, events: 0, receipts: 0 });
  });
});
