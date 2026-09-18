import { describe, it, expect, beforeAll } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import {
  CANONICAL_ROLES,
  CANONICAL_ROLE_DEFINITIONS,
  hasRolePermission,
  getRoleAuthorityCeiling,
  canApproveCommercialAmount,
  isSeparationOfDutiesCompliant,
  canAccessRestrictedBankDetails,
  normalizeRole,
  PERM_ADMIN_MANAGE,
  PERM_USERS_PROVISION,
  PERM_ROLES_ASSIGN,
  PERM_COMMERCIAL_APPROVE,
  PERM_PO_CREATE,
  PERM_PO_APPROVE,
  PERM_BANK_DETAILS_READ,
  PERM_PORTAL_READ,
} from '@e3-eos/domain';
import {
  TenantIsolationGuard,
  RequireRoles,
  RequirePermissions,
  AllowedAudiences,
  Public,
  REQUIRED_ROLES_KEY,
  REQUIRED_PERMISSIONS_KEY,
  ALLOWED_AUDIENCES_KEY,
  IS_PUBLIC_KEY,
} from '../apps/api/src/common/tenant.guard.js';
import { AdminController } from '../apps/api/src/admin/admin.controller.ts';
import {
  CommercialFinanceController,
  supplierInvoicesRepo,
  financialPositionsRepo,
} from '../apps/api/src/commercial/commercial-finance.controller.ts';
import {
  GovernanceController,
  approvalRequestRepository,
} from '../apps/api/src/governance/governance.controller.ts';
import {
  ProcurementController,
  vendorRepository,
} from '../apps/api/src/procurement/procurement.controller.ts';
import { projectRepository } from '../apps/api/src/projects/projects.controller.js';
import { DbService } from '../apps/api/src/common/db.service.js';

// Helper to create mock ExecutionContext
function createMockExecutionContext(options: {
  headers?: Record<string, string>;
  sessionUser?: any;
  metadata?: {
    requiredRoles?: string[];
    requiredPermissions?: string[];
    allowedAudiences?: string[];
    isPublic?: boolean;
  };
}): { context: ExecutionContext; reflector: Reflector } {
  const req: any = {
    headers: options.headers || {},
    sessionUser: options.sessionUser,
  };

  const reflector = new Reflector();
  const handler = () => {};
  const cls = class TestController {};

  if (options.metadata?.requiredRoles) {
    Reflect.defineMetadata(REQUIRED_ROLES_KEY, options.metadata.requiredRoles, handler);
  }
  if (options.metadata?.requiredPermissions) {
    Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, options.metadata.requiredPermissions, handler);
  }
  if (options.metadata?.allowedAudiences) {
    Reflect.defineMetadata(ALLOWED_AUDIENCES_KEY, options.metadata.allowedAudiences, handler);
  }
  if (options.metadata?.isPublic) {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  }

  const context: ExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}) as any,
      getNext: () => ({}) as any,
    }),
    getHandler: () => handler,
    getClass: () => cls,
  } as any;

  return { context, reflector };
}

