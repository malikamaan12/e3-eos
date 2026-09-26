import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { AdminController } from './admin.controller.js';
import type { DbService } from '../common/db.service.js';
import { ALLOWED_AUDIENCES_KEY, REQUIRED_ROLES_KEY } from '../common/tenant.guard.js';

const organisationId = '11111111-1111-4111-8111-111111111111';
const otherOrganisationId = '22222222-2222-4222-8222-222222222222';
const actor = { id: 'actor-id', is_super_admin: false, role: 'super_admin', audience: 'internal', organisation_id: organisationId };

function request(overrides: Record<string, unknown> = {}): Request {
  return { headers: { authorization: 'Bearer live-admin-session' }, organisationId, ...overrides } as unknown as Request;
}

function harness() {
  const query = vi.fn();
  const getPool = vi.fn(() => ({ query }));
  return { controller: new AdminController({ getPool } as unknown as DbService), query, getPool };
}

async function expectHttpError(operation: Promise<unknown>, status: number, code: string) {
  try {
    await operation;
    throw new Error('Expected request to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(status);
    expect((error as HttpException).getResponse()).toMatchObject({ code });
  }
}

afterEach(() => vi.unstubAllEnvs());

describe('Admin membership directory boundaries', () => {
  it('returns only persisted organisation memberships with their actual role, audience, and revocation state', async () => {
    const { controller, query } = harness();
    query.mockResolvedValueOnce({ rows: [actor] }).mockResolvedValueOnce({ rows: [{
      id: 'member-user', membership_id: 'membership-1', name: 'Member', email: 'member@example.test',
      is_super_admin: true, role: 'client_user', audience: 'client', is_revoked: true, row_version: 7,
      org_id: organisationId, org_name: 'Test organisation', created_at: '2026-09-01T12:00:00Z',
    }] });

    const result = await controller.listUsers(request());
    expect(result.users).toEqual([{
      id: 'member-user', membershipId: 'membership-1', name: 'Member', email: 'member@example.test',
      isSuperAdmin: true, role: 'client_user', audience: 'client', isRevoked: true, rowVersion: 7,
      organisationId, organisationName: 'Test organisation', createdAt: '2026-09-01T12:00:00Z',
    }]);
    expect(query.mock.calls[0][0]).toContain('s.expires_at > NOW()');
    expect(query.mock.calls[0][0]).toContain('m.is_revoked = false');
    expect(query.mock.calls[0][1]).toEqual(['live-admin-session', organisationId]);
    expect(query.mock.calls[1][0]).toContain('INNER JOIN memberships');
    expect(query.mock.calls[1][0]).toContain('WHERE m.organisation_id = $1');
    expect(query.mock.calls[1][1]).toEqual([organisationId]);
    expect(query.mock.calls[1][0]).not.toContain('m.is_revoked = false');
  });

  it('does not invent local team users or organisations when the persisted directory is empty', async () => {
    const { controller, query } = harness();
    query.mockResolvedValueOnce({ rows: [actor] }).mockResolvedValueOnce({ rows: [] });
    expect(await controller.listUsers(request())).toEqual({ users: [] });
  });

  it('rejects another organisation without a current membership before querying its directory', async () => {
    const { controller, query } = harness();
    query.mockResolvedValueOnce({ rows: [] });
    await expectHttpError(controller.listUsers(request({ organisationId: otherOrganisationId })), 403, 'FORBIDDEN_ADMIN_ACCESS');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(['live-admin-session', otherOrganisationId]);
  });

  it('does not treat role headers or attached superadmin flags as a session', async () => {
    const { controller, query } = harness();
    await expectHttpError(controller.listUsers(request({
      headers: { 'x-user-roles': 'super_admin', 'x-user-id': 'actor-id' }, role: 'super_admin', isSuperAdmin: true,
    })), 401, 'UNAUTHENTICATED');
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    { ...actor, role: 'project_manager' },
    { ...actor, audience: 'client', is_super_admin: true },
  ])('denies stale or external authority even if request flags claim administrator privileges', async (currentActor) => {
    const { controller, query } = harness();
    query.mockResolvedValueOnce({ rows: [currentActor] });
    await expectHttpError(controller.listUsers(request({ role: 'super_admin', isSuperAdmin: true })), 403, 'FORBIDDEN_ADMIN_ACCESS');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('fails closed when current access or directory storage cannot be read', async () => {
    const { controller, query } = harness();
    query.mockRejectedValueOnce(new Error('database unavailable'));
    await expectHttpError(controller.listUsers(request()), 503, 'ADMIN_DIRECTORY_UNAVAILABLE');
    query.mockResolvedValueOnce({ rows: [actor] }).mockRejectedValueOnce(new Error('directory unavailable'));
    await expectHttpError(controller.listUsers(request()), 503, 'ADMIN_DIRECTORY_UNAVAILABLE');
  });

  it('requires internal administrator guard metadata on directory and capability routes', () => {
    for (const handler of [AdminController.prototype.listUsers, AdminController.prototype.getAccessCapabilities]) {
      expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual(['super_admin', 'executive']);
      expect(Reflect.getMetadata(ALLOWED_AUDIENCES_KEY, handler)).toEqual(['internal']);
    }
  });
});

describe('Truthful admin capabilities', () => {
  it('gives executives read-only membership capability and disables unavailable actions', async () => {
    const { controller, query } = harness();
    query.mockResolvedValue({ rows: [{ ...actor, role: 'executive' }] });
    expect(await controller.getAccessCapabilities(request())).toMatchObject({
      canManageMemberships: false, canInvite: false, canAssignProjectAccess: false, canChangeRoles: false, canRestoreMemberships: false, canImpersonate: false,
      disabledReasons: { invite: expect.any(String), projectAccess: expect.any(String), roleChange: expect.any(String), statusChange: expect.any(String) },
    });
  });

  it.each([
    { is_super_admin: false, role: 'super_admin' },
    { is_super_admin: true, role: 'executive' },
  ])('aligns membership management with current internal superadmin authority', async (authority) => {
    const { controller, query } = harness();
    query.mockResolvedValue({ rows: [{ ...actor, ...authority }] });
    const result = await controller.getAccessCapabilities(request());
    expect(result).toMatchObject({ canManageMemberships: true, canAssignProjectAccess: true, canChangeRoles: true, canRestoreMemberships: true });
    expect(result.allowedMembershipRoles).toContain('client_user');
    expect(result.allowedMembershipRoles).not.toContain('super_admin');
    expect(result.allowedMembershipRoles).not.toContain('executive');
    expect(result.disabledReasons).not.toHaveProperty('roleChange');
    expect(result.disabledReasons).not.toHaveProperty('statusChange');
  });

  it('enables invitation creation only with verified authority and configured encrypted delivery storage', async () => {
    const { controller, query } = harness();
    query.mockResolvedValue({ rows: [actor] });
    vi.stubEnv('EOS_INVITATION_DELIVERY_KEY', '');
    expect(await controller.getAccessCapabilities(request())).toMatchObject({ canInvite: false, canCancelInvitations: true });
    vi.stubEnv('EOS_INVITATION_DELIVERY_KEY', 'invalid-key');
    expect((await controller.getAccessCapabilities(request())).canInvite).toBe(false);
    vi.stubEnv('EOS_INVITATION_DELIVERY_KEY', Buffer.alloc(32, 77).toString('base64'));
    const capabilities = await controller.getAccessCapabilities(request());
    expect(capabilities).toMatchObject({ canInvite: true, canCancelInvitations: true });
    expect(capabilities.allowedInvitationRoles).toContain('client_user');
    expect(capabilities.allowedInvitationRoles).not.toContain('super_admin');
    expect(capabilities.allowedInvitationRoles).not.toContain('executive');
    query.mockResolvedValue({ rows: [{ ...actor, role: 'executive' }] });
    expect(await controller.getAccessCapabilities(request())).toMatchObject({ canInvite: false, canCancelInvitations: false });
  });

  it('enables impersonation only for a verified global superadmin in explicitly local synthetic mode', async () => {
    const { controller, query } = harness();
    query.mockResolvedValue({ rows: [{ ...actor, is_super_admin: true }] });
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ENVIRONMENT', 'local');
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
    expect((await controller.getAccessCapabilities(request())).canImpersonate).toBe(false);
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    expect((await controller.getAccessCapabilities(request())).canImpersonate).toBe(true);
    vi.stubEnv('ENVIRONMENT', 'staging');
    expect((await controller.getAccessCapabilities(request())).canImpersonate).toBe(false);
    vi.stubEnv('ENVIRONMENT', 'local');
    query.mockResolvedValue({ rows: [actor] });
    expect((await controller.getAccessCapabilities(request({ isSuperAdmin: true }))).canImpersonate).toBe(false);
  });
});

describe('Disabled unsafe legacy admin mutations', () => {
  it('returns explicit unavailability without reading or writing storage or dispatching invitations', async () => {
    const { controller, getPool, query } = harness();
    const operations = [
      controller.getProjectAccess(),
      controller.inviteUser({ name: 'External', email: 'external@example.test', organisationId: otherOrganisationId, role: 'super_admin' }),
      controller.assignProjectAccess({ projectId: 'other-project', userId: 'other-user' }),
      controller.updateUserRole('other-user', { role: 'super_admin' }),
      controller.updateUserStatus('other-user', { isRevoked: true }),
      controller.updateUserStatus('other-user', { isRevoked: false }),
    ];
    await Promise.all(operations.map((operation) => expectHttpError(operation, 503, 'ADMIN_CAPABILITY_UNAVAILABLE')));
    expect(getPool).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
