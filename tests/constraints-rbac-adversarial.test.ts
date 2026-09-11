import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ConstraintsController } from '../apps/api/src/operations/constraints.controller.js';
import { ConstraintsAuthGuard } from '../apps/api/src/common/constraints-auth.guard.js';
import { DbService } from '../apps/api/src/common/db.service.js';
import {
  CONSTRAINTS_VERIFY_PERMISSION,
  hasConstraintVerifyPermission,
  AUTHORIZED_VERIFIER_ROLES,
} from '@e3-eos/domain';

describe('Operational Constraints RBAC & Adversarial Reviewer Authority Suite', () => {
  let dbService: DbService;
  let controller: ConstraintsController;
  let authGuard: ConstraintsAuthGuard;
  const projectId = '00000000-0000-4000-8000-000000000001';
  const orgId = '11111111-1111-4111-8111-111111111111';

  // Seeded canonical users from PostgreSQL
  const technicalDirector = {
    userId: '10000000-0000-4000-8000-000000000005',
    email: 'karim.haddad@e3.qa',
    name: 'Karim Haddad',
    role: 'technical_director',
    organisationId: orgId,
    isSuperAdmin: false,
  };

  const clientRep = {
    userId: '10000000-0000-4000-8000-000000000008',
    email: 'mansoor.althani@client.qnd.qa',
    name: 'Sheikh Mansoor Al-Thani',
    role: 'client_representative',
    organisationId: orgId,
    isSuperAdmin: false,
  };

  const operationsLead = {
    userId: '10000000-0000-4000-8000-000000000006',
    email: 'tariq.mansoor@e3.qa',
    name: 'Tariq Al-Mansoor',
    role: 'operations',
    organisationId: orgId,
    isSuperAdmin: false,
  };

  let testConstraintId: string;

  beforeAll(async () => {
    dbService = new DbService();
    controller = new ConstraintsController(dbService);
    authGuard = new ConstraintsAuthGuard(undefined, dbService);

    // Create a fresh constraint for this adversarial suite
    const createReq = {
      sessionUser: technicalDirector,
      organisationId: orgId,
    } as any;

    const res = await controller.createConstraint(projectId, {
      constraintType: 'venue_operational_noise',
      sourceType: 'venue',
      sourceOrganization: 'DECC Operations',
      locationZone: 'Main Arena',
      timeWindow: '24 Hours',
      limitValue: 88,
      unit: 'dB(A)',
      priority: 'high',
    }, createReq);

    testConstraintId = res.data.id;

    // Attach source document
    await controller.attachSource(projectId, testConstraintId, {
      controlledDocumentId: 'doc-decc-fp-01-def',
      documentRevisionId: 'rev-decc-fp-01-def',
      pageClauseSection: 'Section 3.2 Acoustic Guidelines',
    }, createReq);

    // Transition to Under Review
    await controller.submitForReview(projectId, testConstraintId, createReq);
  });

  afterAll(async () => {
    // Clean up test constraint
    try {
      const pool = dbService.getPool();
      await pool.query('DELETE FROM constraint_verifications WHERE constraint_id = $1', [testConstraintId]);
      await pool.query('DELETE FROM constraint_source_links WHERE constraint_id = $1', [testConstraintId]);
      await pool.query('DELETE FROM operational_constraints WHERE id = $1', [testConstraintId]);
    } catch {}
  });

  it('RBAC-01: Prohibits unauthenticated verification (HTTP 401) when session is missing', async () => {
    const unauthenticatedReq = {
      headers: {},
      url: `/projects/${projectId}/constraints/${testConstraintId}/verify`,
    } as any;

    // Guard rejects with 401
    await expect(
      authGuard.canActivate({
        switchToHttp: () => ({ getRequest: () => unauthenticatedReq }),
      } as any)
    ).rejects.toThrow();

    // Controller also fails closed with 401 if sessionUser is absent
    await expect(
      controller.verifyConstraint(
        projectId,
        testConstraintId,
        { reviewerComment: 'Unauthorized attempt' },
        unauthenticatedReq
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        status: 401,
      })
    );
  });

  it('RBAC-02: Ignores forged client headers (x-user-role, x-user-name) attempting to elevate privileges', async () => {
    // Adversary client injects forged headers attempting to disguise as Technical Director
    const forgedHeaderReq = {
      headers: {
        'x-user-role': 'technical_director',
        'x-user-name': 'Karim Haddad (Technical Director)',
        'x-user-id': '10000000-0000-4000-8000-000000000005',
        'x-authenticated-role': 'super_admin',
      },
      url: `/projects/${projectId}/constraints/${testConstraintId}/verify`,
    } as any;

    // Guard strictly ignores client headers and fails closed (401 Unauthorized)
    await expect(
      authGuard.canActivate({
        switchToHttp: () => ({ getRequest: () => forgedHeaderReq }),
      } as any)
    ).rejects.toThrow();

    // Controller fails closed because sessionUser was NOT set by server-side session
    await expect(
      controller.verifyConstraint(
        projectId,
        testConstraintId,
        { reviewerComment: 'Attempting spoofing with forged headers' },
        forgedHeaderReq
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        status: 401,
      })
    );
  });

  it('RBAC-03: Rejects authenticated user lacking constraints.verify permission with HTTP 403', async () => {
    // Authenticated as client_representative
    expect(hasConstraintVerifyPermission('client_representative', false)).toBe(false);

    const unauthorizedClientReq = {
      sessionUser: clientRep,
      headers: {},
      url: `/projects/${projectId}/constraints/${testConstraintId}/verify`,
    } as any;

    await expect(
      controller.verifyConstraint(
        projectId,
        testConstraintId,
        { reviewerComment: 'Client representative attempting verification' },
        unauthorizedClientReq
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        status: 403,
      })
    );

    // Authenticated as operations lead (also lacks constraints.verify authority)
    expect(hasConstraintVerifyPermission('operations', false)).toBe(false);

    const unauthorizedOpsReq = {
      sessionUser: operationsLead,
      headers: {},
      url: `/projects/${projectId}/constraints/${testConstraintId}/verify`,
    } as any;

    await expect(
      controller.verifyConstraint(
        projectId,
        testConstraintId,
        { reviewerComment: 'Operations attempting verification' },
        unauthorizedOpsReq
      )
    ).rejects.toThrowError(
      expect.objectContaining({
        status: 403,
      })
    );
  });

  it('RBAC-04: Confirms all authorized verifier roles have constraints.verify permission', () => {
    expect(CONSTRAINTS_VERIFY_PERMISSION).toBe('constraints.verify');

    // 5 canonical authoritative verifier roles
    const expectedAuthorized = [
      'technical_director',
      'structural_engineer',
      'hse_director',
      'project_director',
      'super_admin',
    ];

    for (const role of expectedAuthorized) {
      expect(AUTHORIZED_VERIFIER_ROLES).toContain(role);
      expect(hasConstraintVerifyPermission(role, false)).toBe(true);
    }

    // Super admin override
    expect(hasConstraintVerifyPermission('any_role', true)).toBe(true);

    // Unauthorized roles
    const unauthorizedRoles = [
      'client_representative',
      'operations',
      'commercial_director',
      'procurement_lead',
      'site_manager',
      'finance_lead',
      'logistics_lead',
      'viewer',
    ];

    for (const role of unauthorizedRoles) {
      expect(hasConstraintVerifyPermission(role, false)).toBe(false);
    }
  });

  it('RBAC-05: Permits authorized Technical Director session and derives reviewer identity strictly from session', async () => {
    const authorizedReq = {
      sessionUser: technicalDirector,
      headers: {
        // Even if an adversary supplied conflicting headers, sessionUser MUST take precedence
        'x-user-name': 'Attacker Spoof Name',
        'x-user-role': 'client_representative',
      },
      url: `/projects/${projectId}/constraints/${testConstraintId}/verify`,
    } as any;

    const res = await controller.verifyConstraint(
      projectId,
      testConstraintId,
      {
        pageClauseSection: 'Section 3.2 Acoustic Guidelines',
        extractedRuleValue: '88 dB(A)',
        applicabilityStatement: 'Main Arena Live Shifts',
        reviewerComment: 'Authoritative venue noise envelope verified against DECC floorplan.',
      },
      authorizedReq
    );

    expect(res.data.verificationStatus).toBe('Verified');
    expect(res.data.verifiedBy).toBe('Karim Haddad'); // Server-side session user name!
    expect(res.data.sourceDocumentHash).toBe('9aaedaecbd3adaf9fb2547cca03643a4ac70c8697d8a695d94c71b0078798ffa');
    expect(res.data.verificationRecord?.reviewerRole).toBe('technical_director');
    expect(res.data.verificationRecord?.reviewerIdentity).toBe('Karim Haddad');
  });
});
