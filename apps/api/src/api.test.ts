import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsController, projectRepository } from './projects/projects.controller.js';
import { IdempotencyGuard, globalIdempotencyStore } from './common/idempotency.guard.js';
import { DocumentQuarantineService } from './common/upload.service.js';
import { TenantIsolationGuard } from './common/tenant.guard.js';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('AT-001: Cross-scope Tenant Isolation', () => {
  let controller: ProjectsController;

  beforeEach(() => {
    controller = new ProjectsController();
    projectRepository.clear();

    // Create a project in Org A
    projectRepository.set('proj-org-a', {
      id: 'proj-org-a',
      organisationId: 'org-alpha',
      projectCode: 'PRJ-A',
      title: 'Secret Alpha Project',
      description: 'Internal project belonging strictly to org Alpha',
      originCode: 'DIRECT',
      ownerId: 'user-01',
      maturity: 'idea',
      outcome: 'undetermined',
      rowVersion: 1,
    });
  });

  it('allows access when caller belongs to the same organisation', () => {
    const mockReq = {
      organisationId: 'org-alpha',
      headers: {},
    } as any;

    const res = controller.getProject('proj-org-a', mockReq);
    expect(res.data.id).toBe('proj-org-a');
    expect(res.data.title).toBe('Secret Alpha Project');
  });

  it('denies access with 404 NOT_FOUND (no existence leakage) when cross-tenant ID is supplied', () => {
    const mockReq = {
      organisationId: 'org-beta', // Different organisation!
      headers: {},
    } as any;

    expect(() => controller.getProject('proj-org-a', mockReq)).toThrowError(HttpException);
    try {
      controller.getProject('proj-org-a', mockReq);
    } catch (err: any) {
      expect(err.getStatus()).toBe(404);
      expect(err.getResponse().code).toBe('NOT_FOUND');
    }
  });
});

describe('AT-002: Client Audience Costing Isolation', () => {
  let controller: ProjectsController;

  beforeEach(() => {
    controller = new ProjectsController();
    projectRepository.clear();
    projectRepository.set('proj-01', {
      id: 'proj-01',
      organisationId: 'org-alpha',
      projectCode: 'PRJ-01',
      title: 'Commercial Event',
      description: 'Project with confidential buy rates and margins',
      originCode: 'DIRECT',
      ownerId: 'user-01',
      maturity: 'developing',
      outcome: 'undetermined',
      rowVersion: 1,
      costingData: {
        contractorBuyRateHourly: '120.00 QAR',
        internalMarginTarget: '43.75%',
        payrollSchedule: 'CONFIDENTIAL-PAYROLL-DATA',
      },
    });
  });

  it('allows internal audience to read costing data', () => {
    const mockReq = {
      organisationId: 'org-alpha',
      audience: 'internal',
      headers: {},
    } as any;

    const res = controller.getProjectCosting('proj-01', mockReq);
    expect(res.data.costing?.contractorBuyRateHourly).toBe('120.00 QAR');
  });

  it('blocks client audience from costing data via server-side guard', () => {
    const reflector = new Reflector();
    const guard = new TenantIsolationGuard(reflector);

    const mockReq = {
      organisationId: 'org-alpha',
      audience: 'client', // Client portal audience!
      headers: { 'x-audience': 'client' },
    } as any;

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockReq,
      }),
      getHandler: () => controller.getProjectCosting,
      getClass: () => ProjectsController,
    } as unknown as ExecutionContext;

    // The guard must throw 403 FORBIDDEN_AUDIENCE
    expect(() => guard.canActivate(mockContext)).toThrowError(HttpException);
    try {
      guard.canActivate(mockContext);
    } catch (err: any) {
      expect(err.getStatus()).toBe(403);
      expect(err.getResponse().code).toBe('FORBIDDEN_AUDIENCE');
    }
  });
});

