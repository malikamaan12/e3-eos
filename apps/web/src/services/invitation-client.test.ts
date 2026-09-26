import { afterEach, describe, expect, it, vi } from 'vitest';
import { EosApiClient } from './api-client.js';

const makeClient = () => new EosApiClient({ baseUrl: '/api/v1', organisationId: 'organization', userId: 'actor' });
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
afterEach(() => vi.unstubAllGlobals());

describe('Invitation client boundaries', () => {
  it('never authenticates a known administrator after a server rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Session denied' }, 401)));
    await expect(makeClient().authLogin('superadmin@eeeqa.com', 'E3#Doha2026!')).rejects.toThrow('Session denied');
  });
  it('rejects partial sign-in success instead of adopting an invented session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ success: true, user: { id: 'user' } })));
    await expect(makeClient().authLogin('recipient@example.test', 'password')).rejects.toThrow('incomplete session');
  });
  it('preserves the server MFA challenge and only authenticates with a full session', async () => {
    const session = { sessionToken: 'server-session', user: { id: 'user', email: 'recipient@example.test' }, activeMembership: { role: 'operations', organisationId: 'real-org' } };
    const fetch = vi.fn().mockResolvedValueOnce(response({ mfaRequired: true })).mockResolvedValueOnce(response(session)).mockResolvedValueOnce(response({ data: [] }));
    vi.stubGlobal('fetch', fetch);
    const client = makeClient();
    expect(await client.authLogin('recipient@example.test', 'password')).toEqual({ mfaRequired: true });
    expect(await client.authLogin('recipient@example.test', 'password', '123456')).toEqual(session);
    await client.getInvitations();
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer server-session');
    expect(fetch.mock.calls[2][1].headers['X-Organisation-Id'] || fetch.mock.calls[2][1].headers['x-organisation-id']).toBe('real-org');
  });
  it('posts invitation tokens in a noncached request body, never the URL', async () => {
    const preview = { id: 'invitation', email: 'recipient@example.test', organisationName: 'Test org', requiresExistingSignIn: true };
    const fetch = vi.fn().mockResolvedValue(response({ data: preview })); vi.stubGlobal('fetch', fetch);
    expect(await makeClient().inspectInvitation('private-token')).toEqual(preview);
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/auth/invitations/inspect');
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', cache: 'no-store', body: JSON.stringify({ token: 'private-token' }) });
  });
  it('keeps a failed invitation read visible rather than substituting an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Not authorized' }, 403)));
    await expect(makeClient().getInvitations()).rejects.toThrow('Not authorized');
  });
  it('does not treat an incomplete token preview as a new-account invitation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: 'invite', email: 'email', organisationName: 'Org' } })));
    await expect(makeClient().inspectInvitation('token')).rejects.toThrow('incomplete');
  });
  it('reuses the same creation command after an unknown outcome', async () => {
    const receipt = { id: 'invitation', auditEventId: 'audit', status: 'pending', deliveryStatus: 'queued' };
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce(response({ data: receipt }, 201)); vi.stubGlobal('fetch', fetch);
    const client = makeClient(); const body = { email: 'recipient@example.test', name: 'Recipient', role: 'operations', reason: 'Assigned operations team' };
    await expect(client.createInvitation(body, 'stable-key')).rejects.toThrow('Lost response');
    expect(await client.createInvitation(body, 'stable-key')).toEqual(receipt);
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);
  });
  it('will not confirm creation without durable queue and audit evidence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: 'invite', status: 'pending' } }, 201)));
    await expect(makeClient().createInvitation({ email: 'test@example.test', name: 'Test', role: 'operations', reason: 'Test' }, 'key')).rejects.toThrow('receipt');
  });
  it('will not confirm cancellation of a different invitation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: { id: 'other', status: 'cancelled', auditEventId: 'audit' } }, 201)));
    await expect(makeClient().cancelInvitation('reviewed', 'Cancelled assignment', 'key')).rejects.toThrow('receipt');
  });
  it('accepts using the live session and exact retry key without sending a new password for existing users', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ success: true, membershipId: 'membership', organisationId: 'org', auditEventId: 'audit' }, 201)); vi.stubGlobal('fetch', fetch);
    const client = makeClient(); client.setSessionToken('existing-session');
    await client.acceptInvite('token', undefined, undefined, 'acceptance-key');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer existing-session');
    expect(fetch.mock.calls[0][1].headers['idempotency-key']).toBe('acceptance-key');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token: 'token' });
  });
  it('does not claim an accepted invitation from a success-only response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ success: true }, 201)));
    await expect(makeClient().acceptInvite('token', 'password', 'Name', 'key')).rejects.toThrow('receipt');
  });
});
