import { describe, it, expect } from 'vitest';
import {
  matchRoute,
  isAudiencePermitted,
  EOS_ROUTES,
  ViewStateFactory,
  LocalizationService,
  ClientProjectionAdapter,
} from './index.js';

describe('@e3-eos/web Workspace & UI Engine', () => {
  describe('Route Registry & Workspace Matching', () => {
    it('should correctly match project detail route and extract params', () => {
      const result = matchRoute('/projects/proj-1234/commercial');
      expect(result).toBeDefined();
      expect(result?.route.workspace).toBe('project');
      expect(result?.route.title).toBe('BOQ & Commercial Management');
      expect(result?.params.id).toBe('proj-1234');
      expect(result?.route.supportsRtl).toBe(true);
    });

    it('should match client portal routes with client audience', () => {
      const result = matchRoute('/portal/projects/proj-festival-2026/milestones');
      expect(result).toBeDefined();
      expect(result?.route.workspace).toBe('client');
      expect(result?.route.audience).toBe('client');
      expect(result?.params.id).toBe('proj-festival-2026');
    });

    it('should match field operations sync route', () => {
      const result = matchRoute('/field/sync');
      expect(result).toBeDefined();
      expect(result?.route.workspace).toBe('field');
      expect(result?.route.audience).toBe('internal');
    });

    it('should enforce audience boundary: client cannot access internal routes', () => {
      const internalRoute = EOS_ROUTES.find((r) => r.path === '/portfolio')!;
      const clientPermitted = isAudiencePermitted(internalRoute.audience, 'client');
      expect(clientPermitted).toBe(false);

      const internalPermitted = isAudiencePermitted(internalRoute.audience, 'internal');
      expect(internalPermitted).toBe(true);

      const adminPermitted = isAudiencePermitted(internalRoute.audience, 'admin');
      expect(adminPermitted).toBe(true);
    });
  });

  describe('View State Contract', () => {
    it('should create loading state with initial load indicator', () => {
      const state = ViewStateFactory.loading('Fetching financial ledger...', true);
      expect(state.type).toBe('loading');
      expect(state.isInitialLoad).toBe(true);
    });

    it('should create permission denied state with "why blocked" and policy source', () => {
      const state = ViewStateFactory.permissionDenied(
        'Critical inspection checkpoint unresolved in Zone B',
        'policy:readiness:critical_checkpoints_v1',
        ['lead_inspector', 'event_director'],
        '/projects/proj-1/readiness'
      );
      expect(state.type).toBe('permission_denied');
      expect(state.whyBlocked).toContain('Critical inspection checkpoint');
      expect(state.policySource).toBe('policy:readiness:critical_checkpoints_v1');
      expect(state.requiredRoles).toContain('event_director');
    });

    it('should create offline state with mutation queue length and contingency disclosure', () => {
      const state = ViewStateFactory.offline(5, '2026-09-07T04:00:00Z');
      expect(state.type).toBe('offline');
      expect(state.pendingQueueLength).toBe(5);
      expect(state.contingencyDisclosure).toContain('supervisor review');
    });

    it('should create stale data state with feed source and freshness timestamp', () => {
      const state = ViewStateFactory.staleData(
        { impressions: 50000 },
        'metricool_social_feed',
        '2026-09-06T00:00:00Z',
        'Metricool feed exceeds 24h freshness window'
      );
      expect(state.type).toBe('stale_data');
      expect(state.sourceFeed).toBe('metricool_social_feed');
      expect(state.data.impressions).toBe(50000);
    });
  });

  describe('Localization & Arabic RTL Engine', () => {
    it('should support English (LTR) and Arabic (RTL) directions', () => {
      const loc = new LocalizationService('en');
      expect(loc.getDirection()).toBe('ltr');

      loc.setLocale('ar');
      expect(loc.getDirection()).toBe('rtl');
    });

    it('should translate core lifecycle stages and statuses accurately', () => {
      const loc = new LocalizationService('en');
      expect(loc.translate('stages.s01')).toBe('01: Project Onboarding');
      expect(loc.translate('status.ready_to_open')).toBe('Ready to Open');

      loc.setLocale('ar');
      expect(loc.translate('stages.s01')).toBe('01: إعداد المشروع والبدء');
      expect(loc.translate('status.ready_to_open')).toBe('جاهز للافتتاح');
    });

    it('should format currencies with proper symbol and decimal precision', () => {
      const loc = new LocalizationService('en');
      const enQar = loc.formatCurrency(90000, 'QAR');
      expect(enQar).toBe('90,000.00 QAR');

      loc.setLocale('ar');
      const arQar = loc.formatCurrency(90000, 'QAR');
      expect(arQar).toContain('ر.ق');
    });
  });

  describe('Client Portal UI Projection & Redaction', () => {
    it('should project client-safe data and strip confidential incident narratives', () => {
      const rawProject = {
        id: 'proj-e3-galashow',
        code: 'E3-GALA-2026',
        title: 'National Day Gala Showcase',
        clientName: 'Qatar Ministry of Culture',
        currentStageName: 'Operations and Delivery',
        approvedProposal: {
          id: 'prop-v1',
          version: 1,
          sellPrice: '250000.00',
          currency: 'QAR',
          approvedAt: '2026-09-01T10:00:00Z',
        },
        deliverables: [
          {
            name: 'Grand Stage Trussing',
            category: 'Staging',
            isComplete: true,
            isAccepted: true,
            isPublishedToClient: true,
            verifiedMediaUrls: ['https://cdn.e3.qa/evidence/truss-signoff.jpg'],
          },
        ],
        changeRequests: [
          {
            id: 'cr-sound-upgrade',
            title: 'Subwoofer Array Addition',
            status: 'pending_client_approval',
            clientAdditionalAmount: '15000.00',
            currency: 'QAR',
          },
        ],
        incidents: [
          {
            id: 'inc-001',
            audience: 'internal_only',
            confidentialMedicalDetails: 'Worker required medical attention for minor scrape',
          },
          {
            id: 'inc-002',
            audience: 'client_visible',
            operationalImpact: 'Power generator test caused 5-minute lighting delay',
            status: 'resolved',
          },
        ],
      };

      const projected = ClientProjectionAdapter.projectForClient(rawProject);
      expect(projected.projectId).toBe('proj-e3-galashow');
      expect(projected.approvedProposal?.sellPrice).toBe('250000.00');
      expect(projected.publishedDeliverables).toHaveLength(1);
      expect(projected.publishedDeliverables[0].status).toBe('Accepted');
      expect(projected.pendingDecisions).toHaveLength(1);
      expect(projected.pendingDecisions[0].financialExposure).toBe('15000.00');

      // Internal confidential incident strictly omitted
      expect(projected.clientIncidents).toHaveLength(1);
      expect(projected.clientIncidents[0].referenceId).toBe('inc-002');
      expect((projected.clientIncidents[0] as any).confidentialMedicalDetails).toBeUndefined();
    });

    it('should throw security violation if raw internal cost data is inadvertently passed', () => {
      const leakyProject = {
        id: 'proj-bad',
        code: 'BAD-01',
        title: 'Leaky Project',
        internalCost: '150000.00',
        profitMargin: '40.0%',
      };

      expect(() => ClientProjectionAdapter.projectForClient(leakyProject)).toThrow(
        'SECURITY_VIOLATION: Raw cost data passed to client projection'
      );
    });
  });

  describe('React Component Rendering & View State Engine', () => {
    it('should render all 7 mandatory view states using renderToStaticMarkup', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ViewStateRenderer, ViewStateFactory } = await import('./index.js');
      const React = await import('react');

      // 1. Loading
      const loadingHtml = renderToStaticMarkup(
        React.createElement(ViewStateRenderer, {
          viewState: ViewStateFactory.loading('Connecting to Doha cluster...'),
          children: 'Data ready',
        })
      );
      expect(loadingHtml).toContain('data-testid="view-state-loading"');
      expect(loadingHtml).toContain('Connecting to Doha cluster...');

      // 2. Empty
      const emptyHtml = renderToStaticMarkup(
        React.createElement(ViewStateRenderer, {
          viewState: ViewStateFactory.empty('No Drawings Uploaded', 'Upload CAD concepts to begin.', 'Upload Drawing'),
          children: 'Data ready',
        })
      );
      expect(emptyHtml).toContain('data-testid="view-state-empty"');
      expect(emptyHtml).toContain('No Drawings Uploaded');
      expect(emptyHtml).toContain('Upload Drawing');

      // 3. Validation Error
      const valErrorHtml = renderToStaticMarkup(
        React.createElement(ViewStateRenderer, {
          viewState: ViewStateFactory.validationError('Invalid Purchase Order', '2 fields failed schema validation', [
            { field: 'amount', message: 'Exceeds authorized ceiling', code: 'ERR_CEILING' },
          ]),
          children: 'Data ready',
        })
      );
      expect(valErrorHtml).toContain('data-testid="view-state-validation-error"');
      expect(valErrorHtml).toContain('Exceeds authorized ceiling');
      expect(valErrorHtml).toContain('(ERR_CEILING)');

      // 4. Permission Denied
      const permDeniedHtml = renderToStaticMarkup(
        React.createElement(ViewStateRenderer, {
          viewState: ViewStateFactory.permissionDenied(
            'Missing Super Admin delegation',
            'POL-SEC-01',
            ['SuperAdmin'],
            '/exceptions/request'
          ),
          children: 'Data ready',
        })
      );
      expect(permDeniedHtml).toContain('data-testid="view-state-permission-denied"');
      expect(permDeniedHtml).toContain('Why Blocked:');
      expect(permDeniedHtml).toContain('Missing Super Admin delegation');
      expect(permDeniedHtml).toContain('POL-SEC-01');

      // 5. Offline
      const offlineHtml = renderToStaticMarkup(
        React.createElement(ViewStateRenderer, {
          viewState: ViewStateFactory.offline(3, '2026-09-07T08:00:00Z'),
          children: React.createElement('div', null, 'Offline cached run-sheet'),
        })
      );
      expect(offlineHtml).toContain('data-testid="view-state-offline"');
      expect(offlineHtml).toContain('3 pending mutations');
      expect(offlineHtml).toContain('Offline cached run-sheet');

      // 6. Stale Data
      const staleHtml = renderToStaticMarkup(
        React.createElement(ViewStateRenderer, {
          viewState: ViewStateFactory.staleData(
            { liveHeadcount: 1420 },
            'turnstile_iot_gateway',
            '2026-09-07T07:30:00Z',
            'Gateway lag > 15m'
          ),
          children: (data: any) =>
            React.createElement('div', null, `Headcount: ${data.liveHeadcount}`),
        })
      );
      expect(staleHtml).toContain('data-testid="view-state-stale-data"');
      expect(staleHtml).toContain('turnstile_iot_gateway');
      expect(staleHtml).toContain('Headcount: 1420');

      // 7. Ready
      const readyHtml = renderToStaticMarkup(
        React.createElement(ViewStateRenderer, {
          viewState: ViewStateFactory.ready({ title: 'Gala Ready' }),
          children: (data: any) =>
            React.createElement('div', { 'data-testid': 'ready-content' }, data.title),
        })
      );
      expect(readyHtml).toContain('data-testid="view-state-ready"');
      expect(readyHtml).toContain('Gala Ready');
    });

    it('should render the full App tree with EosProvider and LayoutShell in both LTR and RTL', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { App } = await import('./App.js');
      const { LeadershipView } = await import('./views/LeadershipView.js');
      const { EosProvider } = await import('./context/EosContext.js');
      const React = await import('react');

      const appHtml = renderToStaticMarkup(React.createElement(App));
      expect(appHtml).toContain('E3');
      expect(appHtml).toContain('EOS');
      expect(appHtml).toContain('dir="ltr"');

      const portfolioHtml = renderToStaticMarkup(
        React.createElement(EosProvider, null, React.createElement(LeadershipView))
      );
      expect(portfolioHtml).toContain('Executive Leadership Portfolio');
      expect(portfolioHtml).toContain('90,000.00 QAR');
    });

    it('should render the 13-stage graph visualizer with all stages', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { StageGraphVisualizer, EosProvider } = await import('./index.js');
      const React = await import('react');

      const stageHtml = renderToStaticMarkup(
        React.createElement(
          EosProvider,
          null,
          React.createElement(StageGraphVisualizer, {
            activeStageNumber: 10,
            onSelectStage: () => {},
          })
        )
      );

      expect(stageHtml).toContain('13-Stage Event Lifecycle Stage Graph');
      expect(stageHtml).toContain('STAGE-01');
      expect(stageHtml).toContain('STAGE-10');
      expect(stageHtml).toContain('STAGE-13');
    });

    it('should render ClientPortalView without leaking internal buy rates or margins', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { ClientPortalView, EosProvider } = await import('./index.js');
      const React = await import('react');

      const portalHtml = renderToStaticMarkup(
        React.createElement(EosProvider, null, React.createElement(ClientPortalView))
      );

      // Asserts client view is rendered
      expect(portalHtml).toContain('Verified Client Portal');
      expect(portalHtml).toContain('Client Safe Projection Active');
      expect(portalHtml).toContain('160,000.00 QAR'); // Approved proposal sell price
      expect(portalHtml).toContain('Decisions Awaiting Your Sign-Off');

      // Asserts no confidential internal buy rates or margins exist in rendered HTML
      expect(portalHtml).not.toContain('buyRate');
      expect(portalHtml).not.toContain('internalCost');
      expect(portalHtml).not.toContain('Subcontractor supplier delivery delayed'); // Internal-only incident stripped
    });

    it('should render FieldOpsView and show offline indicator badge', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { FieldOpsView, EosProvider } = await import('./index.js');
      const React = await import('react');

      const fieldHtml = renderToStaticMarkup(
        React.createElement(EosProvider, null, React.createElement(FieldOpsView))
      );

      expect(fieldHtml).toContain('Field Ops PWA');
      expect(fieldHtml).toContain('Live Field Readiness Checklist');
      expect(fieldHtml).toContain('Overhead Truss Rigging Torque Check');
    });

    it('should render AdminStudioView with cryptographic audit log', async () => {
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { AdminStudioView, EosProvider } = await import('./index.js');
      const React = await import('react');

      const adminHtml = renderToStaticMarkup(
        React.createElement(EosProvider, null, React.createElement(AdminStudioView))
      );

      expect(adminHtml).toContain('Cryptographic Audit Manifest');
      expect(adminHtml).toContain('Cryptographic Audit Log');
      expect(adminHtml).toContain('INTACT');
    });
  });

  describe('EosApiClient & Backend Integration Layer', () => {
    it('should query portfolio metrics with normative 90,000 QAR EAC and 43.75% margin', async () => {
      const { EosApiClient } = await import('./services/api-client.js');
      const client = new EosApiClient({
        organisationId: '11111111-1111-4111-8111-111111111111',
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      });

      const metrics = await client.getPortfolioDashboard();
      expect(metrics.estimateAtCompletion).toBe(90000);
      expect(metrics.totalBudget).toBe(110000);
      expect(metrics.budgetVariance).toBe(20000);
      expect(metrics.forecastMarginPercent).toBe('43.75%');
    });

    it('should project client-safe data through ApiClient with zero leakage', async () => {
      const { EosApiClient } = await import('./services/api-client.js');
      const client = new EosApiClient({
        organisationId: '22222222-2222-4222-8222-222222222222',
        userId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      });

      const portal = await client.getClientPortalProject('f1111111-1111-4111-8111-111111111111');
      expect(portal.projectCode).toBe('PRJ-2026-SYNTH-01');
      expect(portal.approvedProposal?.sellPrice).toBe('160000.00');
      expect((portal as any).internalCost).toBeUndefined();
      expect((portal as any).profitMargin).toBeUndefined();
    });

    it('should submit field sync batch mutations successfully', async () => {
      const { EosApiClient } = await import('./services/api-client.js');
      const client = new EosApiClient({
        organisationId: '11111111-1111-4111-8111-111111111111',
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      });

      const result = await client.syncFieldBatch([
        { action: 'UPDATE_CHECKLIST', checklistId: 'chk-01' },
      ]);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.syncedAt).toBeDefined();
    });

    it('should query project stages and activities from client layer', async () => {
      const { EosApiClient } = await import('./services/api-client.js');
      const client = new EosApiClient({
        organisationId: '11111111-1111-4111-8111-111111111111',
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      });

      const stages = await client.getProjectStages('f1111111-1111-4111-8111-111111111111');
      expect(stages.length).toBe(13);
      expect(stages[0].stageNumber).toBe(1);
      expect(stages[9].hasCriticalGate).toBe(true);

      const stage10Acts = await client.getProjectActivities('f1111111-1111-4111-8111-111111111111', 10);
      expect(stage10Acts.length).toBe(24);
      expect(stage10Acts[0].id).toBe('S10-01');

      const updated = await client.updateProjectActivity('f1111111-1111-4111-8111-111111111111', 'S10-01', {
        status: 'completed',
        notes: 'Testing sign-off complete',
      });
      expect(updated.status).toBe('completed');
      expect(updated.notes).toBe('Testing sign-off complete');
    });
  });
});