describe('AT-008: Document Quarantine & Malicious Upload Defense', () => {
  const quarantine = new DocumentQuarantineService();

  it('accepts legitimate design PDF and places it in quarantine status', () => {
    const res = quarantine.requestUploadIntent({
      filename: 'concept_moodboard.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 1024 * 5, // 5MB
      purpose: 'design_brief',
    });

    expect(res.status).toBe('quarantined');
    expect(res.quarantineStorageKey).toContain('quarantine/');
  });

  it('rejects executable / prohibited script files', () => {
    expect(() =>
      quarantine.requestUploadIntent({
        filename: 'malicious_payload.exe',
        mimeType: 'application/octet-stream',
        sizeBytes: 500,
        purpose: 'design_brief',
      })
    ).toThrowError(HttpException);
  });

  it('rejects oversized files exceeding 50MB limit', () => {
    expect(() =>
      quarantine.requestUploadIntent({
        filename: 'huge_file.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 60 * 1024 * 1024, // 60MB
        purpose: 'design_brief',
      })
    ).toThrowError(HttpException);
  });
});

describe('AT-009: Consequential Idempotency & Conflict Handling', () => {
  let guard: IdempotencyGuard;

  beforeEach(() => {
    guard = new IdempotencyGuard();
    globalIdempotencyStore.clear();
  });

  it('replays identical cached result on exact replay', () => {
    const key = 'idem-unique-key-123';
    const payload = { title: 'New Event', description: 'Description', originCode: 'IDEA', ownerId: '11111111-1111-4111-8111-111111111111' };

    const mockReq = {
      method: 'POST',
      baseUrl: '/api/v1',
      path: '/projects',
      headers: { 'idempotency-key': key },
      body: payload,
      organisationId: 'org-01',
      actorId: 'user-01',
    } as any;

    const mockRes = {
      statusCode: 201,
      status: (_code: number) => mockRes,
      json: (_data: any) => mockRes,
    } as any;

    const ctx = {
      switchToHttp: () => ({ getRequest: () => mockReq, getResponse: () => mockRes }),
    } as unknown as ExecutionContext;

    // First call: allowed through, sets response wrapper
    expect(guard.canActivate(ctx)).toBe(true);
    // Simulate handler response
    mockRes.json({ data: { id: 'prj-1', status: 'created' } });

    // Second call with EXACT SAME key and payload:
    let replayedBody: any = null;
    let replayedStatus = 0;
    const mockRes2 = {
      status: (code: number) => {
        replayedStatus = code;
        return mockRes2;
      },
      json: (data: any) => {
        replayedBody = data;
        return mockRes2;
      },
    } as any;

    const ctx2 = {
      switchToHttp: () => ({ getRequest: () => mockReq, getResponse: () => mockRes2 }),
    } as unknown as ExecutionContext;

    // Second call is intercepted and returns false (stops re-execution)
    expect(guard.canActivate(ctx2)).toBe(false);
    expect(replayedStatus).toBe(201);
    expect(replayedBody.data.id).toBe('prj-1');
  });

  it('rejects with 409 IDEMPOTENCY_CONFLICT when same key is used with different payload', () => {
    const key = 'idem-conflict-key-456';
    const payload1 = { title: 'First Project' };
    const payload2 = { title: 'Different Project Content' };

    const mockReq1 = {
      method: 'POST',
      baseUrl: '/api/v1',
      path: '/projects',
      headers: { 'idempotency-key': key },
      body: payload1,
      organisationId: 'org-01',
      actorId: 'user-01',
    } as any;

    const mockRes1 = {
      statusCode: 201,
      json: () => mockRes1,
    } as any;

    const ctx1 = {
      switchToHttp: () => ({ getRequest: () => mockReq1, getResponse: () => mockRes1 }),
    } as unknown as ExecutionContext;

    guard.canActivate(ctx1);
    mockRes1.json({ data: { id: 'prj-1' } });

    // Call with different body
    const mockReq2 = {
      ...mockReq1,
      body: payload2,
    };

    const ctx2 = {
      switchToHttp: () => ({ getRequest: () => mockReq2, getResponse: () => mockRes1 }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx2)).toThrowError();
    try {
      guard.canActivate(ctx2);
    } catch (err: any) {
      expect(err.getStatus()).toBe(409);
      expect(err.getResponse().code).toBe('IDEMPOTENCY_CONFLICT');
    }
  });
});

