import { afterEach, describe, expect, it, vi } from 'vitest';
import { EosApiClient } from './api-client.js';

const membershipId = '98000000-0000-4000-8000-000000000001';
const client = new EosApiClient({ baseUrl: 'http://localhost/api/v1', organisationId: 'org', userId: 'actor' });
afterEach(() => vi.unstubAllGlobals());

function response(value: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => value };
}

describe('Admin client records and command truthfulness', () => {
  it('keeps an empty directory empty instead of substituting accounts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ users: [] })));
    expect(await client.getAdminUsers()).toEqual([]);
  });
  it('preserves recorded revocation and role state', async () => {
    const user = { id: 'user', membershipId, role: 'unassigned', isRevoked: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ users: [user] })));
    expect(await client.getAdminUsers()).toEqual([user]);
  });
  it.each([401, 403, 503])('surfaces a directory failure (%s)', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Directory unavailable' }, status)));
    await expect(client.getAdminUsers()).rejects.toThrow('Directory unavailable');
  });
  it('does not interpret malformed directory data as an empty success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({})));
    await expect(client.getAdminUsers()).rejects.toThrow('incomplete');
  });
  it('defaults missing capabilities to unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ canManageMemberships: true })));
    expect(await client.getAdminAccessCapabilities()).toMatchObject({ canManageMemberships: true, canInvite: false, canAssignProjectAccess: false, canImpersonate: false });
  });
  it('retains the caller retry key and reason after a lost response', async () => {
    const receipt = { id: membershipId, isRevoked: true, auditEventId: 'audit' };
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce(response({ data: receipt }, 201));
    vi.stubGlobal('fetch', fetch);
    await expect(client.revokeMembership(membershipId, ' Reviewed departure ', 'same-operation')).rejects.toThrow('Response lost');
    expect(await client.revokeMembership(membershipId, ' Reviewed departure ', 'same-operation')).toEqual(receipt);
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);
    expect(fetch.mock.calls[1][1].headers['idempotency-key']).toBe('same-operation');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ reason: 'Reviewed departure' });
  });
  it('does not confirm a different membership receipt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: 'different', isRevoked: true, auditEventId: 'audit' } }, 201)));
    await expect(client.revokeMembership(membershipId, 'Reason', 'key')).rejects.toThrow('receipt');
  });
  it('does not confirm revocation without audit acknowledgement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: membershipId, isRevoked: true } }, 201)));
    await expect(client.revokeMembership(membershipId, 'Reason', 'key')).rejects.toThrow('receipt');
  });
  it('does not send a reasonless revocation', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(client.revokeMembership(membershipId, ' ', 'key')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not substitute a local identity when role preview is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Local preview disabled' }, 403)));
    await expect(client.impersonateUser('superadmin@eeeqa.com')).rejects.toThrow('Local preview disabled');
  });
  it('rejects an incomplete impersonation session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ success: true, user: { id: 'test' } })));
    await expect(client.impersonateUser('test@example.test')).rejects.toThrow('incomplete session');
  });
  it('reports unknown runtime metadata instead of guessing a deployment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ environment: 'unconfirmed-cloud' })));
    expect(await client.getRuntimeEnvironment()).toBe('unknown');
  });
});
