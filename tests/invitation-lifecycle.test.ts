import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { InvitationService } from '../apps/api/src/identity/invitation.service.js';
import { getDbPool } from '../packages/db/src/client.js';
import { hashPassword, verifyPassword } from '../packages/db/src/auth-crypto.js';

const pool = getDbPool();
const deliveryKey = Buffer.alloc(32, 71);
const database = { getPool: () => pool } as any;
const password = 'IsolatedInvitePassword!2026';
type Actor = { id: string; membershipId: string; organisationId: string; token: string; email: string };
let organisationId: string;
let admin: Actor;
let service: InvitationService;
let fetchSpy: ReturnType<typeof vi.fn>;
const ownedOrganisations: string[] = [];
const ownedUsers: string[] = [];
const ownedEmails: string[] = [];

async function addOrganisation() {
  const id = randomUUID(); ownedOrganisations.push(id);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [id, 'Isolated invitation lifecycle test', `INV-TEST-${id}`]);
  return id;
}
function email() { const value = `invitation-${randomUUID()}@example.test`; ownedEmails.push(value); return value; }
async function addActor(role = 'super_admin', orgId = organisationId, audience = 'internal', globalAdmin = false): Promise<Actor> {
  const actor = { id: randomUUID(), membershipId: randomUUID(), organisationId: orgId, token: randomUUID(), email: email() };
  ownedUsers.push(actor.id);
  await pool.query('INSERT INTO users(id,email,name,is_super_admin) VALUES($1,$2,$3,$4)', [actor.id, actor.email, 'Original isolated account name', globalAdmin]);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [actor.membershipId, orgId, actor.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [actor.id, actor.token]);
  return actor;
}
function request(actor = admin, key = randomUUID(), orgId = actor.organisationId) {
  return { actorId: actor.id, userId: actor.id, organisationId: orgId, role: 'super_admin', isSuperAdmin: true,
    headers: { authorization: `Bearer ${actor.token}`, 'idempotency-key': key, 'x-organisation-id': orgId } } as any;
}
function acceptanceRequest(key = randomUUID(), actor?: Actor) {
  return { headers: { 'idempotency-key': key, ...(actor ? { authorization: `Bearer ${actor.token}` } : {}) } } as any;
}
function body(targetEmail = email(), role = 'operations') {
  return { email: targetEmail, name: 'Invited test operator', role, reason: 'Isolated acceptance verification.' };
}
async function tokenFor(invitation: any) {
  const row = await pool.query('SELECT payload FROM outbox WHERE event_id=$1 AND organisation_id=$2', [invitation.deliveryEventId, invitation.organisationId]);
  expect(row.rows).toHaveLength(1);
  const encrypted = row.rows[0].payload.encryptedDelivery;
  expect(encrypted.algorithm).toBe('aes-256-gcm');
  const decipher = createDecipheriv('aes-256-gcm', deliveryKey, Buffer.from(encrypted.iv, 'base64'));
  decipher.setAAD(Buffer.from(`${invitation.organisationId}:${invitation.id}`));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext).token as string;
}
async function create(targetEmail = email(), role = 'operations') {
  const result = await service.create(body(targetEmail, role), request());
  return { result, token: await tokenFor(result.data), targetEmail };
}
async function snapshot(orgId = organisationId) {
  const result = await pool.query(`SELECT
    (SELECT count(*)::int FROM user_invitations WHERE organisation_id=$1) invitations,
    (SELECT count(*)::int FROM memberships WHERE organisation_id=$1) memberships,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audit,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) outbox,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [orgId]);
  return result.rows[0];
}
function failInsert(table: string) {
  return new InvitationService({ getPool: () => ({ query: (sql: string, params?: any[]) => pool.query(sql, params), connect: async () => {
    const client = await pool.connect();
    return { query: (sql: string, params?: any[]) => {
      if (new RegExp(`INSERT\\s+INTO\\s+${table}\\b`, 'i').test(sql)) throw new Error('Injected transactional fixture failure');
      return client.query(sql, params);
    }, release: () => client.release() };
  } }) } as any);
}

beforeEach(async () => {
  vi.stubEnv('EOS_INVITATION_DELIVERY_KEY', deliveryKey.toString('base64'));
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  vi.stubEnv('EMAIL_PROVIDER', 'durable_outbox');
  fetchSpy = vi.fn().mockRejectedValue(new Error('External delivery is prohibited in these tests'));
  vi.stubGlobal('fetch', fetchSpy);
  organisationId = await addOrganisation();
  admin = await addActor();
  service = new InvitationService(database);
});

afterEach(async () => {
  // Delete only UUIDs/emails generated by this test; no seeded account or shared
  // organisation is altered. Newly accepted users are discovered by owned email.
  try {
    const created = await pool.query('SELECT id FROM users WHERE email=ANY($1::text[])', [ownedEmails]);
    const users = [...new Set([...ownedUsers, ...created.rows.map((r: any) => r.id)])];
    for (const table of ['idempotency_records', 'outbox', 'audit_events', 'user_invitations', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [ownedOrganisations]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM accounts WHERE user_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [ownedOrganisations]);
    expect((await pool.query('SELECT id FROM users WHERE id=ANY($1::uuid[])', [users])).rows).toEqual([]);
    expect((await pool.query('SELECT id FROM organisations WHERE id=ANY($1::uuid[])', [ownedOrganisations])).rows).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    ownedOrganisations.length = 0; ownedUsers.length = 0; ownedEmails.length = 0;
    vi.unstubAllGlobals(); vi.unstubAllEnvs();
  }
});

describe('Controlled invitation lifecycle with real PostgreSQL transactions', () => {
  it('creates pending invitation/audit/delivery/receipt atomically without a user or membership', async () => {
    const before = await snapshot();
    const { result, token, targetEmail } = await create();
    expect(result.data).toMatchObject({ organisationId, email: targetEmail, role: 'operations', audience: 'internal', status: 'pending', deliveryStatus: 'queued' });
    const rows = await pool.query('SELECT token,token_hash,accepted_at FROM user_invitations WHERE id=$1', [result.data.id]);
    expect(rows.rows[0]).toMatchObject({ token: null, token_hash: createHash('sha256').update(token).digest('hex'), accepted_at: null });
    expect((await pool.query('SELECT id FROM users WHERE email=$1', [targetEmail])).rows).toHaveLength(0);
    const after = await snapshot();
    expect(after).toMatchObject({ invitations: before.invitations + 1, memberships: before.memberships, audit: before.audit + 1, receipts: before.receipts + 1 });
    expect(after.outbox).toBeGreaterThan(before.outbox);
    expect(JSON.stringify(result)).not.toContain(token);
    const delivery = await pool.query('SELECT payload FROM outbox WHERE organisation_id=$1', [organisationId]);
    expect(JSON.stringify(delivery.rows)).not.toContain(token);
    expect((await service.inspect({ token })).data).toMatchObject({ id: result.data.id, requiresExistingSignIn: false });
  });

  it('rolls back invitation and audit when delivery persistence fails', async () => {
    const before = await snapshot();
    await expect(failInsert('outbox').create(body(), request())).rejects.toMatchObject({ status: 503 });
    expect(await snapshot()).toEqual(before);
  });

  it('fails closed without delivery encryption, required reason, or a stable command key', async () => {
    const before = await snapshot();
    vi.stubEnv('EOS_INVITATION_DELIVERY_KEY', '');
    await expect(service.create(body(), request())).rejects.toMatchObject({ status: 503, response: { code: 'INVITATION_DELIVERY_UNAVAILABLE' } });
    vi.stubEnv('EOS_INVITATION_DELIVERY_KEY', deliveryKey.toString('base64'));
    await expect(service.create({ ...body(), reason: ' ' }, request())).rejects.toMatchObject({ status: 400 });
    await expect(service.create(body(), request(admin, ''))).rejects.toMatchObject({ status: 400 });
    await expect(service.create(body(), request(admin, 'x'.repeat(201)))).rejects.toMatchObject({ status: 400 });
    expect(await snapshot()).toEqual(before);
  });

  it('replays the identical creation receipt across instances and concurrent requests without duplicating effects', async () => {
    const payload = body(); const req = request();
    const results = await Promise.all(Array.from({ length: 3 }, () => new InvitationService(database).create(payload, req)));
    results.forEach((result) => expect(result).toEqual(results[0]));
    const before = await snapshot();
    expect(await new InvitationService(database).create(payload, req)).toEqual(results[0]);
    expect(await snapshot()).toEqual(before);
    expect(before.invitations).toBe(1);
  });

  it('rejects a reused creation key with changed content or another current administrator', async () => {
    const payload = body(); const key = randomUUID();
    await service.create(payload, request(admin, key));
    const secondAdmin = await addActor();
    await expect(service.create({ ...payload, reason: 'Changed reason' }, request(admin, key))).rejects.toMatchObject({ status: 409 });
    await expect(service.create(payload, request(secondAdmin, key))).rejects.toMatchObject({ status: 409 });
  });

  it('requires current issuer authority even when replaying an existing creation receipt', async () => {
    const payload = body(); const req = request();
    await service.create(payload, req);
    await pool.query("UPDATE memberships SET role='operations' WHERE id=$1", [admin.membershipId]);
    const before = await snapshot();
    await expect(new InvitationService(database).create(payload, req)).rejects.toMatchObject({ status: 403 });
    expect(await snapshot()).toEqual(before);
  });

  it.each(['super_admin', 'executive'])('rejects privileged role %s without creating an invitation', async (role) => {
    const before = await snapshot();
    await expect(service.create(body(email(), role), request())).rejects.toMatchObject({ status: 403 });
    expect(await snapshot()).toEqual(before);
  });

  it('rejects forged request claims, revoked current authority, and external audience authority', async () => {
    const worker = await addActor('operations');
    await expect(service.create(body(), request(worker))).rejects.toMatchObject({ status: 403 });
    const external = await addActor('super_admin', organisationId, 'client', true);
    await expect(service.create(body(), request(external))).rejects.toMatchObject({ status: 403 });
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [admin.membershipId]);
    await expect(service.create(body(), request())).rejects.toMatchObject({ status: 401 });
    expect((await snapshot()).invitations).toBe(0);
  });

  it('scopes listing and cancellation to the verified organisation and hides foreign invitations', async () => {
    const own = await create();
    const foreignOrg = await addOrganisation(); const foreignAdmin = await addActor('super_admin', foreignOrg);
    const foreign = await service.create(body(), request(foreignAdmin));
    const listed = await service.list(request());
    expect(JSON.stringify(listed)).toContain(own.result.data.id);
    expect(JSON.stringify(listed)).not.toContain(foreign.data.id);
    await expect(service.cancel(foreign.data.id, { reason: 'Wrong organisation' }, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.list(request(admin, randomUUID(), foreignOrg))).rejects.toMatchObject({ status: 401 });
  });

  it('cancels pending invitations idempotently and blocks their inspection and acceptance', async () => {
    const { result, token } = await create(); const req = request();
    const cancelled = await service.cancel(result.data.id, { reason: 'Invitation no longer needed' }, req);
    expect(cancelled.data).toMatchObject({ id: result.data.id, status: 'cancelled' });
    const after = await snapshot();
    expect(await new InvitationService(database).cancel(result.data.id, { reason: 'Invitation no longer needed' }, req)).toEqual(cancelled);
    expect(await snapshot()).toEqual(after);
    await expect(service.cancel(result.data.id, { reason: 'Changed reason' }, req)).rejects.toMatchObject({ status: 409 });
    await expect(service.inspect({ token })).rejects.toMatchObject({ status: 410 });
    await expect(service.accept({ token, password }, acceptanceRequest())).rejects.toMatchObject({ status: 410 });
  });

  it('checks current cancellation authority instead of cached admin flags', async () => {
    const { result } = await create();
    await pool.query("UPDATE memberships SET role='operations' WHERE id=$1", [admin.membershipId]);
    await expect(service.cancel(result.data.id, { reason: 'Stale administrator' }, request())).rejects.toMatchObject({ status: 403 });
  });

  it('rolls back cancellation and delivery state if durable cancellation receipt cannot commit', async () => {
    const { result, token } = await create(); const before = await snapshot(); const req = request();
    await expect(failInsert('idempotency_records').cancel(result.data.id, { reason: 'Cancellation atomicity test' }, req))
      .rejects.toMatchObject({ status: 503 });
    expect(await snapshot()).toEqual(before);
    expect((await service.inspect({ token })).data.id).toBe(result.data.id);
    expect((await pool.query('SELECT status FROM outbox WHERE event_id=$1', [result.data.deliveryEventId])).rows[0].status).toBe('pending');
    await expect(service.cancel(result.data.id, { reason: 'Cancellation atomicity test' }, req)).resolves.toMatchObject({ data: { status: 'cancelled' } });
  });

  it('serializes cancellation against acceptance so the token cannot reach both terminal states', async () => {
    const { result, token } = await create();
    const outcomes = await Promise.allSettled([
      service.cancel(result.data.id, { reason: 'Concurrent cancellation' }, request()),
      new InvitationService(database).accept({ token, password }, acceptanceRequest()),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected') as PromiseRejectedResult;
    expect([409, 410]).toContain(rejected.reason.status);
    const row = (await pool.query('SELECT lifecycle_status,accepted_at,cancelled_at FROM user_invitations WHERE id=$1', [result.data.id])).rows[0];
    expect(['accepted', 'cancelled']).toContain(row.lifecycle_status);
    expect(Boolean(row.accepted_at)).not.toBe(Boolean(row.cancelled_at));
  });

  it('rejects expired invitations and legacy unverified rows without modifying users', async () => {
    const invitation = await create();
    await pool.query("UPDATE user_invitations SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1", [invitation.result.data.id]);
    await expect(service.accept({ token: invitation.token, password }, acceptanceRequest())).rejects.toMatchObject({ status: 410 });
    const legacyToken = randomBytes(32).toString('base64url'); const legacyEmail = email();
    await pool.query("INSERT INTO user_invitations(organisation_id,email,name,role,token_hash,expires_at) VALUES($1,$2,'Legacy fixture','operations',$3,NOW()+INTERVAL '1 hour')", [organisationId, legacyEmail, createHash('sha256').update(legacyToken).digest('hex')]);
    await expect(service.inspect({ token: legacyToken })).rejects.toMatchObject({ status: 410 });
    await expect(service.accept({ token: legacyToken, password }, acceptanceRequest())).rejects.toMatchObject({ status: 410 });
    expect((await pool.query('SELECT id FROM users WHERE email=ANY($1::text[])', [[legacyEmail, invitation.targetEmail]])).rows).toHaveLength(0);
  });

  it.each(['revoked', 'demoted', 'external'])('invalidates outstanding invitation when its issuer becomes %s', async (change) => {
    const { token } = await create();
    if (change === 'revoked') await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [admin.membershipId]);
    if (change === 'demoted') await pool.query("UPDATE memberships SET role='operations' WHERE id=$1", [admin.membershipId]);
    if (change === 'external') await pool.query("UPDATE memberships SET audience='client' WHERE id=$1", [admin.membershipId]);
    await expect(service.inspect({ token })).rejects.toMatchObject({ status: 410 });
    await expect(service.accept({ token, password }, acceptanceRequest())).rejects.toMatchObject({ status: 410 });
  });

  it('accepts a new account exactly once and replays the durable response only for the original password/key', async () => {
    const { token, targetEmail } = await create(); const req = acceptanceRequest();
    const results = await Promise.all(Array.from({ length: 3 }, () => new InvitationService(database).accept({ token, password, name: 'Accepted account name' }, req)));
    results.forEach((result) => expect(result).toEqual(results[0]));
    expect(results[0]).toMatchObject({ success: true, organisationId, membershipId: expect.any(String), auditEventId: expect.any(String), eventId: expect.any(String) });
    const account = await pool.query("SELECT u.id,u.name,a.password FROM users u JOIN accounts a ON a.user_id=u.id AND a.provider_id='credential' WHERE u.email=$1", [targetEmail]);
    expect(account.rows).toHaveLength(1);
    expect(verifyPassword(password, account.rows[0].password)).toBe(true);
    const before = await snapshot();
    expect(await new InvitationService(database).accept({ token, password, name: 'Accepted account name' }, req)).toEqual(results[0]);
    expect(await snapshot()).toEqual(before);
    await expect(service.accept({ token, password, name: 'Replay must not rename account' }, req)).rejects.toMatchObject({ status: 409 });
    await expect(service.accept({ token, password }, acceptanceRequest())).rejects.toMatchObject({ status: 410 });
    await expect(service.accept({ token, password: 'WrongReplayPassword!', name: 'Accepted account name' }, req)).rejects.toMatchObject({ status: 401 });
    const unchanged = await pool.query('SELECT name FROM users WHERE id=$1', [account.rows[0].id]);
    expect(unchanged.rows[0].name).toBe('Accepted account name');
  });

  it('allows only one of concurrent different-key acceptance attempts to consume a token', async () => {
    const { token } = await create();
    const outcomes = await Promise.allSettled([service.accept({ token, password }, acceptanceRequest()), new InvitationService(database).accept({ token, password }, acceptanceRequest())]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 410 });
  });

  it('rolls back account, credential, membership and token consumption when acceptance audit fails', async () => {
    const { token, targetEmail, result } = await create(); const before = await snapshot();
    await expect(failInsert('audit_events').accept({ token, password }, acceptanceRequest())).rejects.toMatchObject({ status: 503 });
    expect(await snapshot()).toEqual(before);
    expect((await pool.query('SELECT id FROM users WHERE email=$1', [targetEmail])).rows).toHaveLength(0);
    const invitation = await pool.query('SELECT accepted_at,lifecycle_status FROM user_invitations WHERE id=$1', [result.data.id]);
    expect(invitation.rows[0]).toMatchObject({ accepted_at: null, lifecycle_status: 'pending' });
    await expect(service.accept({ token, password }, acceptanceRequest())).resolves.toMatchObject({ success: true });
  });

  it('requires existing-account ownership and never replaces its password or name', async () => {
    const foreignOrg = await addOrganisation(); const existing = await addActor('operations', foreignOrg);
    const originalHash = hashPassword(password);
    await pool.query("INSERT INTO accounts(user_id,account_id,provider_id,password) VALUES($1,$2,'credential',$3)", [existing.id, existing.email, originalHash]);
    const { token } = await create(existing.email); const key = randomUUID();
    expect((await service.inspect({ token })).data.requiresExistingSignIn).toBe(true);
    await expect(service.accept({ token, password: 'AttackPassword!2026', name: 'Attacker name' }, acceptanceRequest(key))).rejects.toBeDefined();
    await expect(service.accept({ token, password: 'AttackPassword!2026' }, acceptanceRequest(key, admin))).rejects.toBeDefined();
    const accepted = await service.accept({ token, password: 'IgnoredPassword!2026', name: 'Ignored name' }, acceptanceRequest(key, existing));
    expect(accepted).toMatchObject({ success: true, organisationId });
    const row = await pool.query("SELECT u.name,a.password FROM users u JOIN accounts a ON a.user_id=u.id AND a.provider_id='credential' WHERE u.id=$1", [existing.id]);
    expect(row.rows[0]).toEqual({ name: 'Original isolated account name', password: originalHash });
    const after = await snapshot();
    expect(await service.accept({ token }, acceptanceRequest(key, existing))).toEqual(accepted);
    expect(await snapshot()).toEqual(after);
    await pool.query('DELETE FROM sessions WHERE user_id=$1', [existing.id]);
    await expect(service.accept({ token }, acceptanceRequest(key, existing))).rejects.toBeDefined();
  });

  it('does not restore an existing same-organisation revoked membership or invite a global administrator', async () => {
    const existing = await addActor('operations');
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [existing.membershipId]);
    await expect(service.create(body(existing.email), request())).rejects.toBeDefined();
    const global = await addActor('operations', await addOrganisation(), 'internal', true);
    await expect(service.create(body(global.email), request())).rejects.toBeDefined();
    expect((await pool.query('SELECT is_revoked FROM memberships WHERE id=$1', [existing.membershipId])).rows[0].is_revoked).toBe(true);
  });

  it('derives client audience from the accepted invitation role and requires acceptance idempotency/password bounds', async () => {
    const { token, targetEmail } = await create(email(), 'client_user');
    await expect(service.accept({ token, password }, { headers: {} } as any)).rejects.toMatchObject({ status: 400 });
    await expect(service.accept({ token, password: 'short' }, acceptanceRequest())).rejects.toMatchObject({ status: 400 });
    await expect(service.accept({ token, password: 'ع'.repeat(37) }, acceptanceRequest())).rejects.toMatchObject({ status: 400 });
    await service.accept({ token, password }, acceptanceRequest());
    const membership = await pool.query('SELECT m.role,m.audience FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organisation_id=$1 AND u.email=$2', [organisationId, targetEmail]);
    expect(membership.rows).toEqual([{ role: 'client_user', audience: 'client' }]);
  });
});