describe('Stage Activity Library & Progression Endpoints', () => {
  let controller: ProjectsController;

  beforeEach(() => {
    controller = new ProjectsController();
    projectRepository.clear();
    projectRepository.set('proj-stage-test', {
      id: 'proj-stage-test',
      organisationId: 'org-alpha',
      projectCode: 'PRJ-STG-01',
      title: 'Stage Progression Test Project',
      description: 'Project to test 13 stages and 312 activities',
      originCode: 'DIRECT',
      ownerId: 'user-01',
      maturity: 'delivery',
      outcome: 'undetermined',
      rowVersion: 1,
    });
  });

  it('serves the full 312 normative stage library', () => {
    const res = controller.getStageLibrary();
    expect(res.data.totalActivities).toBe(312);
    expect(res.data.activities.length).toBe(312);
    expect(res.data.activities[0].id).toBe('S01-01');
    expect(res.data.activities[311].id).toBe('S13-24');
  });

  it('serves 13 lifecycle stages with initial calculated metrics', () => {
    const mockReq = { organisationId: 'org-alpha', headers: {} } as any;
    const res = controller.getProjectStages('proj-stage-test', mockReq);
    expect(res.data.length).toBe(13);
    expect(res.data[0].stageCode).toBe('STAGE-01');
    expect(res.data[0].status).toBe('not_started');
    expect(res.data[9].stageCode).toBe('STAGE-10');
    expect(res.data[9].hasCriticalGate).toBe(true);
  });

  it('filters project activities by stage and updates activity status with evidence', () => {
    const mockReq = { organisationId: 'org-alpha', headers: {} } as any;
    const stage1Acts = controller.getProjectActivities('proj-stage-test', '1', mockReq);
    expect(stage1Acts.data.length).toBe(24);

    const targetActivity = stage1Acts.data[0];
    expect(targetActivity.status).toBe('not_started');

    // Update activity to completed
    const updated = controller.updateProjectActivity(
      'proj-stage-test',
      targetActivity.id,
      {
        status: 'completed',
        evidenceUri: 'file:///evidence/s01-01-brief.pdf',
        notes: 'Brief captured and verified by sponsor',
      },
      mockReq
    );

    expect(updated.data.status).toBe('completed');
    expect(updated.data.completedAt).toBeTruthy();
    expect(updated.data.evidenceUri).toBe('file:///evidence/s01-01-brief.pdf');

    // Stage 1 progress should now reflect 1 completed
    const stagesRes = controller.getProjectStages('proj-stage-test', mockReq);
    const stage1 = stagesRes.data.find((s) => s.stageNumber === 1);
    expect(stage1?.status).toBe('in_progress');
    expect(stage1?.completionPercent).toBe(4); // 1 / 24 = 4.16% ~ 4%
  });

  it('lists projects strictly scoped to caller organisation', () => {
    const mockReqAlpha = { organisationId: 'org-alpha', headers: {} } as any;
    const resAlpha = controller.listProjects(mockReqAlpha);
    expect(resAlpha.data.length).toBe(1);
    expect(resAlpha.data[0].id).toBe('proj-stage-test');

    // Caller from another org with no projects sees empty list
    const mockReqOther = { organisationId: 'org-other', headers: {} } as any;
    const resOther = controller.listProjects(mockReqOther);
    expect(resOther.data.length).toBe(0);
  });
});

describe('System Health & Observability Endpoints', () => {
  it('serves liveness and deep system telemetry with 312 activities and 18 active modules', async () => {
    const { HealthController } = await import('./common/health.controller.js');
    const health = new HealthController();

    const liveness = health.getLiveness();
    expect(liveness.status).toBe('ok');
    expect(liveness.service).toBe('e3-eos-api');

    const system = health.getSystemHealth();
    expect(system.status).toBe('healthy');
    expect(system.governance.multiTenantIsolation).toBe('enforced');
    expect(system.governance.documentQuarantineService).toBe('active');
    expect(system.catalog.totalStageActivities).toBe(312);
    expect(system.catalog.activeModules).toBe(18);
    expect(system.systemMetrics.rssMb).toBeGreaterThan(0);
  });
});

