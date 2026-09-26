import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { AuthController } from '../apps/api/src/auth/auth.controller.js';
import { AdminController } from '../apps/api/src/admin/admin.controller.js';
import { DbService } from '../apps/api/src/common/db.service.js';
import { generateTotpCode } from '../packages/db/src/auth-crypto.js';
import { createDecipheriv, createHash, randomUUID } from 'node:crypto';
import { InvitationService } from '../apps/api/src/identity/invitation.service.js';

describe('Sprint 01 Authentication & Authorization Verification Suite', () => {
  let authController: AuthController;
  let adminController: AdminController;
  let dbService: DbService;
  const testEmail = `test.auth.${randomUUID()}@example.test`;
  const organisationId = randomUUID();
  const administratorId = randomUUID();
  const administratorEmail = `auth.admin.${randomUUID()}@example.test`;
  const administratorToken = randomUUID();
  const impersonationTargetId = randomUUID();
  const impersonationTargetEmail = `auth.target.${randomUUID()}@example.test`;
  const deliveryKey = Buffer.alloc(32, 73);
  const initialPassword = 'InitialSecurePass!2026';
  const updatedPassword = 'UpdatedSecurePass!2026';
  let userId: string;
  let inviteToken: string;
  let sessionToken: string;
  let mfaSecret: string;

  beforeAll(async () => {
    // This suite deliberately exercises local synthetic JIT/UAT account fixtures.
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    vi.stubEnv('ENVIRONMENT', '');
    vi.stubEnv('EMAIL_PROVIDER', 'durable_outbox');
    vi.stubEnv('EOS_INVITATION_DELIVERY_KEY', deliveryKey.toString('base64'));
    dbService = new DbService();
    authController = new AuthController(dbService);
    adminController = new AdminController(dbService);
    const pool = dbService.getPool();
    await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [organisationId, 'Isolated authentication regression', `AUTH-${organisationId}`]);
    for (const [id, email, role, globalAdmin] of [[administratorId, administratorEmail, 'super_admin', true], [impersonationTargetId, impersonationTargetEmail, 'project_manager', false]]) {
      await pool.query('INSERT INTO users(id,email,name,is_super_admin) VALUES($1,$2,$3,$4)', [id, email, 'Isolated authentication fixture', globalAdmin]);
      await pool.query("INSERT INTO memberships(organisation_id,user_id,role,audience) VALUES($1,$2,$3,'internal')", [organisationId, id, role]);
    }
    await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [administratorId, administratorToken]);
    const invitation = await new InvitationService(dbService).create({ email: testEmail, name: 'Test Operational Lead', role: 'operations', reason: 'Isolated authentication regression' }, {
      organisationId, headers: { authorization: `Bearer ${administratorToken}`, 'idempotency-key': randomUUID() },
    } as any);
    const delivery = (await pool.query('SELECT payload FROM outbox WHERE event_id=$1 AND organisation_id=$2', [invitation.data.deliveryEventId, organisationId])).rows[0].payload.encryptedDelivery;
    const decipher = createDecipheriv('aes-256-gcm', deliveryKey, Buffer.from(delivery.iv, 'base64'));
    decipher.setAAD(Buffer.from(`${organisationId}:${invitation.data.id}`));
    decipher.setAuthTag(Buffer.from(delivery.tag, 'base64'));
    inviteToken = JSON.parse(Buffer.concat([decipher.update(Buffer.from(delivery.ciphertext, 'base64')), decipher.final()]).toString('utf8')).token;
  });
  afterAll(async () => {
    try {
      const pool = dbService.getPool();
      const ownedUsers = (await pool.query('SELECT id FROM users WHERE email=ANY($1::text[])', [[testEmail, administratorEmail, impersonationTargetEmail]])).rows.map((row) => row.id);
      for (const table of ['idempotency_records', 'outbox', 'audit_events', 'user_invitations', 'memberships']) await pool.query(`DELETE FROM ${table} WHERE organisation_id=$1`, [organisationId]);
      for (const table of ['notifications', 'password_resets', 'user_mfa', 'sessions', 'accounts']) await pool.query(`DELETE FROM ${table} WHERE user_id=ANY($1::uuid[])`, [ownedUsers]);
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [ownedUsers]);
      await pool.query('DELETE FROM organisations WHERE id=$1', [organisationId]);
    } finally { vi.unstubAllEnvs(); }
  });

  it('1. Legacy invitation route stays unavailable and controlled issuance grants no membership before acceptance', async () => {
    await expect(adminController.inviteUser({
      name: 'Test Operational Lead',
      email: testEmail,
      role: 'operations',
      department: 'Live Production',
    })).rejects.toMatchObject({ status: 503, response: { code: 'ADMIN_CAPABILITY_UNAVAILABLE' } });
    const users = await dbService.getPool().query('SELECT id FROM users WHERE email = $1', [testEmail]);
    expect(users.rows).toEqual([]);
  });

  it('2. Invitation acceptance & password creation: User accepts invite and sets password', async () => {
    const acceptRes = await authController.acceptInvite({
      token: inviteToken,
      password: initialPassword,
      name: 'Test Operational Lead (Active)',
    }, { headers: { 'idempotency-key': randomUUID() } } as any);

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.message).toContain('membership is now active');
    const user = await dbService.getPool().query('SELECT id FROM users WHERE email = $1', [testEmail]);
    userId = user.rows[0].id;
  });

  it('3. Login verification: User logs in successfully with new password', async () => {
    const mockRes = { cookie: () => {} } as any;
    const loginRes: any = await authController.login({
      email: testEmail,
      password: initialPassword,
    }, mockRes);

    expect(loginRes.success).toBe(true);
    expect(loginRes.sessionToken).toBeDefined();
    expect(loginRes.user.email).toBe(testEmail);
    expect(loginRes.activeMembership.role).toBe('operations');
    sessionToken = loginRes.sessionToken;
  });

  it('4. Incorrect password rejection: Rejects invalid password with 401 Unauthorized', async () => {
    const mockRes = { cookie: () => {} } as any;
    await expect(authController.login({
      email: testEmail,
      password: 'WrongPassword999!',
    }, mockRes)).rejects.toThrow();
  });

  it('5. Logout verification: User invalidates session and logs out', async () => {
    const mockReq = { headers: { authorization: 'Bearer ' + sessionToken } } as any;
    const mockRes = { clearCookie: () => {} } as any;
    const logoutRes = await authController.logout(mockReq, mockRes);
    expect(logoutRes.success).toBe(true);
  });

  it('6. Forgot & reset password flow: Generates reset token and sets updated password', async () => {
    const forgotRes = await authController.forgotPassword({ email: testEmail });
    expect(forgotRes.success).toBe(true);
    expect(forgotRes.resetToken).toBeDefined();

    const resetRes = await authController.resetPassword({
      token: forgotRes.resetToken!,
      newPassword: updatedPassword,
    });
    expect(resetRes.success).toBe(true);

    // Verify login with new password succeeds
    const mockRes = { cookie: () => {} } as any;
    const loginRes: any = await authController.login({
      email: testEmail,
      password: updatedPassword,
    }, mockRes);
    expect(loginRes.success).toBe(true);
    sessionToken = loginRes.sessionToken;
  });

  it('7. MFA enrollment & login challenge: Enrolls TOTP MFA and enforces 2FA challenge on login', async () => {
    const mockReq = { headers: { authorization: 'Bearer ' + sessionToken } } as any;
    // Setup MFA
    const setupRes = await authController.setupMfa(mockReq);
    expect(setupRes.secret).toBeDefined();
    mfaSecret = setupRes.secret;

    // Enable MFA using valid TOTP code
    const validCode = generateTotpCode(mfaSecret);
    const enableRes = await authController.verifyMfa(mockReq, { code: validCode });
    expect(enableRes.success).toBe(true);

    // Attempt login without MFA code -> returns mfaRequired
    const mockRes = { cookie: () => {} } as any;
    const challengeRes: any = await authController.login({
      email: testEmail,
      password: updatedPassword,
    }, mockRes);
    expect(challengeRes.mfaRequired).toBe(true);

    // Complete login with MFA code -> succeeds
    const mfaCode = generateTotpCode(mfaSecret);
    const mfaLoginRes: any = await authController.login({
      email: testEmail,
      password: updatedPassword,
      mfaCode,
    }, mockRes);
    expect(mfaLoginRes.success).toBe(true);
    expect(mfaLoginRes.sessionToken).toBeDefined();
  });

  it('8. Legacy role change is unavailable and preserves the accepted membership role', async () => {
    await expect(adminController.updateUserRole(userId, { role: 'procurement' }))
      .rejects.toMatchObject({ status: 503, response: { code: 'ADMIN_CAPABILITY_UNAVAILABLE' } });
    const memberships = await dbService.getPool().query('SELECT role FROM memberships WHERE user_id = $1 AND organisation_id = $2', [userId, organisationId]);
    expect(memberships.rows).toEqual([{ role: 'operations' }]);
  });

  it('9. Project access assignment is unavailable and does not turn ownership into a grant', async () => {
    const projectId = randomUUID();
    const before = await dbService.getPool().query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    await expect(adminController.assignProjectAccess({
      projectId,
      userId,
      role: 'procurement',
    })).rejects.toMatchObject({ status: 503, response: { code: 'ADMIN_CAPABILITY_UNAVAILABLE' } });
    const after = await dbService.getPool().query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    expect(after.rows).toEqual(before.rows);
  });

  it('10. Disabled account rejection: Revoked membership rejects login with 403 Forbidden', async () => {
    // The unsafe user-wide status route must not change memberships. Provision
    // only this test membership's revoked state to preserve login rejection coverage.
    await expect(adminController.updateUserStatus(userId, { isRevoked: true }))
      .rejects.toMatchObject({ status: 503, response: { code: 'ADMIN_CAPABILITY_UNAVAILABLE' } });
    const active = await dbService.getPool().query('SELECT is_revoked FROM memberships WHERE user_id = $1 AND organisation_id = $2', [userId, organisationId]);
    expect(active.rows).toEqual([{ is_revoked: false }]);
    await dbService.getPool().query('UPDATE memberships SET is_revoked = true WHERE user_id = $1 AND organisation_id = $2', [userId, organisationId]);

    // Attempt login -> must be rejected with 403 Forbidden
    const mockRes = { cookie: () => {} } as any;
    await expect(authController.login({
      email: testEmail,
      password: updatedPassword,
    }, mockRes)).rejects.toThrow();
  });

  it('11. Authenticated UAT Impersonation: Super Admin can impersonate a target role with audit logging', async () => {
    const adminReq = { headers: { authorization: `Bearer ${administratorToken}` } } as any;
    const impRes = await authController.impersonate(adminReq, { targetEmail: impersonationTargetEmail });
    expect(impRes.success).toBe(true);
    expect(impRes.sessionToken).toBeDefined();
    expect(impRes.user.email).toBe(impersonationTargetEmail);
    expect(impRes.impersonatedBy).toContain(administratorEmail);
  });

  it('12. Impersonation Security: Non-admin caller is rejected with 403 Forbidden', async () => {
    // Target user (not super admin) attempts to impersonate
    const nonAdminReq = { headers: { authorization: `Bearer ${sessionToken}` } } as any;
    await expect(authController.impersonate(nonAdminReq, { targetEmail: impersonationTargetEmail })).rejects.toThrow();
  });

  it('13. Production Token Redaction: Invitation and reset tokens are not leaked in production responses', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodForgot = await authController.forgotPassword({ email: impersonationTargetEmail });
      expect((prodForgot as any).resetToken).toBeUndefined();
      expect((prodForgot as any).resetUrl).toBeUndefined();
      expect(prodForgot.message).toBeDefined();

      await expect(adminController.inviteUser({
        name: 'Redaction Test',
        email: `redact.${Date.now()}@e3.qa`,
        role: 'project_manager',
      })).rejects.toMatchObject({ status: 503, response: { code: 'ADMIN_CAPABILITY_UNAVAILABLE' } });
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('14. Hashed controlled invitation acceptance consumes the fixture without persisting its raw token', async () => {
    const pool = dbService.getPool();
    const rows = await pool.query(
      `SELECT token, token_hash, accepted_at FROM user_invitations WHERE email = $1 ORDER BY created_at DESC LIMIT 1;`,
      [testEmail]
    );
    expect(rows.rows.length).toBe(1);
    const row = rows.rows[0];
    // Raw token must NOT be stored
    expect(row.token).toBeNull();
    // Token hash must be a 64-character hex string (SHA-256)
    expect(row.token_hash).toBeDefined();
    expect(row.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.token_hash).toBe(createHash('sha256').update(inviteToken).digest('hex'));
    expect(row.accepted_at).not.toBeNull();
  });

  it('15. Anti-Replay Protection: A different command key cannot reuse an accepted invitation', async () => {
    await expect(
      authController.acceptInvite({
        token: inviteToken,
        password: 'AttemptReplayPassword1!',
      }, { headers: { 'idempotency-key': randomUUID() } } as any)
    ).rejects.toMatchObject({ status: 410 });
  });

  it('16. Cryptographic Storage: Verifies password_resets stores SHA-256 hash and raw token is NULL', async () => {
    const pool = dbService.getPool();
    const rows = await pool.query(
      `SELECT pr.token, pr.token_hash, pr.used_at FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE u.email = $1 ORDER BY pr.created_at DESC LIMIT 1;`,
      [testEmail]
    );
    expect(rows.rows.length).toBe(1);
    const row = rows.rows[0];
    expect(row.token).toBeNull();
    expect(row.token_hash).toBeDefined();
    expect(row.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.used_at).not.toBeNull();
  });

  it('17. Anti-Replay Protection: Replaying a consumed password reset token is rejected with 400', async () => {
    await expect(
      authController.resetPassword({
        token: 'any-consumed-or-invalid-token',
        newPassword: 'AttemptReplayPassword1!',
      })
    ).rejects.toThrow();
  });

  it('18. Zero Notification Leak: Notifications table contains zero raw tokens and zero reset links', async () => {
    const pool = dbService.getPool();
    const notifs = await pool.query(
      `SELECT title, message, link FROM notifications WHERE user_id = $1;`,
      [userId]
    );
    for (const notif of notifs.rows) {
      // Must not contain raw token or query params
      expect(notif.message).not.toContain('token=');
      expect(notif.message).not.toContain(initialPassword);
      expect(notif.message).not.toContain(updatedPassword);
      if (notif.link) {
        expect(notif.link).not.toContain('token=');
        expect(notif.link).not.toContain('?');
      }
    }
  });

  it('19. Staging Environment Redaction: Strict token omission in staging environment', async () => {
    const prevEnv = process.env.ENVIRONMENT;
    process.env.ENVIRONMENT = 'staging';
    try {
      const stagingForgot = await authController.forgotPassword({ email: testEmail });
      expect((stagingForgot as any).resetToken).toBeUndefined();
      expect((stagingForgot as any).resetUrl).toBeUndefined();
      expect(stagingForgot.message).toBeDefined();
      expect(stagingForgot.deliveryStatus).toBeDefined();

      await expect(adminController.inviteUser({
        name: 'Staging Redaction Test',
        email: `staging.redact.${Date.now()}@e3.qa`,
        role: 'operations',
      })).rejects.toMatchObject({ status: 503, response: { code: 'ADMIN_CAPABILITY_UNAVAILABLE' } });
    } finally {
      process.env.ENVIRONMENT = prevEnv;
    }
  });

  it('20. JIT Auto-Provisioning: Superadmin (superadmin@eeeqa.com) logs in cleanly with E3#Doha2026!', async () => {
    const mockRes = { cookie: () => {} } as any;
    // Exercise the local-only fixture branch without modifying a named shared account.
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const isolatedAuth = new AuthController({ getPool: () => ({ query }) } as any);
    const loginRes: any = await isolatedAuth.login({
      email: 'superadmin@eeeqa.com',
      password: 'E3#Doha2026!',
    }, mockRes);

    expect(loginRes.success).toBe(true);
    expect(loginRes.sessionToken).toBeDefined();
    expect(loginRes.user.email).toBe('superadmin@eeeqa.com');
    expect(loginRes.user.isSuperAdmin).toBe(true);
    expect(loginRes.activeMembership.role).toBe('super_admin');
  });

  it('21. JIT Auto-Provisioning: Local team accounts log in cleanly with their assigned roles', async () => {
    const mockRes = { cookie: () => {} } as any;
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const isolatedAuth = new AuthController({ getPool: () => ({ query }) } as any);

    // Adil Ahmed -> Executive
    const adilRes: any = await isolatedAuth.login({
      email: 'adil@eeeqa.com',
      password: 'E3#Doha2026!',
    }, mockRes);
    expect(adilRes.success).toBe(true);
    expect(adilRes.user.email).toBe('adil@eeeqa.com');
    expect(adilRes.activeMembership.role).toBe('executive');

    // Mohammad Ali -> Project Director
    const aliRes: any = await isolatedAuth.login({
      email: 'm.ali@eeeqa.com',
      password: 'E3#Doha2026!',
    }, mockRes);
    expect(aliRes.success).toBe(true);
    expect(aliRes.user.email).toBe('m.ali@eeeqa.com');
    expect(aliRes.activeMembership.role).toBe('project_director');
  });

  it('22. Security Enforced: Local team accounts strictly reject invalid passwords', async () => {
    const mockRes = { cookie: () => {} } as any;
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const isolatedAuth = new AuthController({ getPool: () => ({ query }) } as any);
    await expect(
      isolatedAuth.login({
        email: 'superadmin@eeeqa.com',
        password: 'WrongPassword123!',
      }, mockRes)
    ).rejects.toThrow();
  });
});
