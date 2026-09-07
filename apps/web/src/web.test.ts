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
});