describe('OpenAPI Specification & Interactive Docs Endpoints', () => {
  it('serves the OpenAPI 3.1.0 YAML specification with text/yaml content-type', async () => {
    const { OpenApiController } = await import('./common/openapi.controller.js');
    const controller = new OpenApiController();

    let setHeaderKey = '';
    let setHeaderVal = '';
    let sentContent = '';

    const mockRes = {
      setHeader: (k: string, v: string) => {
        setHeaderKey = k;
        setHeaderVal = v;
      },
      send: (body: string) => {
        sentContent = body;
      },
      status: () => mockRes,
    } as any;

    controller.getOpenApiYaml(mockRes);
    expect(setHeaderKey).toBe('Content-Type');
    expect(setHeaderVal).toBe('text/yaml; charset=utf-8');
    expect(sentContent).toContain('openapi: 3.1.0');
    expect(sentContent).toContain('title: E3-EOS Core Command Contracts');
  });

  it('serves interactive API documentation UI with text/html content-type', async () => {
    const { OpenApiController } = await import('./common/openapi.controller.js');
    const controller = new OpenApiController();

    let setHeaderVal = '';
    let sentHtml = '';

    const mockRes = {
      setHeader: (_k: string, v: string) => {
        setHeaderVal = v;
      },
      send: (body: string) => {
        sentHtml = body;
      },
    } as any;

    controller.getApiDocs(mockRes);
    expect(setHeaderVal).toBe('text/html; charset=utf-8');
    expect(sentHtml).toContain('E3-EOS Core Command API Reference');
    expect(sentHtml).toContain('@scalar/api-reference');
    expect(sentHtml).toContain('data-url="/api/v1/openapi.yaml"');
  });
});

