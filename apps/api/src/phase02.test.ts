import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommercialController,
  estimateRepository,
  boqLineRepository,
  proposalRepository,
  variationRepository,
} from './commercial/commercial.controller.js';
import {
  DesignsController,
  designRepository,
  designVersionRepository,
  designAnnotationRepository,
} from './designs/designs.controller.js';
import {
  PortalController,
  publicationRepository,
  clientDecisionRepository,
} from './portal/portal.controller.js';
import { projectRepository } from './projects/projects.controller.js';
import {
  VariationLedger,
  CertificateValidator,
  DesignReleaseEngine,
} from '@e3-eos/domain';

describe('Phase 02 Integration Tests (AT-032 through AT-042)', () => {
  let commercialController: CommercialController;
  let designsController: DesignsController;
  let portalController: PortalController;

  const agencyOrgId = '11111111-1111-4111-8111-111111111111';
  const clientOrgId = '22222222-2222-4222-8222-222222222222';
  const projectId = 'prj-phase02-001';

  beforeEach(() => {
    commercialController = new CommercialController();
    designsController = new DesignsController();
    portalController = new PortalController();

    estimateRepository.clear();
    boqLineRepository.clear();
    proposalRepository.clear();
    variationRepository.clear();
    designRepository.clear();
    designVersionRepository.clear();
    designAnnotationRepository.clear();
    publicationRepository.clear();
    clientDecisionRepository.clear();
    projectRepository.clear();

    projectRepository.set(projectId, {
      id: projectId,
      organisationId: agencyOrgId,
      projectCode: 'E3-EVAL-2026',
      title: 'Qatar National Day Mega Dome',
      description: 'Turnkey architectural production and staging',
      originCode: 'DIRECT_AWARD',
      ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      clientOrganisationId: clientOrgId,
      maturity: 'in_planning',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '1000000',
        estimatedCost: '700000',
      },
      rowVersion: 1,
    });
  });

  const agencyReq = {
    headers: { 'x-request-id': 'req-test-agency' },
    organisationId: agencyOrgId,
  } as any;

  const clientReq = {
    headers: {
      'x-request-id': 'req-test-client',
      'x-client-org-id': clientOrgId,
      'x-user-id': 'usr-client-rep',
      'x-user-name': 'Nasser Al-Kuwari',
      'x-user-email': 'nasser@client.qa',
    },
    organisationId: clientOrgId,
  } as any;

  describe('AT-037: Estimate Hourly/Shift Units and Lump-Sum Breakdown', () => {
    it('calculates estimate with parent lump-sum and decomposes without duplicating parent total', () => {
      const estRes = commercialController.createEstimate(
        projectId,
        { name: 'National Day Dome Turnkey Production', currency: 'QAR' },
        agencyReq
      );
      const estId = estRes.data.id;

      // Create Parent Lump Sum: 100,000 QAR
      const parentLine = commercialController.addLine(
        projectId,
        estId,
        {
          lineCode: 'LS-STAGE',
          description: 'Turnkey Main Stage Package',
          quantity: '1',
          uom: 'lump_sum',
          unitCost: '60000',
          unitSell: '100000',
          durationMultiplier: '1',
          isLumpSum: true,
        },
        agencyReq
      );

      // Create child lines decomposing the lump sum
      commercialController.addLine(
        projectId,
        estId,
        {
          lineCode: 'LS-STAGE.1',
          description: 'Stage Decking & Truss',
          quantity: '1',
          uom: 'lump_sum',
          unitCost: '35000',
          unitSell: '55000',
          allocatedLumpSumPortion: '55000',
          parentLineId: parentLine.data.id,
        },
        agencyReq
      );

      commercialController.addLine(
        projectId,
        estId,
        {
          lineCode: 'LS-STAGE.2',
          description: 'Acoustic Rigging & Baffles',
          quantity: '1',
          uom: 'lump_sum',
          unitCost: '25000',
          unitSell: '45000',
          allocatedLumpSumPortion: '45000',
          parentLineId: parentLine.data.id,
        },
        agencyReq
      );

      // Calculate estimate
      const calcRes = commercialController.calculateEstimate(projectId, estId, {}, agencyReq);

      // Invariant: Total Sell is 100,000 QAR (parent lump sum), NOT 200,000 QAR (parent + children)
      expect(calcRes.data.payload.totalSell).toBe('100000.000000');
      expect(calcRes.data.payload.totalCost).toBe('60000.000000');
      expect(calcRes.data.payload.grossProfit).toBe('40000.000000');
    });
  });

  describe('AT-038 & AT-039: Fee/Tax/Discount and Margin vs Markup', () => {
    it('applies fee, discount, and tax in correct order and separates margin from markup', () => {
      const estRes = commercialController.createEstimate(
        projectId,
        { name: 'VIP Gala Dinner Audio Visual', currency: 'QAR' },
        agencyReq
      );
      const estId = estRes.data.id;

      commercialController.addLine(
        projectId,
        estId,
        {
          lineCode: 'AV-01',
          description: 'Concert Grade Line Array PA',
          quantity: '1',
          uom: 'lot',
          unitCost: '40000',
          unitSell: '80000', // Gross Sell = 80,000 QAR
        },
        agencyReq
      );

      // Overall Discount 10% on 80,000 = 8,000 -> Discounted Sell = 72,000 QAR
      // Management Fee 10% on 72,000 = 7,200 -> Taxable Base = 79,200 QAR
      // Tax 5% on 79,200 = 3,960 -> Grand Total Sell = 83,160 QAR
      // Total Cost = 40,000 QAR
      // Gross Profit = 83,160 - 40,000 = 43,160 QAR
      // Markup = 43,160 / 40,000 = 107.90%
      // Margin = 43,160 / 83,160 = 51.90%

      const calcRes = commercialController.calculateEstimate(
        projectId,
        estId,
        {
          overallDiscountPercent: '10',
          overallFeePercent: '10',
          defaultTaxRate: '0.05',
        },
        agencyReq
      );

      expect(calcRes.data.payload.subtotalSell).toBe('80000.000000');
      expect(calcRes.data.payload.discountAmount).toBe('8000.000000');
      expect(calcRes.data.payload.feeAmount).toBe('7200.000000');
      expect(calcRes.data.payload.taxAmount).toBe('3960.000000');
      expect(calcRes.data.payload.totalSell).toBe('83160.000000');
      expect(calcRes.data.payload.totalCost).toBe('40000.000000');
      expect(calcRes.data.payload.grossProfit).toBe('43160.000000');

      // Margin is strictly different from markup!
      expect(calcRes.data.payload.marginPercent).toBe('51.9');
      expect(calcRes.data.payload.markupPercent).toBe('107.9');
      expect(calcRes.data.payload.marginPercent).not.toBe(calcRes.data.payload.markupPercent);
    });

    it('handles zero revenue safely returning not_applicable without crashing', () => {
      const estRes = commercialController.createEstimate(
        projectId,
        { name: 'Internal Sponsorship Package', currency: 'QAR' },
        agencyReq
      );
      const estId = estRes.data.id;

      commercialController.addLine(
        projectId,
        estId,
        {
          lineCode: 'INTERNAL-01',
          description: 'Complimentary Goodwill Branding',
          quantity: '1',
          uom: 'lot',
          unitCost: '15000',
          unitSell: '0', // Zero revenue
        },
        agencyReq
      );

      const calcRes = commercialController.calculateEstimate(projectId, estId, {}, agencyReq);
      expect(calcRes.data.payload.totalSell).toBe('0.000000');
      expect(calcRes.data.payload.totalCost).toBe('15000.000000');
      expect(calcRes.data.payload.marginPercent).toBe('not_applicable');
    });
  });

  describe('AT-002 & AT-035: Client Proposal Redaction & Scope/Hash Verification', () => {
    it('creates proposal with buying rates and internal margins strictly redacted', () => {
      const estRes = commercialController.createEstimate(
        projectId,
        { name: 'Commercial Estimate For Client', currency: 'QAR' },
        agencyReq
      );
      const estId = estRes.data.id;

      commercialController.addLine(
        projectId,
        estId,
        {
          lineCode: 'CREW-01',
          description: 'Senior Audio Engineer',
          quantity: '5',
          uom: 'shift',
          unitCost: '800', // Internal contractor buy rate - must be secret!
          unitSell: '1600', // Client sell rate
        },
        agencyReq
      );

      const propRes = commercialController.createProposal(
        projectId,
        {
          estimateId: estId,
          proposalCode: 'PROP-2026-001',
          title: 'Official Client Production Proposal',
          clientOrganisationId: clientOrgId,
        },
        agencyReq
      );

      const proposal = propRes.data.payload!;
      expect(proposal.totalSell).toBe('8000.000000');

      // Check projection sent to client: strictly NO buy rates or margins
      const projection = proposal.projection;
      expect(projection).toBeDefined();
      expect((projection as any).totalCost).toBeUndefined();
      expect((projection as any).grossProfit).toBeUndefined();
      expect((projection as any).marginPercent).toBeUndefined();

      const line = projection.lines[0];
      expect(line.unitSell.amount).toBe('1600.000000');
      expect((line as any).unitCost).toBeUndefined();
      expect((line as any).totalCost).toBeUndefined();
    });
  });

  describe('AT-040: Pending Change Exposure vs Approved Contract Baseline', () => {
    it('keeps unapproved variation in pending exposure without inflating approved contract', () => {
      // 1. Initial financials: 1,000,000 QAR approved contract, 700,000 QAR budget
      const initFin = commercialController.getFinancials(projectId, agencyReq);
      expect(initFin.data.payload.approvedContractValue).toBe('1000000.000000');
      expect(initFin.data.payload.approvedCostBudget).toBe('700000.000000');
      expect(initFin.data.payload.pendingExposureSell).toBe('0.000000');

      // 2. Submit change request (variation) of 150,000 sell / 100,000 cost
      const varRes = commercialController.createVariation(
        projectId,
        {
          variationCode: 'VAR-001',
          title: 'Scope Extension: Additional Outer Dome Projection',
          scopeDescription: '12 high-lumen laser projectors on external facade',
          costImpact: '100000',
          sellImpact: '150000',
          timeImpactDays: 2,
        },
        agencyReq
      );

      const varId = varRes.data.id;

      // 3. Check financials: Approved contract is STILL 1,000,000 QAR; pending exposure is 150,000 QAR
      const pendingFin = commercialController.getFinancials(projectId, agencyReq);
      expect(pendingFin.data.payload.approvedContractValue).toBe('1000000.000000');
      expect(pendingFin.data.payload.approvedCostBudget).toBe('700000.000000');
      expect(pendingFin.data.payload.pendingExposureSell).toBe('150000.000000');
      expect(pendingFin.data.payload.pendingExposureCost).toBe('100000.000000');
      expect(pendingFin.data.payload.totalForecastSell).toBe('1150000.000000');

      // 4. Apply client authorization
      commercialController.applyVariation(
        projectId,
        varId,
        {
          clientDecisionId: '11111111-2222-3333-4444-555555555555',
          clientAuthorisedAt: new Date().toISOString(),
          targetHash: 'hash-client-signed-target',
        },
        agencyReq
      );

      // 5. Approved baseline is now updated to 1,150,000 QAR and pending exposure drops to 0
      const appliedFin = commercialController.getFinancials(projectId, agencyReq);
      expect(appliedFin.data.payload.approvedContractValue).toBe('1150000.000000');
      expect(appliedFin.data.payload.approvedCostBudget).toBe('800000.000000');
      expect(appliedFin.data.payload.pendingExposureSell).toBe('0.000000');
    });
  });

  describe('AT-034: Design Revision Upload Decoupled from Fabrication Release', () => {
    it('proves that a new internal drawing revision has no inherited fabrication approval', () => {
      // 1. Create design
      const desRes = designsController.createDesign(
        projectId,
        {
          title: 'Grand Entrance Truss Arch',
          category: 'technical_drawing',
        },
        agencyReq
      );
      const desId = desRes.data.id;

      // 2. Upload v1
      const v1Res = designsController.createVersion(
        projectId,
        desId,
        {
          versionNumber: 1,
          storageKey: 'drawings/arch-v1.dwg',
          title: 'Grand Entrance Truss Arch v1',
          purpose: 'for_review',
          contentData: 'binary-dwg-data-v1',
        },
        agencyReq
      );
      const v1Id = v1Res.data.id;

      // 3. Formally approve and release v1 for fabrication
      designsController.releaseDesign(
        projectId,
        desId,
        {
          versionId: v1Id,
          purpose: 'for_fabrication',
          approvalHash: 'fabrication-approval-hash-v1',
          approverId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
        agencyReq
      );

      const v1Stored = designVersionRepository.get(v1Id)!;
      expect(v1Stored.purpose).toBe('for_fabrication');
      expect(v1Stored.fabricationApproval).toBeDefined();

      // 4. Upload v2 (revision)
      const v2Res = designsController.createVersion(
        projectId,
        desId,
        {
          versionNumber: 2,
          storageKey: 'drawings/arch-v2.dwg',
          title: 'Grand Entrance Truss Arch v2 (Reinforced)',
          purpose: 'for_review',
          contentData: 'binary-dwg-data-v2',
        },
        agencyReq
      );
      const v2Id = v2Res.data.id;

      const v2Stored = designVersionRepository.get(v2Id)!;
      // Invariant (AT-034): v2 has NO inherited fabrication approval!
      expect(v2Stored.versionNumber).toBe(2);
      expect(v2Stored.purpose).toBe('for_review');
      expect(v2Stored.fabricationApproval).toBeUndefined();

      // Domain release engine rejects fabrication release check for v2
      expect(() => DesignReleaseEngine.verifyFabricationRelease(v2Stored)).toThrow(
        /FABRICATION_RELEASE_DENIED/
      );
    });
  });

  describe('AT-035, AT-036, AT-041 & AT-042: Client Publication, Withdrawal, and Native Decision', () => {
    it('manages publication lifecycle: published view, withdrawal lockout (AT-036), hash validation (AT-035), native acceptance (AT-041), and RTL (AT-042)', () => {
      // 1. Publish commercial projection to client room
      const projectionPayload = {
        title: 'Festival Main Stage Rigging Package',
        totalSell: '250000',
        currency: 'QAR',
      };

      const pubRes = portalController.createPublication(
        projectId,
        {
          clientOrganisationId: clientOrgId,
          roomType: 'commercial',
          title: 'Official Commercial Proposal v1',
          titleAr: 'العرض التجاري الرسمي - النسخة الأولى',
          targetVersionId: 'prop-v1',
          projectionPayload,
        },
        agencyReq
      );

      const pubId = pubRes.data.id;
      const targetHash = pubRes.data.payload!.targetHash;

      // 2. Client retrieves publication in Arabic (AT-042)
      const clientArReq = {
        ...clientReq,
        headers: {
          ...clientReq.headers,
          'accept-language': 'ar',
        },
      };

      const getRes = portalController.getPublication(projectId, pubId, clientArReq);
      expect(getRes.data.payload.title).toBe('العرض التجاري الرسمي - النسخة الأولى');
      expect(getRes.data.payload.accessibility.direction).toBe('rtl');
      expect(getRes.data.payload.accessibility.locale).toBe('ar');
      expect(getRes.data.payload.accessibility.statusIndicator.usesColorOnly).toBe(false);

      // 3. Client attempts decision with mismatched target hash (AT-035)
      try {
        portalController.recordClientDecision(
          projectId,
          {
            publicationId: pubId,
            decision: 'accepted',
            targetHash: 'corrupted-or-altered-hash-12345678',
            comment: 'Looks great!',
          },
          clientReq
        );
        expect.unreachable('Should have thrown 409 Conflict');
      } catch (err: any) {
        expect(err.getStatus()).toBe(409);
        expect((err.getResponse() as any).detail).toContain('TARGET_HASH_MISMATCH');
      }

      // 4. Client records valid native acceptance against exact hash (AT-041)
      const decisionRes = portalController.recordClientDecision(
        projectId,
        {
          publicationId: pubId,
          decision: 'accepted',
          targetHash,
          comment: 'Approved on behalf of Ministry of Culture.',
        },
        clientReq
      );

      expect(decisionRes.data.status).toBe('accepted');
      expect(decisionRes.data.payload!.acceptanceClassification).toBe('native_portal_decision');
      expect(decisionRes.data.payload!.legalNotice).toContain('internal native portal confirmation');
      expect(decisionRes.data.payload!.legalNotice).toContain('does not claim this constitutes a government-qualified electronic signature');

      // 5. Agency withdraws publication (AT-036)
      portalController.withdrawPublication(
        projectId,
        pubId,
        { reason: 'Scope revised due to venue reallocation' },
        agencyReq
      );

      // 6. Future client access is strictly denied with 403 Forbidden (AT-036)
      try {
        portalController.getPublication(projectId, pubId, clientReq);
        expect.unreachable('Should have thrown 403 Forbidden');
      } catch (err: any) {
        expect(err.getStatus()).toBe(403);
        expect((err.getResponse() as any).detail).toContain('PUBLICATION_WITHDRAWN');
      }

      // Client attempting to submit decision on withdrawn publication is also denied
      try {
        portalController.recordClientDecision(
          projectId,
          {
            publicationId: pubId,
            decision: 'accepted',
            targetHash,
          },
          clientReq
        );
        expect.unreachable('Should have thrown 403 Forbidden');
      } catch (err: any) {
        expect(err.getStatus()).toBe(403);
        expect((err.getResponse() as any).detail).toContain('PUBLICATION_WITHDRAWN');
      }
    });
  });

  describe('AT-032: Modification Post-Approval Supersedes Prior Hash', () => {
    it('detects material change after approval and supersedes prior authorization', () => {
      const proposalPayload = {
        proposalCode: 'PROP-2026-FINAL',
        totalAmount: '450000',
        currency: 'QAR',
        scope: ['Main Dome Setup', 'Lighting Rig'],
      };

      const approvedHash = VariationLedger.computeContentHash(proposalPayload);
      const approvalSnapshot = {
        targetId: 'prop-approved-01',
        targetType: 'proposal' as const,
        contentHash: approvedHash,
        approvedAt: new Date('2026-08-01T08:00:00Z'),
        approverId: 'usr-commercial-dir',
        status: 'active' as const,
      };

      // Exact data passes
      expect(() => {
        VariationLedger.validateExecutionAuthority(proposalPayload, approvalSnapshot, approvedHash);
      }).not.toThrow();

      // Post-approval change (price altered to 490,000 QAR)
      const modifiedPayload = {
        ...proposalPayload,
        totalAmount: '490000',
      };

      // Stale hash execution attempt is denied
      expect(() => {
        VariationLedger.validateExecutionAuthority(modifiedPayload, approvalSnapshot, approvedHash);
      }).toThrow(/EXECUTION_DENIED_APPROVAL_SUPERSEDED/);
    });
  });

  describe('AT-033: Certificate Issued After Activity Shows Actual Issuance Dates', () => {
    it('prevents presentation of post-activity certificate as pre-existing', () => {
      const activityTime = new Date('2026-07-01T10:00:00Z');
      const issueTime = new Date('2026-07-05T14:00:00Z');

      const cert = CertificateValidator.createCertificate({
        certificateId: 'cert-pyro-01',
        projectId,
        activityType: 'pyrotechnic_safety_inspection',
        activityPerformedAt: activityTime,
        issuedAt: issueTime,
        issuerId: 'usr-civil-defense-inspector',
      });

      // Actual dates are truthfully recorded
      expect(cert.activityPerformedAt.toISOString()).toBe('2026-07-01T10:00:00.000Z');
      expect(cert.issuedAt.toISOString()).toBe('2026-07-05T14:00:00.000Z');

      // Activity occurred on July 1; certificate issued July 5.
      // On July 3, the certificate was not yet issued and cannot be claimed as existing.
      const checkDate = new Date('2026-07-03T00:00:00Z');
      expect(CertificateValidator.isCertificateEffectiveAt(cert, checkDate)).toBe(false);
    });
  });
});
