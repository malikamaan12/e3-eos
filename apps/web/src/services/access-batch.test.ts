import { afterEach, describe, expect, it, vi } from 'vitest';
import { EosApiClient } from './api-client.js';

const client = new EosApiClient({ baseUrl: 'http://localhost/api/v1', organisationId: 'org', userId: 'admin' });
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
afterEach(() => vi.unstubAllGlobals());

describe('Access batch client', () => {
  it('keeps an empty authorized project directory empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: [] })));
    expect(await client.getProjects()).toEqual([]);
  });
  it.each([401, 403, 404, 503])('does not replace denied project records with fixtures (%s)', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Scoped access unavailable' }, status)));
    await expect(client.getProjects()).rejects.toThrow('Scoped access unavailable');
    await expect(client.getProject('00000000-0000-4000-8000-000000000099')).rejects.toThrow('Scoped access unavailable');
    await expect(client.getCockpit('00000000-0000-4000-8000-000000000099')).rejects.toThrow('Scoped access unavailable');
  });
  it('does not hide a malformed role or project response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({})));
    await expect(client.getAdminRoles()).rejects.toThrow('incomplete');
    await expect(client.getProjects()).rejects.toThrow('incomplete');
    await expect(client.getProjectAccessGrants()).rejects.toThrow('incomplete');
  });
  it('retains exactly the same role command after a lost response', async () => {
    const input = { role: 'finance', reason: 'Reviewed reassignment', expectedVersion: 2 };
    const receipt = { id: 'member', role: 'finance', rowVersion: 3, status: 'role_changed', isRevoked: false, auditEventId: 'audit', eventId: 'event', requiresFreshSignIn: true };
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce(response({ data: receipt }, 201));
    vi.stubGlobal('fetch', fetch);
    await expect(client.changeMembershipRole('member', input, 'same-key')).rejects.toThrow('Lost response');
    expect(await client.changeMembershipRole('member', input, 'same-key')).toEqual(receipt);
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(input);
  });
  it('rejects restoration success without the reviewed version and sign-in effect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: 'member', status: 'restored', isRevoked: false, auditEventId: 'audit' } }, 201)));
    await expect(client.restoreMembership('member', { reason: 'Return', expectedVersion: 2 }, 'key')).rejects.toThrow('incomplete');
  });
  it('rejects a grant receipt for a different membership', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: 'grant', projectId: 'project', membershipId: 'wrong', accessLevel: 'viewer', rowVersion: 1, auditEventId: 'audit', eventId: 'event', isRevoked: false } }, 201)));
    await expect(client.createProjectAccess({ projectId: 'project', membershipId: 'member', accessLevel: 'viewer', reason: 'Reviewed scope' }, 'key')).rejects.toThrow('does not match');
  });
  it('rejects a stale grant acknowledgement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: 'grant', accessLevel: 'editor', rowVersion: 1, auditEventId: 'audit', eventId: 'event', isRevoked: false } }, 201)));
    await expect(client.changeProjectAccess('grant', { accessLevel: 'editor', expectedVersion: 1, reason: 'Updated responsibility' }, 'key')).rejects.toThrow('does not match');
  });
  it('passes a stale server decision through for review instead of confirming it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Refresh current version' }, 409)));
    await expect(client.revokeProjectAccess('grant', { expectedVersion: 1, reason: 'Departure' }, 'key')).rejects.toMatchObject({ status: 409 });
  });
});