describe('M06 Governance, Approvals and Exceptions Suite', () => {
  const projectId = '00000000-0000-4000-8000-000000000001';
  const orgId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    projectRepository.set(projectId, {
      id: projectId,
      organisationId: orgId,
      projectCode: 'PRJ-QATAR-2026',
      title: 'Qatar National Day 2026',
      description: 'National celebrations production and live delivery',
      originCode: 'DIRECT',
      ownerId: '00000000-0000-4000-8000-000000000005',
      maturity: 'detailed_planning',
      outcome: 'undetermined',
      rowVersion: 1,
    });
  });

  it('publishes project policy draft with SHA-256 immutable snapshot', async () => {
    const { GovernanceController } = await import('./governance/governance.controller.js');
    const controller = new GovernanceController();

    const mockReq = {
      organisationId: orgId,
      headers: { 'x-request-id': 'req-test-pub' },
    } as any;

    const result = controller.publishProjectPolicy(
      projectId,
      '00000000-0000-4000-8000-000000000055',
      {
        draftVersionId: '00000000-0000-4000-8000-000000000011',
        impactReportId: '00000000-0000-4000-8000-000000000022',
        authorityDecisionIds: ['00000000-0000-4000-8000-000000000033'],
      },
      mockReq
    );

    expect(result.data.status).toBe('published');
    expect(result.data.payload!.status).toBe('active');
    expect(result.data.payload!.snapshotHash).toHaveLength(64);
  });

  it('records approval decision bound to immutable SHA-256 target hash', async () => {
    const { GovernanceController } = await import('./governance/governance.controller.js');
    const { createHash } = await import('crypto');
    const controller = new GovernanceController();

    const targetHash = createHash('sha256').update('prop-2026-v2-target-content').digest('hex');
    const mockReq = {
      organisationId: orgId,
      userId: 'usr-commercial-dir',
      headers: { 'x-request-id': 'req-test-appr' },
    } as any;

    const result = controller.decideApproval(
      projectId,
      'appr-req-001',
      {
        targetVersionId: '00000000-0000-4000-8000-000000000002',
        targetHash,
        outcome: 'approved',
        acknowledgedConditions: ['Subject to client letter of intent verification'],
        comment: 'Commercial terms authorized under delegation matrix',
      },
      mockReq
    );

    expect(result.data.status).toBe('approved');
    expect(result.data.payload!.decidedBy).toBe('usr-commercial-dir');
    expect(result.data.payload!.acknowledgedConditions).toContain('Subject to client letter of intent verification');
  });

  it('enforces full 4-step exception lifecycle: request -> authorise -> follow-up review closure', async () => {
    const { GovernanceController } = await import('./governance/governance.controller.js');
    const { createHash } = await import('crypto');
    const controller = new GovernanceController();

    const mockReq = {
      organisationId: orgId,
      userId: 'usr-gov-lead',
      headers: { 'x-request-id': 'req-test-exc' },
    } as any;

    // Step 1: Request
    const requestRes = controller.requestException(
      projectId,
      {
        scope: {
          projectId,
          targetRecordId: '00000000-0000-4000-8000-000000000100',
          targetVersionId: '00000000-0000-4000-8000-000000000200',
          ruleIds: ['vendor.comparison.required'],
          allowedActions: ['purchase_order.release'],
        },
        reason: 'Sole source vendor justified by proprietary patent license',
        authorityBasisId: '00000000-0000-4000-8000-000000000300',
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
        maxUses: 1,
        reviewPolicy: {
          mode: 'required',
          ownerId: '00000000-0000-4000-8000-000000000400',
          reviewDueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        },
        evidenceVersionIds: ['00000000-0000-4000-8000-000000000500'],
      },
      mockReq
    );

    expect(requestRes.data.status).toBe('requested');
    const excId = requestRes.data.id;

    // Step 2: Authorise
    const authTargetHash = createHash('sha256').update(excId).digest('hex');
    const authRes = controller.authoriseException(
      projectId,
      excId,
      {
        targetVersionId: '00000000-0000-4000-8000-000000000200',
        targetHash: authTargetHash,
        authorityDecisionIds: ['00000000-0000-4000-8000-000000000600'],
        approvedScope: {
          targetRuleId: 'vendor.comparison.required',
          maxUses: 1,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
        },
        reviewPolicy: {
          reviewOwnerId: '00000000-0000-4000-8000-000000000400',
          reviewDueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        },
      },
      mockReq
    );

    expect(authRes.data.status).toBe('authorised');
    expect(authRes.data.payload!.authorisedBy).toBe('usr-gov-lead');

    // Step 3: Follow-up Review & Closure (Invariant AT-014)
    const reviewRes = controller.reviewException(
      projectId,
      excId,
      {
        outcome: 'closed',
        disposition: 'Goods received and accepted with patent documentation attached',
        evidenceVersionIds: ['00000000-0000-4000-8000-000000000700'],
        remainingActionIds: [],
      },
      mockReq
    );

    expect(reviewRes.data.status).toBe('closed');
    expect(reviewRes.data.payload!.closureDisposition).toContain('Goods received');
    expect(reviewRes.data.payload!.closedAt).toBeDefined();
  });

  it('confirms pending inventory reservation with updated planning window and authority basis', async () => {
    const { InventoryController, reservationRepository } = await import('./inventory/inventory.controller.js');
    const controller = new InventoryController();

    const mockReq = {
      organisationId: orgId,
      headers: { 'x-request-id': 'req-test-rsv-conf' },
    } as any;

    // Seed a pending reservation
    const testRsvId = 'rsv-test-conf-01';
    reservationRepository.set(testRsvId, {
      id: testRsvId,
      resourceId: 'res-truss-01',
      organisationId: orgId,
      projectId,
      window: {
        start: new Date('2026-12-10T00:00:00Z'),
        end: new Date('2026-12-20T00:00:00Z'),
      },
      quantity: 50,
      status: 'pending' as any,
    });

    const result = controller.confirmReservation(
      projectId,
      testRsvId,
      {
        expectedResourceVersion: 1,
        planningStart: '2026-12-10T08:00:00Z',
        planningEnd: '2026-12-19T22:00:00Z',
        quantity: 45,
      },
      mockReq
    );

    expect(result.data.status).toBe('confirmed');
    expect(result.data.payload!.quantity).toBe(45);
  });
});



