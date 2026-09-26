import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { AuthController } from '../apps/api/src/auth/auth.controller.js';
import { localSyntheticAuthEnabled, readSessionToken } from '../apps/api/src/auth/local-synthetic-auth.js';
import { TenantIsolationGuard } from '../apps/api/src/common/tenant.guard.js';
import { ConstraintsAuthGuard } from '../apps/api/src/common/constraints-auth.guard.js';
import { hashPassword } from '../packages/db/src/auth-crypto.js';
import { DEFAULT_DUMMY_PASSWORD } from '@e3-eos/domain';
import { allowedWebOrigins, assertRequestOrigin, commandOriginMiddleware } from '../apps/api/src/auth/request-origin.js';

const activeUser = {
  user_id: 'user-active', id: 'user-active', email: 'user@example.test', name: 'Active User',
  organisation_id: 'org-authorized', role: 'operations', audience: 'internal', is_super_admin: false,
};

function fixture(rows: any[] = [activeUser], metadata: Record<string, unknown> = {}) {
  const query = vi.fn().mockResolvedValue({ rows });
  const db = { getPool: () => ({ query }) } as any;
  const reflector = { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
  const guard = new TenantIsolationGuard(reflector, db);
  const execute = (request: any) => guard.canActivate({
    getHandler: () => ({}), getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as any);
  return { query, db, execute };
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('ENVIRONMENT', 'local');
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  vi.stubEnv('EOS_WEB_ORIGINS', '');
  vi.stubEnv('APP_BASE_URL', '');
});

describe('P00 browser command origin protection', () => {
  it('allows only exact local development origins by default', () => {
    const origins = allowedWebOrigins();
    expect(origins.has('http://localhost:3002')).toBe(true);
    expect(origins.has('http://127.0.0.1:3000')).toBe(true);
    expect(origins.has('http://localhost.attacker.test:3002')).toBe(false);
    expect(origins.has('http://localhost:9090')).toBe(false);
    expect(origins.has('null')).toBe(false);
  });

  it('requires explicitly configured origins in deployed environments', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(allowedWebOrigins().size).toBe(0);
    vi.stubEnv('EOS_WEB_ORIGINS', 'https://eos.example.test,https://admin.example.test');
    expect([...allowedWebOrigins()]).toEqual(['https://eos.example.test', 'https://admin.example.test']);
    expect(allowedWebOrigins().has('http://localhost:3002')).toBe(false);
  });

  it('supports the configured application origin without trusting Host headers', () => {
    vi.stubEnv('APP_BASE_URL', 'https://eos.example.test/');
    expect([...allowedWebOrigins()]).toEqual(['https://eos.example.test']);
    expect(() => assertRequestOrigin({ method: 'POST', headers: { origin: 'https://attacker.test',
      host: 'attacker.test', cookie: 'eos_session=opaque-session' } } as any)).toThrow();
  });

  it.each(['*', 'https://user:secret@eos.example.test', 'https://eos.example.test/path', 'null'])
  ('rejects an invalid or non-origin allowlist entry %s', (value) => {
    vi.stubEnv('EOS_WEB_ORIGINS', value);
    expect(() => allowedWebOrigins()).toThrow();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('rejects %s cookie commands without Origin', (method) => {
    expect(() => assertRequestOrigin({ method, headers: { cookie: 'eos_session=opaque-session' } } as any))
      .toThrowError(expect.objectContaining({ status: 403 }));
  });

  it('rejects cross-origin form commands before controller dispatch', () => {
    const next = vi.fn();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    commandOriginMiddleware(allowedWebOrigins())({ method: 'POST', headers: {
      origin: 'https://attacker.test', cookie: 'eos_session=opaque-session', 'content-type': 'application/x-www-form-urlencoded',
    } } as any, { status } as any, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNTRUSTED_REQUEST_ORIGIN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('permits a cookie command from an allowed origin', async () => {
    const { execute } = fixture();
    await expect(execute({ method: 'POST', headers: { cookie: 'eos_session=opaque-session',
      origin: 'http://localhost:3002' } })).resolves.toBe(true);
  });

  it('permits non-browser bearer commands without Origin while still resolving the session', async () => {
    const { execute, query } = fixture();
    await expect(execute({ method: 'POST', headers: { authorization: 'Bearer opaque-session',
      cookie: 'eos_session=unused-cookie' } })).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith(expect.any(String), ['opaque-session', null]);
  });

  it('does not allow browser bearer commands to bypass an untrusted Origin', async () => {
    const { execute, query } = fixture();
    await expect(execute({ method: 'POST', headers: { authorization: 'Bearer opaque-session',
      origin: 'https://attacker.test' } })).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });

  it('preserves safe cookie reads without an Origin', () => {
    expect(() => assertRequestOrigin({ method: 'GET', headers: { cookie: 'eos_session=opaque-session' } } as any)).not.toThrow();
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('P00 server-session trust boundary', () => {
  it('rejects forged identity/role/organisation headers without a server session', async () => {
    const { execute, query } = fixture();
    await expect(execute({ headers: {
      'x-user-id': 'administrator', 'x-organisation-id': 'org-authorized',
      'x-user-roles': 'super_admin', 'x-audience': 'internal',
    } })).rejects.toMatchObject({ status: 401 });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects pre-attached fixture identity when synthetic mode is disabled', async () => {
    const { execute } = fixture();
    await expect(execute({ headers: {}, userId: 'administrator', organisationId: 'org-authorized',
      role: 'super_admin', isSuperAdmin: true,
      sessionUser: { userId: 'administrator', organisationId: 'org-authorized', role: 'super_admin' },
    })).rejects.toMatchObject({ status: 401 });
  });

  it('uses current database identity and role instead of spoofed authority', async () => {
    const { execute } = fixture();
    const request: any = { headers: { authorization: 'Bearer opaque-session', 'x-user-id': 'administrator',
      'x-user-roles': 'super_admin', 'x-audience': 'client' }, isSuperAdmin: true, userRole: 'executive' };
    await expect(execute(request)).resolves.toBe(true);
    expect(request).toMatchObject({ userId: 'user-active', actorId: 'user-active', role: 'operations',
      userRole: 'operations', audience: 'internal', organisationId: 'org-authorized', isSuperAdmin: false });
    expect(request.headers).toMatchObject({ 'x-user-id': 'user-active', 'x-user-role': 'operations',
      'x-user-roles': 'operations', 'x-is-super-admin': 'false', 'x-user-audience': 'internal' });
  });

  it('requires the requested organisation to match a live database membership', async () => {
    const { execute, query } = fixture([]);
    await expect(execute({ headers: { authorization: 'Bearer valid-but-other-org',
      'x-organisation-id': 'org-unauthorized' } })).rejects.toMatchObject({ status: 401 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('m.organisation_id::text = $2'),
      ['valid-but-other-org', 'org-unauthorized']);
    expect(query.mock.calls[0][0]).toContain('m.is_revoked = false');
  });

  it('denies the next request after membership revocation', async () => {
    const { execute, query } = fixture();
    query.mockResolvedValueOnce({ rows: [activeUser] }).mockResolvedValueOnce({ rows: [] });
    const request = { headers: { authorization: 'Bearer active-then-revoked' } };
    await expect(execute(request)).resolves.toBe(true);
    await expect(execute(request)).rejects.toMatchObject({ status: 401 });
  });

  it('fails closed during a database outage even with a claimed identity and local opt-in', async () => {
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    const { execute, query } = fixture();
    query.mockRejectedValue(new Error('database unavailable'));
    await expect(execute({ headers: { authorization: 'Bearer unverified', 'x-user-id': 'admin',
      'x-organisation-id': 'org-authorized', 'x-user-roles': 'super_admin' } }))
      .rejects.toMatchObject({ status: 503 });
  });

  it('rejects malformed credentials without falling back to fixture headers', async () => {
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    const { execute, query } = fixture();
    await expect(execute({ headers: { authorization: 'arbitrary-text', 'x-user-id': 'admin',
      'x-organisation-id': 'org-authorized', 'x-user-roles': 'super_admin' } }))
      .rejects.toMatchObject({ status: 401 });
    expect(query).not.toHaveBeenCalled();
  });

  it('resolves HttpOnly cookie sessions when cookie-parser is absent', async () => {
    const { execute, query } = fixture();
    await expect(execute({ headers: { cookie: 'theme=dark; eos_session=opaque-cookie' } })).resolves.toBe(true);
    expect(query).toHaveBeenCalledWith(expect.any(String), ['opaque-cookie', null]);
    expect(readSessionToken({ headers: { cookie: 'eos_session=%ZZ' } } as any)).toBeUndefined();
  });

  it('applies audience restrictions to the database audience despite a forged internal header', async () => {
    const { execute } = fixture([{ ...activeUser, role: 'client_user', audience: 'client' }], { allowedAudiences: ['internal'] });
    await expect(execute({ headers: { authorization: 'Bearer client-session', 'x-audience': 'internal' } }))
      .rejects.toMatchObject({ status: 403 });
  });

  it('supports explicitly opted-in local fixture identities without querying live sessions', async () => {
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    const { execute, query } = fixture();
    await expect(execute({ headers: { 'x-user-id': 'fixture-user', 'x-organisation-id': 'fixture-org',
      'x-user-roles': 'operations', 'x-audience': 'internal' } })).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires active scoped membership for the separate constraint verification guard', async () => {
    const { db, query } = fixture([]);
    const guard = new ConstraintsAuthGuard(undefined, db);
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({
      headers: { authorization: 'Bearer revoked-verifier', 'x-organisation-id': 'org-authorized' },
    }) }) } as any)).rejects.toMatchObject({ status: 401 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('JOIN memberships'), ['revoked-verifier', 'org-authorized']);
    expect(query.mock.calls[0][0]).not.toContain('LEFT JOIN memberships');
  });
});

describe('P00 synthetic authentication deployment gate', () => {
  it.each([
    ['production', 'local'], ['test', 'production'], ['development', 'staging'], ['development', 'preview'],
  ])('cannot enable synthetic authority under NODE_ENV=%s ENVIRONMENT=%s', (nodeEnvironment, environment) => {
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    vi.stubEnv('NODE_ENV', nodeEnvironment);
    vi.stubEnv('ENVIRONMENT', environment);
    expect(localSyntheticAuthEnabled()).toBe(false);
  });

  it('does not auto-provision a missing canonical administrator by default', async () => {
    const { db, query } = fixture([]);
    await expect(new AuthController(db).login({ email: 'superadmin@eeeqa.com', password: DEFAULT_DUMMY_PASSWORD },
      { cookie: vi.fn() } as any)).rejects.toMatchObject({ status: 401 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not auto-activate an unconfigured existing account with a bundled password', async () => {
    const { db, query } = fixture([{ ...activeUser, stored_password: null }]);
    await expect(new AuthController(db).login({ email: activeUser.email, password: DEFAULT_DUMMY_PASSWORD },
      { cookie: vi.fn() } as any)).rejects.toMatchObject({ status: 401 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('retains ordinary invited-account password login with synthetic authentication disabled', async () => {
    const { db, query } = fixture([{ ...activeUser, stored_password: hashPassword('A-private-invited-password'), membership_revoked: false }]);
    const cookie = vi.fn();
    await expect(new AuthController(db).login({ email: activeUser.email, password: 'A-private-invited-password' },
      { cookie } as any)).resolves.toMatchObject({ success: true, activeMembership: { organisationId: 'org-authorized' } });
    expect(query).toHaveBeenCalledTimes(2);
    expect(cookie).toHaveBeenCalledWith('eos_session', expect.any(String), expect.objectContaining({ httpOnly: true }));
  });

  it('does not bypass a revoked membership for a Super Admin', async () => {
    const { db, query } = fixture([{ ...activeUser, is_super_admin: true, membership_revoked: true,
      stored_password: hashPassword('Revoked-admin-password') }]);
    await expect(new AuthController(db).login({ email: activeUser.email, password: 'Revoked-admin-password' },
      { cookie: vi.fn() } as any)).rejects.toMatchObject({ status: 403 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('disables unrestricted UAT impersonation outside explicit synthetic mode', async () => {
    const { db, query } = fixture();
    await expect(new AuthController(db).impersonate({ headers: { authorization: 'Bearer admin-session' } } as any,
      { targetEmail: activeUser.email })).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });

  it('permits canonical synthetic provisioning only after explicit local opt-in', async () => {
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    const { db, query } = fixture([]);
    await expect(new AuthController(db).login({ email: 'superadmin@eeeqa.com', password: DEFAULT_DUMMY_PASSWORD },
      { cookie: vi.fn() } as any)).resolves.toMatchObject({ success: true, user: { isSuperAdmin: true } });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO users'))).toBe(true);
  });
});
