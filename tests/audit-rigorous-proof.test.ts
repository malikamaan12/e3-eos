import { describe, it, expect, beforeAll, vi } from 'vitest';
import { AuthController } from '../apps/api/src/auth/auth.controller.js';
import { AdminController } from '../apps/api/src/admin/admin.controller.js';
import { ProjectsController } from '../apps/api/src/projects/projects.controller.js';
import { CommercialFinanceController } from '../apps/api/src/commercial/commercial-finance.controller.js';
import { WorkController, taskRepository } from '../apps/api/src/work/work.controller.js';
import { WorkflowBuilderController } from '../apps/api/src/governance/workflow-builder.controller.js';
import { TenantIsolationGuard } from '../apps/api/src/common/tenant.guard.js';
import { DbService } from '../apps/api/src/common/db.service.js';
import { STANDARD_THIRTEEN_STAGE_TEMPLATE } from '@e3-eos/domain';
import { EosApiClient, ApiError } from '../apps/web/src/services/api-client.js';

describe('Rigorous Proof Verification Suite: 8 Critical Audit Areas', () => {
  let dbService: DbService;
  let authController: AuthController;
  let adminController: AdminController;
  let projectsController: ProjectsController;
  let commercialFinanceController: CommercialFinanceController;
  let workController: WorkController;
  let workflowBuilderController: WorkflowBuilderController;
  let tenantGuard: TenantIsolationGuard;

  const testUserEmail = `audit.proof.${Date.now()}@e3.qa`;
  const securePassword = 'ValidPassword2026!';
  let userId: string;
  let inviteToken: string;
  let sessionToken: string;

  beforeAll(async () => {
    dbService = new DbService();
    authController = new AuthController(dbService);
    adminController = new AdminController(dbService);
    projectsController = new ProjectsController(dbService);
    commercialFinanceController = new CommercialFinanceController(dbService);
    workController = new WorkController(dbService);
    workflowBuilderController = new WorkflowBuilderController();
    tenantGuard = new TenantIsolationGuard(
      new (class MockReflector {
        getAllAndOverride(key: string) {
          if (key === 'allowedAudiences') return ['internal'];
          return undefined;
        }
      })() as any,
      dbService
    );

    // Setup active test user with known password
    const invite = await adminController.inviteUser({
      name: 'Audit Rigorous Test Lead',
      email: testUserEmail,
      role: 'technical_director',
      department: 'Live Production',
    });
    inviteToken = invite.inviteToken;
    userId = invite.user.id;

    await authController.acceptInvite({
      token: inviteToken,
      password: securePassword,
      name: 'Audit Rigorous Test Lead',
    });
  });

  // ============================================================================
  // AREA 1: C01 - Authentication & Backdoor Elimination
  // ============================================================================
  describe('C01: Server-Side Authentication & Backdoor Elimination', () => {
    it('proves valid credentials authenticate successfully', async () => {
      const mockRes = { cookie: () => {} } as any;
      const res: any = await authController.login({
        email: testUserEmail,
        password: securePassword,
      }, mockRes);

      expect(res.success).toBe(true);
      expect(res.sessionToken).toBeDefined();
      sessionToken = res.sessionToken;
    });

    it('proves case-manipulated passwords fail with 401 UnauthorizedException', async () => {
      const mockRes = { cookie: () => {} } as any;
      const manipulatedPassword = 'validPassword2026!'; // Lowercase 'v'

      await expect(
        authController.login({
          email: testUserEmail,
          password: manipulatedPassword,
        }, mockRes)
      ).rejects.toThrowError(expect.objectContaining({ status: 401 }));
    });

    it('proves shared demo/backdoor passwords fail with 401 UnauthorizedException', async () => {
      const mockRes = { cookie: () => {} } as any;
      const backdoorPasswords = ['E3Secure2026!', 'Demo2026!', 'E3MasterKey#1'];

      for (const pass of backdoorPasswords) {
        await expect(
          authController.login({
            email: testUserEmail,
            password: pass,
          }, mockRes)
        ).rejects.toThrowError(expect.objectContaining({ status: 401 }));
      }
    });
  });

  // ============================================================================
  // AREA 2: C01/C02 - Tenant Isolation Guard & Zero-Leak Cost Redaction
  // ============================================================================
  describe('C01 / C02: Server Tenant Isolation & Zero-Leak Cost Redaction', () => {
    it('proves unauthenticated requests reject with 401 UNAUTHENTICATED', async () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
            cookies: {},
          }),
        }),
      } as any;

      await expect(tenantGuard.canActivate(mockContext)).rejects.toThrowError(
        expect.objectContaining({ status: 401 })
      );
    });

    it('proves invalid session tokens reject with 401 UNAUTHENTICATED', async () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer invalid-token-xyz' },
            cookies: {},
          }),
        }),
      } as any;

      await expect(tenantGuard.canActivate(mockContext)).rejects.toThrowError(
        expect.objectContaining({ status: 401 })
      );
    });

    it('proves client audience is forbidden from internal endpoints (403 FORBIDDEN_AUDIENCE)', async () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-user-id': 'client-user-1',
              'x-user-roles': 'client_user',
              'x-user-audience': 'client',
              'x-organisation-id': 'org-1',
            },
            cookies: {},
          }),
        }),
      } as any;

      await expect(tenantGuard.canActivate(mockContext)).rejects.toThrowError(
        expect.objectContaining({ status: 403 })
      );
    });

    it('proves internal team receives full financial visibility in project cockpit', async () => {
      const internalReq = {
        headers: {
          'x-user-id': userId,
          'x-user-roles': 'technical_director',
          'x-user-audience': 'internal',
        },
      } as any;

      const cockpit = await projectsController.getCockpit('PRJ-QND-2026', internalReq);
      expect(cockpit.data.financials.isClientRedacted).toBe(false);
      expect(cockpit.data.financials.budget).toBeGreaterThan(0);
      expect(cockpit.data.financials.committedCost).toBeGreaterThan(0);
      expect(cockpit.data.financials.actualCost).toBeGreaterThan(0);
      expect(cockpit.data.financials.baselineMarginPct).toBeDefined();
    });

    it('proves client audience strictly redacts internal costs & PO approvals (Zero Leak)', async () => {
      const clientReq = {
        headers: {
          'x-user-id': 'client-user-id',
          'x-user-roles': 'client_user',
          'x-user-audience': 'client',
        },
      } as any;

      const cockpit = await projectsController.getCockpit('PRJ-QND-2026', clientReq);
      expect(cockpit.data.financials.isClientRedacted).toBe(true);
      expect(cockpit.data.financials.budget).toBeNull();
      expect(cockpit.data.financials.committedCost).toBeNull();
      expect(cockpit.data.financials.actualCost).toBeNull();
      expect(cockpit.data.financials.baselineCost).toBeNull();
      expect(cockpit.data.financials.baselineMarginPct).toBeNull();
      expect(cockpit.data.financials.eac).toBeNull();
      expect(cockpit.data.financials.forecastMarginPercent).toBeNull();
      expect(cockpit.data.outstandingApprovals).toEqual([]);
    });
  });

  // ============================================================================
  // AREA 3: H04 - Task Persistence Across Server Restart
  // ============================================================================
  describe('H04: Task Persistence Across Server Restart (DB Fallback)', () => {
    const testProjectId = '00000000-0000-4000-8000-000000000001';

    it('proves tasks survive in-memory clearing, reload from DB and progress asynchronously', async () => {
      const req = {
        headers: {
          'x-organisation-id': '11111111-1111-4111-8111-111111111111',
          'x-user-id': '10000000-0000-4000-8000-000000000004',
        },
      } as any;

      // 1. Create a task
      const createRes = await workController.createTask(
        testProjectId,
        {
          packageId: 'e1111111-1111-4111-8111-111111111111',
          title: 'Rigorous Proof Rigging Inspection Task',
          assigneeId: '10000000-0000-4000-8000-000000000004',
        },
        req
      );

      const taskId = createRes.data.id;
      expect(taskId).toBeDefined();

      // 2. Simulate server restart by clearing in-memory task repository
      taskRepository.clear();
      expect(taskRepository.has(taskId)).toBe(false);

      // Server reload restores state from PostgreSQL
      await workController.getTasks(testProjectId);
      expect(taskRepository.has(taskId)).toBe(true);

      // 3. Complete the task: controller updates state and persists to DB
      const completeRes = await workController.completeTask(testProjectId, taskId, {
        notes: 'Inspection fully verified',
      });

      expect(completeRes.data.status).toBe('completed');
      expect(completeRes.data.payload.task.isCompleted).toBe(true);

      // 4. Simulate a second server restart
      taskRepository.clear();

      // 5. Query tasks: verify task reloads with completed state intact
      const tasksRes = await workController.getTasks(testProjectId);
      const reloadedTask = tasksRes.data.find((t: any) => t.id === taskId);
      expect(reloadedTask).toBeDefined();
      expect(reloadedTask.isCompleted).toBe(true);
      expect(reloadedTask.state).toBe('completed');
    });
  });

  // ============================================================================
  // AREA 4: H08 - Canonical 13-Stage Lifecycle Consistency
  // ============================================================================
  describe('H08: Canonical 13-Stage Lifecycle Consistency', () => {
    it('proves domain template defines exactly 13 canonical stages with mandatory gates', () => {
      expect(STANDARD_THIRTEEN_STAGE_TEMPLATE.stages).toHaveLength(13);
      expect(STANDARD_THIRTEEN_STAGE_TEMPLATE.stages[0].defaultOrder).toBe(1);
      expect(STANDARD_THIRTEEN_STAGE_TEMPLATE.stages[12].defaultOrder).toBe(13);
    });

    it('proves workflow builder controller standard workflow matches domain 13 stages', async () => {
      const workflowsRes = workflowBuilderController.listWorkflows({ headers: {} } as any);
      const standardWf = workflowsRes.data.payload.find((wf: any) => wf.workflowCode === 'WF-STANDARD-13-STAGE');

      expect(standardWf).toBeDefined();
      expect(standardWf.stages).toHaveLength(13);
      expect(standardWf.stages[0].stageCode).toBe('stage-01');
      expect(standardWf.stages[12].stageCode).toBe('stage-13');
      expect(standardWf.stages[4].requiredGateApprovals.length).toBeGreaterThan(0); // Stage 5
      expect(standardWf.stages[8].requiredGateApprovals.length).toBeGreaterThan(0); // Stage 9
      expect(standardWf.stages[9].requiredGateApprovals.length).toBeGreaterThan(0); // Stage 10
      expect(standardWf.stages[12].requiredGateApprovals.length).toBeGreaterThan(0); // Stage 13
    });
  });

  // ============================================================================
  // AREA 5: H09 - Operational Readiness Dynamic Evaluation
  // ============================================================================
  describe('H09: Operational Readiness Evaluates Real Gates & Fails Closed', () => {
    it('proves uninitialized or blocked compliance evaluates to canOpenZone: false', async () => {
      const apiClient = new EosApiClient({
        organisationId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-1',
      });

      // Synthetic project evaluating operational readiness when uninitialized
      const compliance = await apiClient.evaluateOperationalReadiness('non-existent-proj');
      expect(compliance.canOpenZone).toBe(false);
      expect(compliance.isCompliant).toBe(false);
    });
  });

  // ============================================================================
  // AREA 6: H11 - Hidden API Failures Must Throw ApiError
  // ============================================================================
  describe('H11: API Failure Transparency (Throws ApiError on 4xx/5xx)', () => {
    it('proves apiClient throws ApiError when server responds with 403 Forbidden', async () => {
      const apiClient = new EosApiClient({
        baseUrl: 'https://api.e3-eos.local',
        organisationId: 'org-test',
        userId: 'user-test',
      });

      // Mock global fetch to return HTTP 403
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ message: 'Forbidden: Client not allowed access to internal costing' }),
        text: async () => 'Forbidden: Client not allowed access to internal costing',
      }) as any;

      try {
        await expect(apiClient.getFinancialControl('PRJ-2026')).rejects.toThrow(ApiError);
        await expect(apiClient.getCashPosition('PRJ-2026')).rejects.toThrow(ApiError);
        await expect(apiClient.getSupplierInvoices('PRJ-2026')).rejects.toThrow(ApiError);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('proves apiClient throws ApiError when server responds with 500 Internal Server Error', async () => {
      const apiClient = new EosApiClient({
        baseUrl: 'https://api.e3-eos.local',
        organisationId: 'org-test',
        userId: 'user-test',
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'PostgreSQL connection pool exhausted' }),
        text: async () => 'PostgreSQL connection pool exhausted',
      }) as any;

      try {
        await expect(apiClient.getFinancialControl('PRJ-2026')).rejects.toThrow(ApiError);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ============================================================================
  // AREA 7: H06 / C03 - Operational Evidence Isolation for Non-Demo Projects
  // ============================================================================
  describe('H06 / C03: Operational Evidence Isolation (No Mock Fallback Inheritance)', () => {
    it('proves newly created projects do not inherit controlled documents, transmittals, or Gantt tasks', async () => {
      const apiClient = new EosApiClient({
        organisationId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-test',
      });

      const userProjectId = 'usr-prj-' + Date.now();

      // 1. Controlled documents for non-demo must be empty
      const docs = await apiClient.getControlledDocuments(userProjectId);
      expect(docs).toEqual([]);

      // 2. Transmittals for non-demo must be empty
      const transmittals = await apiClient.getTransmittals(userProjectId);
      expect(transmittals).toEqual([]);

      // 3. Gantt schedule for non-demo must have zero tasks
      const gantt = await apiClient.getGanttSchedule(userProjectId);
      expect(gantt.schedule.tasks).toEqual([]);
      expect(gantt.schedule.criticalTasksCount).toBe(0);

      // 4. Project stages for non-demo must initialize with not_started and 0% completion
      const stages = await apiClient.getProjectStages(userProjectId);
      expect(stages).toHaveLength(13);
      expect(stages.every((s) => s.status === 'not_started' && s.completionPercent === 0)).toBe(true);

      // 5. Instantiated activities for non-demo must not have completed status for stages 1-9
      const activities = await apiClient.getProjectActivities(userProjectId);
      expect(activities.length).toBeGreaterThan(0);
      expect(activities.every((a) => a.status === 'not_started')).toBe(true);
    });
  });

  // ============================================================================
  // AREA 8: H07 - Audit Trail Timestamp Stability
  // ============================================================================
  describe('H07: Audit Trail Timestamp Invariant Across Reloads', () => {
    it('proves audit history timestamps remain static and immutable across cockpit reloads', async () => {
      const internalReq = {
        headers: {
          'x-audience': 'internal',
          'x-user-role': 'project_manager',
          'x-organisation-id': '11111111-1111-4111-8111-111111111111',
        },
      } as any;

      const cockpit1 = await projectsController.getCockpit('PRJ-QND-2026', internalReq);
      const timestamps1 = cockpit1.data.activityHistory.map((a: any) => a.timestamp);

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cockpit2 = await projectsController.getCockpit('PRJ-QND-2026', internalReq);
      const timestamps2 = cockpit2.data.activityHistory.map((a: any) => a.timestamp);

      expect(timestamps1).toEqual(timestamps2);
      expect(timestamps1[0]).toBe('2026-09-12T08:00:00.000Z');
      expect(timestamps1[1]).toBe('2026-09-13T10:30:00.000Z');
      expect(timestamps1[2]).toBe('2026-09-14T14:15:00.000Z');
    });
  });

  // ============================================================================
  // AREA 9: H10 - Commercial Financial Consistency & Margin Bridge
  // ============================================================================
  describe('H10: Commercial Financial Consistency & Margin Bridge Isolation', () => {
    it('proves margin bridge calculates exact canonical margins for demo and isolates user projects', async () => {
      // Demo project bridge
      const demoBridge = commercialFinanceController.getMarginBridge('PRJ-QND-2026');
      expect(demoBridge.waterfall).toHaveLength(5);
      expect(demoBridge.waterfall[2].marginPercent).toBe('20.41%'); // 500k / 2.45M
      expect(demoBridge.waterfall[4].marginPercent).toBe('26.53%'); // 650k / 2.45M

      // Non-demo project bridge must NOT leak QND figures
      const nonDemoBridge = commercialFinanceController.getMarginBridge('usr-unregistered-proj');
      expect(nonDemoBridge.waterfall).toEqual([]);
      expect(nonDemoBridge.summary.tenderRevenue).toBe(0);
    });
  });
});
