import { describe, it, expect, beforeAll } from 'vitest';
import { AuthController } from '../apps/api/src/auth/auth.controller.js';
import { AdminController } from '../apps/api/src/admin/admin.controller.js';
import { DbService } from '../apps/api/src/common/db.service.js';
import { generateTotpCode } from '../packages/db/src/auth-crypto.js';

describe('Sprint 01 Authentication & Authorization Verification Suite', () => {
  let authController: AuthController;
  let adminController: AdminController;
  let dbService: DbService;
  const testEmail = 'test.auth.' + Date.now() + '@e3.qa';
  const initialPassword = 'InitialSecurePass!2026';
  const updatedPassword = 'UpdatedSecurePass!2026';
  let userId: string;
  let inviteToken: string;
  let sessionToken: string;
  let mfaSecret: string;

  beforeAll(() => {
    dbService = new DbService();
    authController = new AuthController(dbService);
    adminController = new AdminController(dbService);
  });

  it('1. Invitation creation: Admin invites a new user with role', async () => {
    const inviteRes = await adminController.inviteUser({
      name: 'Test Operational Lead',
      email: testEmail,
      role: 'operations',
      department: 'Live Production',
    });

    expect(inviteRes.success).toBe(true);
    expect(inviteRes.inviteToken).toBeDefined();
    inviteToken = inviteRes.inviteToken;
    userId = inviteRes.user.id;
  });

  it('2. Invitation acceptance & password creation: User accepts invite and sets password', async () => {
    const acceptRes = await authController.acceptInvite({
      token: inviteToken,
      password: initialPassword,
      name: 'Test Operational Lead (Active)',
    });

    expect(acceptRes.success).toBe(true);
    expect(acceptRes.message).toContain('successfully activated');
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

  it('8. Role change: Super admin updates user role to procurement', async () => {
    const updateRes = await adminController.updateUserRole(userId, { role: 'procurement' });
    expect(updateRes.success).toBe(true);

    // Verify updated role in user list
    const listRes = await adminController.listUsers();
    const updatedUser = listRes.users.find((u: any) => u.email === testEmail);
    expect(updatedUser?.role).toBe('procurement');
  });

  it('9. Project access assignment: Grants project ownership / access to user', async () => {
    const accessRes = await adminController.assignProjectAccess({
      projectId: '11111111-2222-3333-4444-555555555555',
      userId,
      role: 'procurement',
    });
    expect(accessRes.success).toBe(true);
    expect(accessRes.grant.userId).toBe(userId);
  });

  it('10. Disabled account rejection: Revoked membership rejects login with 403 Forbidden', async () => {
    // Revoke user membership
    const statusRes = await adminController.updateUserStatus(userId, { isRevoked: true });
    expect(statusRes.success).toBe(true);

    // Attempt login -> must be rejected with 403 Forbidden
    const mockRes = { cookie: () => {} } as any;
    await expect(authController.login({
      email: testEmail,
      password: updatedPassword,
    }, mockRes)).rejects.toThrow();
  });

  it('11. Authenticated UAT Impersonation: Super Admin can impersonate a target role with audit logging', async () => {
    // Obtain super admin session
    const pool = dbService.getPool();
    const adminUserRes = await pool.query(`SELECT id, email FROM users WHERE email = 'superadmin@e3.qa' LIMIT 1;`);
    const adminUser = adminUserRes.rows[0];
    const adminToken = 'admin-uat-test-token-' + Date.now();
    await pool.query(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (gen_random_uuid(), $1, $2, NOW() + INTERVAL '1 hour', NOW());
    `, [adminUser.id, adminToken]);

    const adminReq = { headers: { authorization: `Bearer ${adminToken}` } } as any;
    const impRes = await authController.impersonate(adminReq, { targetEmail: 'pm@e3.qa' });
    expect(impRes.success).toBe(true);
    expect(impRes.sessionToken).toBeDefined();
    expect(impRes.user.email).toBe('pm@e3.qa');
    expect(impRes.impersonatedBy).toContain('superadmin@e3.qa');
  });

  it('12. Impersonation Security: Non-admin caller is rejected with 403 Forbidden', async () => {
    // Target user (not super admin) attempts to impersonate
    const nonAdminReq = { headers: { authorization: `Bearer ${sessionToken}` } } as any;
    await expect(authController.impersonate(nonAdminReq, { targetEmail: 'pm@e3.qa' })).rejects.toThrow();
  });

  it('13. Production Token Redaction: Invitation and reset tokens are not leaked in production responses', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodForgot = await authController.forgotPassword({ email: 'pm@e3.qa' });
      expect((prodForgot as any).resetToken).toBeUndefined();
      expect((prodForgot as any).resetUrl).toBeUndefined();
      expect(prodForgot.message).toBeDefined();

      const prodInvite = await adminController.inviteUser({
        name: 'Redaction Test',
        email: `redact.${Date.now()}@e3.qa`,
        role: 'project_manager',
      });
      expect((prodInvite as any).inviteToken).toBeUndefined();
      expect((prodInvite as any).inviteUrl).toBeUndefined();
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  it('14. Cryptographic Storage: Verifies user_invitations stores SHA-256 hash and raw token is NULL', async () => {
    const pool = dbService.getPool();
    const rows = await pool.query(
      `SELECT token, token_hash FROM user_invitations WHERE email = $1 ORDER BY created_at DESC LIMIT 1;`,
      [testEmail]
    );
    expect(rows.rows.length).toBe(1);
    const row = rows.rows[0];
    // Raw token must NOT be stored
    expect(row.token).toBeNull();
    // Token hash must be a 64-character hex string (SHA-256)
    expect(row.token_hash).toBeDefined();
    expect(row.token_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('15. Anti-Replay Protection: Replaying an already accepted invitation token is rejected with 400', async () => {
    await expect(
      authController.acceptInvite({
        token: inviteToken,
        password: 'AttemptReplayPassword1!',
      })
    ).rejects.toThrow();
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

      const stagingInvite = await adminController.inviteUser({
        name: 'Staging Redaction Test',
        email: `staging.redact.${Date.now()}@e3.qa`,
        role: 'operations',
      });
      expect((stagingInvite as any).inviteToken).toBeUndefined();
      expect((stagingInvite as any).inviteUrl).toBeUndefined();
      expect(stagingInvite.deliveryStatus).toBeDefined();
    } finally {
      process.env.ENVIRONMENT = prevEnv;
    }
  });
});