describe('Enterprise RBAC & Separation of Duties (SoD) Comprehensive Verification', () => {
  const orgId = '11111111-1111-4111-8111-111111111111';
  const projectId = 'PRJ-QND-2026';

  // ===========================================================================
  // SECTION 1: Canonical Domain Role Catalog & Ceilings
  // ===========================================================================
  describe('1. Canonical Role Catalog & Authority Ceilings', () => {
    it('defines all 13 canonical roles with complete metadata', () => {
      expect(CANONICAL_ROLES).toHaveLength(13);
      for (const role of CANONICAL_ROLES) {
        const def = CANONICAL_ROLE_DEFINITIONS[role];
        expect(def).toBeDefined();
        expect(def.role).toBe(role);
        expect(def.title).toBeTruthy();
        expect(def.permissions).toBeInstanceOf(Array);
        expect(def.authorityCeilingQar).toBeGreaterThanOrEqual(0);
      }
    });

    it('enforces exact POL-COMM authority ceilings across role tiers', () => {
      // Tier 1: Project Manager <= 50,000 QAR
      expect(getRoleAuthorityCeiling('project_manager')).toBe(50000);
      expect(canApproveCommercialAmount('project_manager', 50000)).toBe(true);
      expect(canApproveCommercialAmount('project_manager', 50001)).toBe(false);

      // Tier 2: Finance & Project Director <= 250,000 QAR
      expect(getRoleAuthorityCeiling('finance')).toBe(250000);
      expect(getRoleAuthorityCeiling('project_director')).toBe(250000);
      expect(canApproveCommercialAmount('finance', 250000)).toBe(true);
      expect(canApproveCommercialAmount('finance', 250001)).toBe(false);
      expect(canApproveCommercialAmount('project_director', 250000)).toBe(true);
      expect(canApproveCommercialAmount('project_director', 250001)).toBe(false);

      // Tier 3: Executive & Super Admin > 250,000 QAR (Unrestricted)
      expect(getRoleAuthorityCeiling('executive')).toBe(Infinity);
      expect(getRoleAuthorityCeiling('super_admin')).toBe(Infinity);
      expect(canApproveCommercialAmount('executive', 15000000)).toBe(true);
      expect(canApproveCommercialAmount('super_admin', 25000000)).toBe(true);

      // Non-authorizing roles have 0 QAR ceiling
      expect(getRoleAuthorityCeiling('field_supervisor')).toBe(0);
      expect(canApproveCommercialAmount('field_supervisor', 100)).toBe(false);
      expect(getRoleAuthorityCeiling('procurement')).toBe(0);
      expect(canApproveCommercialAmount('procurement', 100)).toBe(false);
      expect(getRoleAuthorityCeiling('operations')).toBe(0);
      expect(canApproveCommercialAmount('operations', 100)).toBe(false);
    });

    it('normalizes role aliases seamlessly without breaking security', () => {
      expect(normalizeRole('financial_controller')).toBe('finance');
      expect(normalizeRole('cfo')).toBe('finance');
      expect(normalizeRole('commercial_director')).toBe('executive');
      expect(normalizeRole('Lead PM')).toBe('project_manager');

      expect(canApproveCommercialAmount('financial_controller', 200000)).toBe(true);
      expect(canApproveCommercialAmount('financial_controller', 300000)).toBe(false);
      expect(canApproveCommercialAmount('commercial_director', 500000)).toBe(true);
    });
  });

  // ===========================================================================
  // SECTION 2: Fine-Grained Permissions & Separation of Duties
  // ===========================================================================
  describe('2. Fine-Grained Permissions & Separation of Duties', () => {
    it('verifies permission assignments per role', () => {
      // Super admin has all permissions
      expect(hasRolePermission('super_admin', PERM_ADMIN_MANAGE)).toBe(true);
      expect(hasRolePermission('super_admin', 'any.custom.perm')).toBe(true);

      // Finance permissions
      expect(hasRolePermission('finance', PERM_COMMERCIAL_APPROVE)).toBe(true);
      expect(hasRolePermission('finance', PERM_BANK_DETAILS_READ)).toBe(true);
      expect(hasRolePermission('finance', PERM_ADMIN_MANAGE)).toBe(false);

      // Procurement permissions
      expect(hasRolePermission('procurement', PERM_PO_CREATE)).toBe(true);
      expect(hasRolePermission('procurement', PERM_COMMERCIAL_APPROVE)).toBe(false);

      // Client portal permissions
      expect(hasRolePermission('client_user', PERM_PORTAL_READ)).toBe(true);
      expect(hasRolePermission('client_user', PERM_PO_CREATE)).toBe(false);
    });

    it('enforces strict Separation of Duties (SoD) pairing conflicts', () => {
      // Conflict 1: Procurement + Finance (Purchaser cannot approve payment)
      const sod1 = isSeparationOfDutiesCompliant('procurement', 'finance');
      expect(sod1.compliant).toBe(false);
      expect(sod1.conflictReason).toContain('POL-SOD-01');

      const sod1Rev = isSeparationOfDutiesCompliant('finance', 'procurement');
      expect(sod1Rev.compliant).toBe(false);

      // Conflict 2: Operations + HSE (Installer cannot sign own safety permit)
      const sod2 = isSeparationOfDutiesCompliant('operations', 'hse_quality');
      expect(sod2.compliant).toBe(false);
      expect(sod2.conflictReason).toContain('POL-SOD-02');

      // Conflict 3: Client User + Any Internal Role
      const sod3 = isSeparationOfDutiesCompliant('client_user', 'project_manager');
      expect(sod3.compliant).toBe(false);
      expect(sod3.conflictReason).toContain('POL-SOD-03');

      // Compliant pairings
      expect(isSeparationOfDutiesCompliant('project_manager', 'design_production').compliant).toBe(true);
      expect(isSeparationOfDutiesCompliant('finance', 'finance').compliant).toBe(true);
    });

    it('enforces restricted vendor bank details read access', () => {
      expect(canAccessRestrictedBankDetails('super_admin')).toBe(true);
      expect(canAccessRestrictedBankDetails('executive')).toBe(true);
      expect(canAccessRestrictedBankDetails('finance')).toBe(true);
      expect(canAccessRestrictedBankDetails('procurement')).toBe(true);

      // Prohibited roles
      expect(canAccessRestrictedBankDetails('project_manager')).toBe(false);
      expect(canAccessRestrictedBankDetails('operations')).toBe(false);
      expect(canAccessRestrictedBankDetails('field_supervisor')).toBe(false);
      expect(canAccessRestrictedBankDetails('client_user')).toBe(false);
    });
  });

  // ===========================================================================
  // SECTION 3: TenantIsolationGuard RBAC & Audience Enforcement
  // ===========================================================================
  describe('3. TenantIsolationGuard Execution & Enforcement', () => {
    it('rejects unauthenticated requests with HTTP 401 UNAUTHENTICATED', async () => {
      const { context, reflector } = createMockExecutionContext({});
      const guard = new TenantIsolationGuard(reflector);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(context);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(err.getResponse().code).toBe('UNAUTHENTICATED');
      }
    });

    it('allows public endpoints without authentication', async () => {
      const { context, reflector } = createMockExecutionContext({
        metadata: { isPublic: true },
      });
      const guard = new TenantIsolationGuard(reflector);

      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('rejects client audience calling internal-only routes with HTTP 403 FORBIDDEN_AUDIENCE', async () => {
      const { context, reflector } = createMockExecutionContext({
        sessionUser: {
          userId: 'user-client-01',
          organisationId: orgId,
          role: 'client_user',
          audience: 'client',
        },
        metadata: { allowedAudiences: ['internal'] },
      });
      const guard = new TenantIsolationGuard(reflector);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(context);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.getResponse().code).toBe('FORBIDDEN_AUDIENCE');
      }
    });

    it('rejects unauthorized role calling protected route with HTTP 403 FORBIDDEN_ROLE', async () => {
      const { context, reflector } = createMockExecutionContext({
        sessionUser: {
          userId: 'user-pm-01',
          organisationId: orgId,
          role: 'project_manager',
          audience: 'internal',
        },
        metadata: { requiredRoles: ['super_admin'] },
      });
      const guard = new TenantIsolationGuard(reflector);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      try {
        await guard.canActivate(context);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.getResponse().code).toBe('FORBIDDEN_ROLE');
      }
    });

    it('allows authorized role calling protected route', async () => {
      const { context, reflector } = createMockExecutionContext({
        sessionUser: {
          userId: 'user-exec-01',
          organisationId: orgId,
          role: 'executive',
          audience: 'internal',
        },
        metadata: { requiredRoles: ['super_admin', 'executive'] },
      });
      const guard = new TenantIsolationGuard(reflector);

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it('grants Super Admin root access across any role requirements', async () => {
      const { context, reflector } = createMockExecutionContext({
        sessionUser: {
          userId: 'user-sa-01',
          organisationId: orgId,
          role: 'super_admin',
          isSuperAdmin: true,
          audience: 'internal',
        },
        metadata: { requiredRoles: ['finance'] },
      });
      const guard = new TenantIsolationGuard(reflector);

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it('evaluates fine-grained permission requirements', async () => {
      // User with role 'finance' attempting route requiring PERM_COMMERCIAL_APPROVE
      const { context: ctxFinance, reflector: refFinance } = createMockExecutionContext({
        sessionUser: {
          userId: 'user-fin-01',
          organisationId: orgId,
          role: 'finance',
          audience: 'internal',
        },
        metadata: { requiredPermissions: [PERM_COMMERCIAL_APPROVE] },
      });
      const guardFinance = new TenantIsolationGuard(refFinance);
      expect(await guardFinance.canActivate(ctxFinance)).toBe(true);

      // User with role 'operations' attempting route requiring PERM_COMMERCIAL_APPROVE
      const { context: ctxOps, reflector: refOps } = createMockExecutionContext({
        sessionUser: {
          userId: 'user-ops-01',
          organisationId: orgId,
          role: 'operations',
          audience: 'internal',
        },
        metadata: { requiredPermissions: [PERM_COMMERCIAL_APPROVE] },
      });
      const guardOps = new TenantIsolationGuard(refOps);
      await expect(guardOps.canActivate(ctxOps)).rejects.toThrow(HttpException);
    });
  });

  // ===========================================================================
  // SECTION 4: Admin Controller RBAC Lock
  // ===========================================================================
  describe('4. Admin Controller RBAC Lockdown', () => {
    let adminController: AdminController;

    beforeAll(() => {
      adminController = new AdminController();
    });

    it('exposes public canonical roles catalog without auth', () => {
      const res = adminController.getRoles();
      expect(res.roles).toHaveLength(13);
      expect(res.roles.find((r) => r.role === 'super_admin')).toBeDefined();
    });

    it('requires super_admin or executive for listUsers and project-access', () => {
      const listUsersRoles = Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminController.prototype.listUsers);
      expect(listUsersRoles).toEqual(['super_admin', 'executive']);

      const projAccessRoles = Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminController.prototype.getProjectAccess);
      expect(projAccessRoles).toEqual(['super_admin', 'executive']);
    });

    it('strictly restricts user invitations and role mutations to super_admin', () => {
      const inviteRoles = Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminController.prototype.inviteUser);
      expect(inviteRoles).toEqual(['super_admin']);

      const updateRoleRoles = Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminController.prototype.updateUserRole);
      expect(updateRoleRoles).toEqual(['super_admin']);

      const updateStatusRoles = Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminController.prototype.updateUserStatus);
      expect(updateStatusRoles).toEqual(['super_admin']);

      const registerPolicyRoles = Reflect.getMetadata(REQUIRED_ROLES_KEY, AdminController.prototype.registerApprovalPolicy);
      expect(registerPolicyRoles).toEqual(['super_admin']);
    });
  });

  // ===========================================================================
  // SECTION 5: Commercial Financial Approval & Anti-Self-Approval (POL-COMM & SoD)
  // ===========================================================================
  describe('5. Commercial Finance Authority Ceilings & Anti-Self-Approval', () => {
    let commController: CommercialFinanceController;

    beforeAll(() => {
      commController = new CommercialFinanceController();
    });

    it('rejects self-approval of supplier invoices with HTTP 403 SELF_APPROVAL_PROHIBITED', () => {
      // Seed invoice with submittedBy
      const invoiceId = 'INV-SOD-TEST-001';
      supplierInvoicesRepo.set(invoiceId, {
        id: invoiceId,
        projectId,
        totalAmount: '45000',
        submittedBy: 'USR-SUBMITTER-01',
        status: 'pending',
        threeWayMatchStatus: 'matched',
      });

      const mockReq = {
        userId: 'USR-SUBMITTER-01',
        userRole: 'finance',
        headers: { 'x-user-id': 'USR-SUBMITTER-01', 'x-user-role': 'finance' },
      } as any;

      expect(() => {
        commController.approveSupplierInvoice(
          invoiceId,
          {
            invoiceId,
            approvedAmount: 45000,
            authorizedBy: 'USR-SUBMITTER-01',
            approverRole: 'finance',
            justification: 'Self-approval attempt',
          },
          mockReq
        );
      }).toThrow(HttpException);

      try {
        commController.approveSupplierInvoice(
          invoiceId,
          {
            invoiceId,
            approvedAmount: 45000,
            authorizedBy: 'USR-SUBMITTER-01',
            approverRole: 'finance',
            justification: 'Self-approval attempt',
          },
          mockReq
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.getResponse().code).toBe('SELF_APPROVAL_PROHIBITED');
      }
    });

    it('rejects approvals exceeding role financial authority ceiling with HTTP 403 INSUFFICIENT_APPROVAL_AUTHORITY', () => {
      // Invoice of 150,000 QAR (Exceeds PM ceiling of 50,000 QAR)
      const invoiceId = 'INV-COMM-CEIL-001';
      supplierInvoicesRepo.set(invoiceId, {
        id: invoiceId,
        projectId,
        totalAmount: '150000',
        submittedBy: 'USR-SUBMITTER-OTHER',
        status: 'pending',
        threeWayMatchStatus: 'matched',
      });

      const pmReq = {
        userId: 'USR-PM-01',
        userRole: 'project_manager',
        headers: { 'x-user-id': 'USR-PM-01', 'x-user-role': 'project_manager' },
      } as any;

      expect(() => {
        commController.approveSupplierInvoice(
          invoiceId,
          {
            invoiceId,
            approvedAmount: 150000,
            authorizedBy: 'USR-PM-01',
            approverRole: 'project_manager',
            justification: 'PM exceeding 50k QAR ceiling',
          },
          pmReq
        );
      }).toThrow(HttpException);

      try {
        commController.approveSupplierInvoice(
          invoiceId,
          {
            invoiceId,
            approvedAmount: 150000,
            authorizedBy: 'USR-PM-01',
            approverRole: 'project_manager',
            justification: 'PM exceeding 50k QAR ceiling',
          },
          pmReq
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.getResponse().code).toBe('INSUFFICIENT_APPROVAL_AUTHORITY');
      }
    });

    it('allows authorized role (finance) to approve commitment within authority ceiling', () => {
      const invoiceId = 'INV-SUP-001'; // Pre-seeded 145,000 QAR
      supplierInvoicesRepo.set(invoiceId, {
        id: invoiceId,
        projectId,
        totalAmount: '145000',
        submittedBy: 'USR-SUBMITTER-OTHER',
        status: 'pending',
        threeWayMatchStatus: 'matched',
      });

      const financeReq = {
        userId: 'USR-FIN-01',
        userRole: 'finance',
        headers: { 'x-user-id': 'USR-FIN-01', 'x-user-role': 'finance' },
      } as any;

      const res = commController.approveSupplierInvoice(
        invoiceId,
        {
          invoiceId,
          approvedAmount: 145000,
          authorizedBy: 'USR-FIN-01',
          approverRole: 'finance',
          justification: 'Valid PO matched and within 250k QAR threshold',
        },
        financeReq
      );

      expect(res.success).toBe(true);
      expect(res.invoice.status).toBe('approved');
      expect(res.invoice.approvedAmount).toBe('145000');
    });
  });

  // ===========================================================================
  // SECTION 6: Governance Approval Decisions & Anti-Self-Approval
  // ===========================================================================
  describe('6. Governance Approval Decisions & Anti-Self-Approval', () => {
    let govController: GovernanceController;

    beforeAll(() => {
      govController = new GovernanceController();
      projectRepository.set('00000000-0000-4000-8000-000000000001', {
        id: '00000000-0000-4000-8000-000000000001',
        organisationId: orgId,
        projectCode: 'PRJ-TEST-001',
        title: 'Governance Test Project',
        description: 'Testing governance anti-self-approval and thresholds',
        originCode: 'DIRECT',
        ownerId: 'USR-OWNER-01',
        maturity: 'active',
        outcome: 'active',
        rowVersion: 1,
      });
    });

    it('prohibits self-approval in governance approval requests', () => {
      const approvalId = 'gov-appr-sod-001';
      const validVersionId = '00000000-0000-4000-8000-000000000101';
      const validHash = 'a'.repeat(64);
      approvalRequestRepository.set(approvalId, {
        id: approvalId,
        projectId: '00000000-0000-4000-8000-000000000001',
        organisationId: orgId,
        targetType: 'purchase_order',
        targetId: 'po-101',
        targetVersionId: validVersionId,
        targetHash: validHash,
        requiredRole: 'executive',
        status: 'pending',
        requesterId: 'USR-REQUESTER-01',
      });

      const selfReq = {
        userId: 'USR-REQUESTER-01',
        userRole: 'executive',
        organisationId: orgId,
        headers: { 'x-user-id': 'USR-REQUESTER-01', 'x-user-role': 'executive' },
      } as any;

      expect(() => {
        govController.decideApproval(
          '00000000-0000-4000-8000-000000000001',
          approvalId,
          {
            targetVersionId: validVersionId,
            targetHash: validHash,
            outcome: 'approved',
            comment: 'Attempting self-approval',
          },
          selfReq
        );
      }).toThrow(HttpException);

      try {
        govController.decideApproval(
          '00000000-0000-4000-8000-000000000001',
          approvalId,
          {
            targetVersionId: validVersionId,
            targetHash: validHash,
            outcome: 'approved',
            comment: 'Attempting self-approval',
          },
          selfReq
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.getResponse().code).toBe('SELF_APPROVAL_PROHIBITED');
      }
    });

    it('blocks approver with insufficient ceiling for commercial commitments', () => {
      const approvalId = 'gov-appr-ceil-001';
      const validVersionId = '00000000-0000-4000-8000-000000000500';
      const validHash = 'b'.repeat(64);
      approvalRequestRepository.set(approvalId, {
        id: approvalId,
        projectId: '00000000-0000-4000-8000-000000000001',
        organisationId: orgId,
        targetType: 'purchase_order',
        targetId: 'po-500k',
        targetVersionId: validVersionId,
        targetHash: validHash,
        requiredRole: 'executive',
        status: 'pending',
        requesterId: 'USR-CREATOR-01',
        amount: 500000, // Exceeds Finance / PD limit of 250k QAR
      });

      const financeReq = {
        userId: 'USR-FIN-OTHER',
        userRole: 'finance',
        organisationId: orgId,
        headers: { 'x-user-id': 'USR-FIN-OTHER', 'x-user-role': 'finance' },
      } as any;

      expect(() => {
        govController.decideApproval(
          '00000000-0000-4000-8000-000000000001',
          approvalId,
          {
            targetVersionId: validVersionId,
            targetHash: validHash,
            outcome: 'approved',
            comment: 'Finance attempting to approve 500k QAR',
          },
          financeReq
        );
      }).toThrow(HttpException);

      try {
        govController.decideApproval(
          '00000000-0000-4000-8000-000000000001',
          approvalId,
          {
            targetVersionId: validVersionId,
            targetHash: validHash,
            outcome: 'approved',
            comment: 'Finance attempting to approve 500k QAR',
          },
          financeReq
        );
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.getResponse().code).toBe('INSUFFICIENT_APPROVAL_AUTHORITY');
      }
    });
  });

  // ===========================================================================
  // SECTION 7: Vendor Banking Privacy RBAC Protection
  // ===========================================================================
  describe('7. Vendor Banking Privacy RBAC Protection', () => {
    let procController: ProcurementController;
    const vendorId = '00000000-0000-4000-a000-000000000001';

    beforeAll(() => {
      procController = new ProcurementController();
    });

    it('masks bank details for unauthorized roles in getVendor', () => {
      const fieldReq = {
        organisationId: orgId,
        userRole: 'field_supervisor',
        headers: { 'x-user-role': 'field_supervisor' },
      } as any;

      const res = procController.getVendor(vendorId, fieldReq);
      expect(res.data.restrictedBankDetailsMasked).toBe(true);
      expect(res.data.bankDetails.accountNumber).toContain('••••');
      expect(res.data.bankDetails.iban).toContain('••••');
    });

    it('rejects direct restricted bank endpoint access for unauthorized roles with HTTP 403', () => {
      const fieldReq = {
        organisationId: orgId,
        userRole: 'field_supervisor',
        headers: { 'x-user-role': 'field_supervisor' },
      } as any;

      expect(() => {
        procController.getVendorRestrictedBankDetails(vendorId, fieldReq);
      }).toThrow(HttpException);

      try {
        procController.getVendorRestrictedBankDetails(vendorId, fieldReq);
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect(err.getResponse().detail).toContain('not authorized to access sensitive vendor banking details');
      }
    });

    it('grants unmasked bank details to finance and procurement roles', () => {
      const finReq = {
        organisationId: orgId,
        userRole: 'finance',
        headers: { 'x-user-role': 'finance' },
      } as any;

      const resFin = procController.getVendorRestrictedBankDetails(vendorId, finReq);
      expect(resFin.data.bankDetails).toBeDefined();
      expect(resFin.data.bankDetails.iban).not.toContain('••••');

      const procReq = {
        organisationId: orgId,
        userRole: 'procurement',
        headers: { 'x-user-role': 'procurement' },
      } as any;

      const resProc = procController.getVendorRestrictedBankDetails(vendorId, procReq);
      expect(resProc.data.bankDetails).toBeDefined();
      expect(resProc.data.bankDetails.iban).not.toContain('••••');
    });
  });
});
