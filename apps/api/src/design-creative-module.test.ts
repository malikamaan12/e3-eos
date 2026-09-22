import { describe, it, expect, beforeEach } from 'vitest';
import {
  DesignsController,
  workspaceRepository,
  designRepository,
  designVersionRepository,
  designAnnotationRepository,
  reviewRoundRepository,
  approvalRecordRepository,
  changeRequestRepository,
  releaseRepository,
  externalShareRepository,
  savedViewpointRepository,
  assetFileRepository,
} from './designs/designs.controller.js';
import { projectRepository } from './projects/projects.controller.js';
import {
  parseWavefrontObj,
  parseGltfMesh,
  DESIGN_FORMAT_CAPABILITY_MATRIX,
} from '@e3-eos/domain';

describe('Design & Creative Management Module — Comprehensive Test Suite', () => {
  let designsController: DesignsController;

  const agencyOrgId = '11111111-1111-4111-8111-111111111111';
  const clientOrgId = '22222222-2222-4222-8222-222222222222';
  const otherOrgId = '33333333-3333-4333-8333-333333333333';
  const projectId = 'prj-design-suite-001';

  beforeEach(() => {
    designsController = new DesignsController();

    workspaceRepository.clear();
    designRepository.clear();
    designVersionRepository.clear();
    designAnnotationRepository.clear();
    reviewRoundRepository.clear();
    approvalRecordRepository.clear();
    changeRequestRepository.clear();
    releaseRepository.clear();
    externalShareRepository.clear();
    savedViewpointRepository.clear();
    assetFileRepository.clear();
    projectRepository.clear();

    projectRepository.set(projectId, {
      id: projectId,
      organisationId: agencyOrgId,
      projectCode: 'E3-DES-2026',
      title: 'Qatar National Day 2026 Ceremonial Boulevard',
      description: 'Master scenic, kinetic staging, and architectural overlay',
      originCode: 'DIRECT_AWARD',
      ownerId: 'usr-pm-lead',
      clientOrganisationId: clientOrgId,
      maturity: 'active_delivery',
      outcome: 'undetermined',
      financialAssumptions: {
        currency: 'QAR',
        expectedRevenueMax: '2500000',
        estimatedCost: '1800000',
      },
      rowVersion: 1,
    });
  });

  const agencyReq = {
    headers: { 'x-request-id': 'req-agency-01' },
    organisationId: agencyOrgId,
    userId: 'usr-lead-engineer',
    userName: 'Karim Haddad',
    userRole: 'super_admin',
  } as any;

  const clientReq = {
    headers: { 'x-request-id': 'req-client-01' },
    organisationId: agencyOrgId,
    userId: 'usr-client-rep',
    userName: 'Nasser Al-Kuwari',
    userRole: 'client',
  } as any;

  const otherTenantReq = {
    headers: { 'x-request-id': 'req-other-tenant' },
    organisationId: otherOrgId,
    userId: 'usr-other',
    userName: 'Unauthorized Tenant User',
    userRole: 'super_admin',
  } as any;

  // =========================================================================
  // 1. WORKSPACE ISOLATION & MANAGEMENT
  // =========================================================================
  describe('1. Workspaces & Department Isolation', () => {
    it('creates departmental workspaces and enforces tenant isolation', () => {
      const createRes = designsController.createWorkspace(
        projectId,
        {
          name: 'Main Ceremony Scenography & Kinetic Pavilion',
          responsibleDepartment: 'Scenic & Staging',
          description: '360° kinetic rings and automated gantry structures',
          defaultWorkflow: 'standard_14_step',
          linkedZones: ['Zone 1: Boulevard', 'Zone 2: Stage'],
          linkedLocations: ['Main Arch Axis A1-A4'],
          visibility: 'confidential',
          status: 'active',
        },
        agencyReq
      );

      expect(createRes.data.id).toBeDefined();
      expect(createRes.data.payload!.name).toBe('Main Ceremony Scenography & Kinetic Pavilion');
      expect(createRes.data.payload!.responsibleDepartment).toBe('Scenic & Staging');

      // List under agency
      const agencyList = designsController.listWorkspaces(projectId, agencyReq);
      expect(agencyList).toHaveLength(1);
      expect(agencyList[0].id).toBe(createRes.data.id);

      // List under foreign tenant -> returns empty array
      const otherList = designsController.listWorkspaces(projectId, otherTenantReq);
      expect(otherList).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. DESIGN ITEM REGISTRATION & TRACEABILITY
  // =========================================================================
  describe('2. Design Item Lifecycle & Entity Traceability', () => {
    it('registers design item linked to zones, requirements, and BOQ items', () => {
      const designRes = designsController.createDesign(
        projectId,
        {
          title: 'Main Ceremony 360° Kinetic LED Arch & Motorized Truss System',
          description: 'High-torque kinetic arch with dual dynamic brakes and 4K LED skin',
          discipline: 'staging',
          department: 'Scenic & Staging',
          assetType: 'technical_drawing',
          projectPhase: 'Stage 04: Detailed Design',
          priority: 'urgent',
          approvalPurpose: 'concept',
          confidentiality: 'confidential',
          clientVisibility: true,
          zones: ['Zone 1: Boulevard'],
          locations: ['Axis A1-A4'],
          requirementIds: ['REQ-QND-001', 'REQ-QND-004'],
          boqItemIds: ['BOQ-SCENIC-001', 'BOQ-RIG-002'],
          productionPackageIds: ['PKG-STEEL-01'],
          taskIds: ['TSK-CALC-01'],
        },
        agencyReq
      );

      const designId = designRes.data.id;
      expect(designId).toMatch(/^DES-PRJ-DE-/);
      expect(designRes.data.payload!.currentRevisionCode).toBe('Rev A');
      expect(designRes.data.payload!.currentVersionNumber).toBe(1);
      expect(designRes.data.payload!.currentStatus).toBe('draft');
      expect(designRes.data.payload!.requirementIds).toEqual(['REQ-QND-001', 'REQ-QND-004']);
      expect(designRes.data.payload!.boqItemIds).toEqual(['BOQ-SCENIC-001', 'BOQ-RIG-002']);

      // Retrieve item
      const fetched = designsController.getDesign(projectId, designId, agencyReq) as any;
      expect(fetched.id).toBe(designId);
      expect(fetched.title).toContain('360° Kinetic LED Arch');
    });

    it('enforces valid 14-state workflow transitions', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'VIP Royal Majlis Architecture', clientVisibility: true },
        agencyReq
      );
      const designId = designRes.data.id;

      // Transition from draft -> internal_review is allowed
      const updRes = designsController.updateDesign(
        projectId,
        designId,
        { currentStatus: 'internal_review' },
        agencyReq
      );
      expect(updRes.data.payload!.currentStatus).toBe('internal_review');

      // Direct illegal jump from internal_review -> approved_for_production without POL-DES-01 sign-off is blocked by workflow engine
      expect(() => {
        designsController.updateDesign(
          projectId,
          designId,
          { currentStatus: 'approved_for_production' },
          agencyReq
        );
      }).toThrow();
    });
  });

  // =========================================================================
  // 3. IMMUTABLE VERSIONING & FABRICATION APPROVAL RESET (AT-034)
  // =========================================================================
  describe('3. Immutable Versions, Content Hashing & AT-034 Invariant', () => {
    it('creates version v2, computes SHA-256, and strictly resets fabrication approvals', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'Atmospheric Pyro & Truss Rig' },
        agencyReq
      );
      const designId = designRes.data.id;

      // Create Version 2
      const verRes = designsController.createVersion(
        projectId,
        designId,
        {
          versionNumber: 2,
          revisionCode: 'Rev B',
          storageKey: 'designs/DES-PYRO-RevB.pdf',
          title: 'Atmospheric Pyro Rig - Rev B',
          revisionDescription: 'Updated dynamic wind load ballasts to 2.4t',
          contentData: 'BINARY_DRAWING_CONTENT_REV_B_DATA',
          costImpactFlag: true,
          scheduleImpactFlag: false,
        },
        agencyReq
      );

      const verPayload = verRes.data.payload!;
      expect(verPayload.versionNumber).toBe(2);
      expect(verPayload.revisionCode).toBe('Rev B');
      expect(verPayload.contentHash).toBeDefined();
      expect(verPayload.contentHash).toHaveLength(64); // SHA-256 hex string

      // Invariant Check (AT-034): New revision MUST NOT inherit prior fabrication approval!
      expect(verPayload.fabricationApproval).toBeUndefined();
      expect(verPayload.isLocked).toBe(false);

      // Verify parent design current status & revision code updated
      const updatedDesign = designsController.getDesign(projectId, designId, agencyReq) as any;
      expect(updatedDesign.currentVersionNumber).toBe(2);
      expect(updatedDesign.currentRevisionCode).toBe('Rev B');

      // Attempting to create duplicate or lower version number throws error
      expect(() => {
        designsController.createVersion(
          projectId,
          designId,
          { versionNumber: 2, revisionCode: 'Rev B2', storageKey: 'test.pdf' },
          agencyReq
        );
      }).toThrow();
    });

    it('performs revision comparison with delta summary', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'VIP Canopy Elevation' },
        agencyReq
      );
      const designId = designRes.data.id;

      designsController.createVersion(
        projectId,
        designId,
        {
          versionNumber: 2,
          revisionCode: 'Rev B',
          storageKey: 'designs/v2.pdf',
          contentData: 'REV2_DATA',
          addressedCommentIds: ['comm-1', 'comm-2'],
          carriedForwardCommentIds: ['comm-3'],
          costImpactFlag: true,
        },
        agencyReq
      );

      const compareRes = designsController.compareVersions(projectId, designId, '1', '2', agencyReq);
      expect(compareRes.deltaSummary.revisionCodeFrom).toBe('Rev A');
      expect(compareRes.deltaSummary.revisionCodeTo).toBe('Rev B');
      expect(compareRes.deltaSummary.hashDifference).toBe(true);
      expect(compareRes.deltaSummary.addressedCommentsCount).toBe(2);
      expect(compareRes.deltaSummary.carriedForwardCommentsCount).toBe(1);
      expect(compareRes.deltaSummary.hasCommercialImpact).toBe(true);
    });
  });

  // =========================================================================
  // 4. COORDINATE MARKUPS, 3D/VIDEO METADATA & REPLIES
  // =========================================================================
  describe('4. Multi-Engine Coordinate Pins & Threaded Replies', () => {
    it('places coordinate pins with 2D percent, 3D coordinates, and video timestamp', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'Main Arch Rigging Plan' },
        agencyReq
      );
      const designId = designRes.data.id;

      const annotRes = designsController.addAnnotation(
        projectId,
        designId,
        {
          versionId: `ver-${designId}-v1`,
          xPercent: 35.5,
          yPercent: 42.8,
          geometryType: 'pin',
          title: 'Dynamic Torque Braking Torque Rating',
          discipline: 'staging',
          priority: 'urgent',
          commentType: 'clash_conflict',
          visibility: 'client_visible',
          message: 'Verify dynamic electromagnetic braking torque rating is 150% of maximum kinetic load.',
          threeDCoordinates: { x: 12.5, y: 4.2, z: 8.0 },
          videoTimestampSec: 14.5,
        },
        agencyReq
      );

      const annot = annotRes.data.payload!;
      expect(annot.pinNumber).toBe(1);
      expect(annot.xPercent).toBe(35.5);
      expect(annot.yPercent).toBe(42.8);
      expect(annot.threeDCoordinates).toEqual({ x: 12.5, y: 4.2, z: 8.0 });
      expect(annot.videoTimestampSec).toBe(14.5);
      expect(annot.status).toBe('open');

      // Add threaded reply
      const replyRes = designsController.replyComment(
        projectId,
        designId,
        annot.id,
        {
          message: 'Siemens servo dynamic brakes verified at 200% rating in Rev B drawing callout #4.',
          visibility: 'client_visible',
          statusChange: 'resolved',
          resolutionEvidence: 'Drawing Sheet 03 Callout #4',
        },
        agencyReq
      );

      expect(replyRes.data.status).toBe('replied');
      expect(replyRes.data.payload!.status).toBe('resolved');
      expect(replyRes.data.payload!.resolved).toBe(true);
      expect(replyRes.data.payload!.comments).toHaveLength(2);
    });
  });

  // =========================================================================
  // 5. ZERO-LEAK CLIENT PORTAL SANITIZATION (C02 GUARANTEE)
  // =========================================================================
  describe('5. Zero-Leak Client Portal Gating & Sanitization', () => {
    it('strictly isolates internal-only designs, annotations, and comments from client users', () => {
      // 1. Create a client-visible design
      const publicDesign = designsController.createDesign(
        projectId,
        {
          title: 'Public Ceremonial Boulevard Layout',
          clientVisibility: true,
        },
        agencyReq
      ).data.payload!;

      // 2. Create an internal-only confidential design
      const privateDesign = designsController.createDesign(
        projectId,
        {
          title: 'Internal Supplier Costing & Margin Schedule',
          clientVisibility: false,
        },
        agencyReq
      ).data.payload!;

      // Add a client-visible pin and an internal-only pin to the public design
      const publicPin = designsController.addAnnotation(
        projectId,
        publicDesign.id,
        {
          versionId: 'v1',
          xPercent: 20,
          yPercent: 30,
          title: 'VIP Entrance Canopy Clearance',
          visibility: 'client_visible',
          message: 'Client requested 4.5m vehicle clearance.',
        },
        agencyReq
      ).data.payload!;

      const privatePin = designsController.addAnnotation(
        projectId,
        publicDesign.id,
        {
          versionId: 'v1',
          xPercent: 50,
          yPercent: 50,
          title: 'Internal Subcontractor Price Negotiation',
          visibility: 'internal_only',
          message: 'CONFIDENTIAL: Supplier agreed to 15% discount on steel truss.',
        },
        agencyReq
      ).data.payload!;

      // Also add an internal reply to the public pin
      designsController.replyComment(
        projectId,
        publicDesign.id,
        publicPin.id,
        {
          message: 'CONFIDENTIAL INTERNAL: Canopy fabric margin is 32%.',
          visibility: 'internal_only',
        },
        agencyReq
      );

      // --- CLIENT QUERY VERIFICATION ---
      // 1. Client listing designs: ONLY sees publicDesign, privateDesign is completely excluded
      const clientList = designsController.listDesigns(projectId, undefined, undefined, undefined, undefined, 'true', clientReq);
      expect(clientList.some((d: any) => d.id === publicDesign.id)).toBe(true);
      expect(clientList.some((d: any) => d.id === privateDesign.id)).toBe(false);

      // 2. Client getting annotations: ONLY sees publicPin, privatePin is excluded
      const clientAnnotations = designsController.listAnnotations(projectId, publicDesign.id, clientReq);
      expect(clientAnnotations.some((a: any) => a.id === publicPin.id)).toBe(true);
      expect(clientAnnotations.some((a: any) => a.id === privatePin.id)).toBe(false);

      // 3. Client inspecting comments within publicPin: internal-only comments are stripped
      const clientPin = clientAnnotations.find((a: any) => a.id === publicPin.id)!;
      expect(clientPin.comments.some((c: any) => c.message.includes('CONFIDENTIAL'))).toBe(false);
      expect(clientPin.comments).toHaveLength(1); // Only original public comment
    });
  });

  // =========================================================================
  // 6. FORMAL APPROVALS & POL-DES-01 GATING INVARIANT
  // =========================================================================
  describe('6. Governance Approvals & POL-DES-01 Gating Invariant', () => {
    it('blocks fabrication approval when structural or HSE sign-offs are missing', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'Main Grandstand 10,000-Seat Structural Truss' },
        agencyReq
      );
      const designId = designRes.data.id;

      // Attempting to approve for fabrication WITHOUT structural certification throws 403 Forbidden
      expect(() => {
        designsController.submitApproval(
          projectId,
          designId,
          {
            versionId: `ver-${designId}-v1`,
            decision: 'approve',
            approvalPurpose: 'approved_for_fabrication',
            digitalAcknowledgement: true,
            // Missing structural and HSE certifications!
          },
          agencyReq
        );
      }).toThrow();
    });

    it('approves for fabrication and permanently locks version when verified certifications are provided', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'Main Grandstand Structural Truss' },
        agencyReq
      );
      const designId = designRes.data.id;

      // Submit with verified Structural Engineer and HSE certifications
      const apprRes = designsController.submitApproval(
        projectId,
        designId,
        {
          versionId: `ver-${designId}-v1`,
          decision: 'approve',
          approvalPurpose: 'approved_for_fabrication',
          digitalAcknowledgement: true,
          structuralCertification: {
            certified: true,
            engineerName: 'Eng. Hisham Al-Kuwari',
            licenseNumber: 'QCDD-STR-2026-9921',
          },
          hseCertification: {
            certified: true,
            inspectorName: 'Capt. Tariq (Civil Defence)',
          },
          comments: 'Full load calculations and dynamic wind ballast certified for 45m/s gusts.',
        },
        agencyReq
      );

      expect(apprRes.data.status).toBe('decision_approve');
      expect(apprRes.data.payload!.locked).toBe(true);

      // Verify parent design is approved for production
      const updatedDesign = designsController.getDesign(projectId, designId, agencyReq) as any;
      expect(updatedDesign.currentStatus).toBe('approved_for_production');
    });
  });

  // =========================================================================
  // 7. CHANGE CONTROL & COMMERCIAL PROTECTION (VARIATION ESCALATION)
  // =========================================================================
  describe('7. Change Control & Commercial Variation Protection', () => {
    it('automatically escalates changes exceeding threshold to Lead PM and links Variation Order', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'Kinetic Arch LED Facade' },
        agencyReq
      );
      const designId = designRes.data.id;

      // Change with 45,000 QAR cost impact (> 25,000 threshold) and 3 days schedule impact (> 2 days)
      const dcrRes = designsController.createChangeRequest(
        projectId,
        designId,
        {
          designVersionId: `ver-${designId}-v1`,
          title: 'Upgrade to 8K High-Brightness Curved LED Tiles',
          description: 'Client modification requested during Boulevard lighting rehearsals.',
          classification: 'major_scope',
          estimatedCostDeltaQar: 45000,
          estimatedScheduleDeltaDays: 3,
        },
        agencyReq
      );

      const dcr = dcrRes.data.payload!;
      expect(dcr.escalateToVariation).toBe(true);
      expect(dcr.linkedVariationId).toBeDefined();
      expect(dcr.linkedVariationId).toMatch(/^VAR-/);
      expect(dcr.status).toBe('under_pm_review');
    });

    it('logs minor technical adjustments under internal change control without variation', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'Cable Gantry Conduit Layout' },
        agencyReq
      );
      const designId = designRes.data.id;

      const dcrRes = designsController.createChangeRequest(
        projectId,
        designId,
        {
          designVersionId: `ver-${designId}-v1`,
          title: 'Reroute optical fibre conduit around gantry footplate',
          description: 'Minor physical path adjustment.',
          classification: 'minor_technical',
          estimatedCostDeltaQar: 5000,
          estimatedScheduleDeltaDays: 0,
        },
        agencyReq
      );

      const dcr = dcrRes.data.payload!;
      expect(dcr.escalateToVariation).toBe(false);
      expect(dcr.linkedVariationId).toBeUndefined();
      expect(dcr.status).toBe('submitted');
    });
  });

  // =========================================================================
  // 8. PRODUCTION RELEASES & RECIPIENT ADOPTION ACKNOWLEDGEMENT
  // =========================================================================
  describe('8. Production Releases & Recipient Adoption Tracking', () => {
    it('issues production release package and tracks workshop adoption responses', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'North Stage Modular Riser System' },
        agencyReq
      );
      const designId = designRes.data.id;

      // Issue Release Package
      const releaseRes = designsController.issueRelease(
        projectId,
        designId,
        {
          designVersionId: `ver-${designId}-v1`,
          releasePurpose: 'approved_for_fabrication',
          recipients: [
            {
              recipientName: 'Al Rayyan Scenic Workshop',
              organization: 'Al Rayyan Scenic Group',
              email: 'workshop@alrayyan.qa',
            },
            {
              recipientName: 'Gulf Rigging W.L.L.',
              organization: 'Gulf Rigging W.L.L.',
              email: 'ops@gulfrigging.qa',
            },
          ],
          notes: 'Priority fabrication for Stage 04 milestone.',
          requiredAcknowledgementDate: '2026-09-22T18:00:00Z',
        },
        agencyReq
      );

      const release = releaseRes.data.payload!;
      expect(release.releaseNumber).toMatch(/^REL-/);
      expect(release.status).toBe('active');
      expect(release.recipients).toHaveLength(2);

      // Recipient acknowledges that production has started
      const ackRes = designsController.acknowledgeAdoption(
        projectId,
        designId,
        release.id,
        {
          acknowledgerName: 'Al Rayyan Scenic Workshop',
          response: 'production_started',
          notes: 'CNC profile cutting started on Bed #2.',
          productionStartDate: '2026-09-12T08:00:00Z',
        },
        agencyReq
      );

      expect(ackRes.data.status).toBe('acknowledged_production_started');
      const updatedRelease = releaseRepository.get(release.id);
      const workshopRecipient = updatedRelease?.recipients.find((r) => r.recipientName === 'Al Rayyan Scenic Workshop');
      expect(workshopRecipient?.productionStarted).toBe(true);
      expect(workshopRecipient?.adoptionStatus).toBe('production_started');
    });

    it('supersedes prior active releases when a new release is issued', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'VIP Majlis Entrance Gate' },
        agencyReq
      );
      const designId = designRes.data.id;

      // Issue Release 1
      const rel1 = designsController.issueRelease(
        projectId,
        designId,
        {
          designVersionId: `ver-${designId}-v1`,
          releasePurpose: 'approved_for_fabrication',
          recipients: [{ recipientName: 'Workshop A', organization: 'Workshop A' }],
        },
        agencyReq
      ).data.payload!;

      expect(rel1.status).toBe('active');

      // Issue Release 2
      const rel2 = designsController.issueRelease(
        projectId,
        designId,
        {
          designVersionId: `ver-${designId}-v2`,
          releasePurpose: 'approved_for_fabrication',
          recipients: [{ recipientName: 'Workshop A', organization: 'Workshop A' }],
        },
        agencyReq
      ).data.payload!;

      expect(rel2.status).toBe('active');
      const oldRel = releaseRepository.get(rel1.id);
      expect(oldRel?.status).toBe('superseded');
    });
  });

  // =========================================================================
  // 9. SECURE EXTERNAL SHARE
  // =========================================================================
  describe('9. Forensic Watermarked External Sharing', () => {
    it('creates secure tokenized share link with forensic watermark and OTP requirement', () => {
      const designRes = designsController.createDesign(
        projectId,
        { title: 'Boulevard Security Gantry Elevations' },
        agencyReq
      );
      const designId = designRes.data.id;

      const shareRes = designsController.createExternalShare(
        projectId,
        designId,
        {
          designVersionId: `ver-${designId}-v1`,
          recipientName: 'Major Khaled (Ministry of Interior)',
          recipientEmail: 'khaled@moi.gov.qa',
          requireOtp: true,
          canView: true,
          canComment: true,
          canApprove: false,
          watermarkText: 'khaled@moi.gov.qa • Qatar Ministry of Interior • EOS Confidential',
          expiresAt: '2026-09-25T00:00:00Z',
        },
        agencyReq
      );

      const share = shareRes.data.payload!;
      expect(share.shareToken).toBeDefined();
      expect(share.otpHash).toBeDefined();
      expect(share.watermarkText).toContain('khaled@moi.gov.qa');
      expect(share.isRevoked).toBe(false);
    });
  });

  // =========================================================================
  // 10. MASTER REGISTERS & OVERVIEW KPIS
  // =========================================================================
  describe('10. Registers & Dashboard Aggregate KPIs', () => {
    it('generates master design register and immutable revision register', () => {
      const d1 = designsController.createDesign(
        projectId,
        { title: 'Projected Water Screen Basin', discipline: 'staging' },
        agencyReq
      ).data.payload!;

      designsController.createVersion(
        projectId,
        d1.id,
        {
          versionNumber: 2,
          revisionCode: 'Rev B',
          storageKey: 'designs/basin-v2.pdf',
          contentData: 'BASIN_V2_DATA',
        },
        agencyReq
      );

      // Design Register
      const reg = designsController.getDesignRegister(projectId, agencyReq);
      expect(reg.length).toBeGreaterThanOrEqual(1);
      const item = reg.find((r: any) => r.designId === d1.id);
      expect(item).toBeDefined();
      expect(item!.title).toBe('Projected Water Screen Basin');
      expect(item!.currentRevisionCode).toBe('Rev B');

      // Revision Register
      const revReg = designsController.getRevisionRegister(projectId, agencyReq);
      expect(revReg.length).toBeGreaterThanOrEqual(2); // Rev A and Rev B
      expect(revReg.some((r: any) => r.revisionCode === 'Rev A')).toBe(true);
      expect(revReg.some((r: any) => r.revisionCode === 'Rev B')).toBe(true);

      // Overview KPIs
      const kpis = designsController.getOverviewKpis(projectId, agencyReq);
      expect(kpis.totalDesigns).toBeGreaterThanOrEqual(1);
      expect(kpis.awaitingInternalReview).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 11. POL-DES-01 GATING DIFFERENTIATION (CREATIVE VS STRUCTURAL)
  // =========================================================================
  describe('11. POL-DES-01 Gating Differentiation', () => {
    it('exempts non-structural creative assets from structural engineer sign-off', () => {
      const creativeDesign = designsController.createDesign(
        projectId,
        {
          title: 'Boulevard Floral Branding & Graphic Concept',
          discipline: 'creative',
          assetType: 'render',
          clientVisibility: true,
        },
        agencyReq
      ).data.payload!;

      // Approve for production release without structural/HSE sign-off
      const apprRes = designsController.submitApproval(
        projectId,
        creativeDesign.id,
        {
          versionId: `ver-${creativeDesign.id}-v1`,
          decision: 'approve',
          approvalPurpose: 'approved_for_production',
          comments: 'Creative artwork signed off by Head of Design',
          digitalAcknowledgement: true,
        },
        agencyReq
      );

      expect(apprRes.data.status).toBe('decision_approve');
      expect(apprRes.data.payload!.decision).toBe('approve');
      const updated = designsController.getDesign(projectId, creativeDesign.id, agencyReq) as any;
      expect(updated.currentStatus).toBe('approved_for_production');
    });

    it('strictly enforces dual sign-off (PE + Civil Defence) for structural staging packages', () => {
      const structuralDesign = designsController.createDesign(
        projectId,
        {
          title: 'Heavy Scenic Kinetic Tower Framework',
          discipline: 'staging',
          assetType: 'technical_drawing',
          clientVisibility: true,
        },
        agencyReq
      ).data.payload!;

      // Attempting to approve structural package without certifications throws 403 FORBIDDEN
      expect(() => {
        designsController.submitApproval(
          projectId,
          structuralDesign.id,
          {
            versionId: `ver-${structuralDesign.id}-v1`,
            decision: 'approve',
            approvalPurpose: 'approved_for_production',
            comments: 'Missing engineering certifications',
            digitalAcknowledgement: true,
          },
          agencyReq
        );
      }).toThrow();

      // Passing verified structural + HSE certifications succeeds
      const validAppr = designsController.submitApproval(
        projectId,
        structuralDesign.id,
        {
          versionId: `ver-${structuralDesign.id}-v1`,
          decision: 'approve',
          approvalPurpose: 'approved_for_production',
          comments: 'Dual sign-off verified with certified license and QCDD clearance',
          digitalAcknowledgement: true,
          structuralCertification: {
            certified: true,
            engineerName: 'Dr. Tariq Al-Ansari (PE)',
            licenseNumber: 'QCDD-STR-2026-9021',
          },
          hseCertification: {
            certified: true,
            inspectorName: 'Capt. Rashid (Civil Defence)',
          },
        },
        agencyReq
      );

      expect(validAppr.data.status).toBe('decision_approve');
      const updated = designsController.getDesign(projectId, structuralDesign.id, agencyReq) as any;
      expect(updated.currentStatus).toBe('approved_for_production');
    });
  });

  // =========================================================================
  // 12. AUTHENTIC ASSET DOWNLOADS & CLIENT PORTAL PERMISSIONS
  // =========================================================================
  describe('12. Authentic Asset Downloads & Client Portal Zero-Leak Enforcement', () => {
    it('allows client to download published assets while blocking access to internal drafts', () => {
      // 1. Create client-visible design package
      const pubDesign = designsController.createDesign(
        projectId,
        {
          title: 'Ceremony Stage Layout (Published)',
          clientVisibility: true,
        },
        agencyReq
      ).data.payload!;

      // Upload version
      const verRes = designsController.createVersion(
        projectId,
        pubDesign.id,
        {
          versionNumber: 2,
          revisionCode: 'Rev B',
          storageKey: 'designs/stage-rev-b.dwg',
          contentData: 'AUTHENTIC_CAD_BINARY_REV_B_BYTES_STREAM',
          fileName: 'Ceremony_Stage_RevB.dwg',
          mimeType: 'application/acad',
        },
        agencyReq
      );

      // Agency download works
      const agencyDownload = designsController.downloadVersion(
        projectId,
        pubDesign.id,
        verRes.data.id,
        agencyReq
      );
      expect(agencyDownload.fileName).toBe('Ceremony_Stage_RevB.dwg');
      expect(agencyDownload.mimeType).toBe('application/acad');
      expect(agencyDownload.sha256Hash).toBeDefined();

      // 2. Create internal-only quarantined design package
      const privateDesign = designsController.createDesign(
        projectId,
        {
          title: 'Subcontractor Trade Rates & Profit Analysis',
          clientVisibility: false,
        },
        agencyReq
      ).data.payload!;

      // Client attempting to download internal version is strictly blocked (HTTP 403)
      expect(() => {
        designsController.downloadVersion(
          projectId,
          privateDesign.id,
          `ver-${privateDesign.id}-v1`,
          clientReq
        );
      }).toThrow();
    });
  });

  // =========================================================================
  // 13. 3D SPATIAL SAVED VIEWPOINTS
  // =========================================================================
  describe('13. 3D Spatial Saved Viewpoints Engine', () => {
    it('saves and retrieves 3D camera viewpoints for spatial designs', () => {
      const design = designsController.createDesign(
        projectId,
        {
          title: 'VIP Viewing Platform & Cantilever Arch',
          discipline: 'staging',
          assetType: '3d_model',
        },
        agencyReq
      ).data.payload!;

      // Save Viewpoint 1: Royal Box Sightline
      const vp1 = designsController.saveViewpoint(
        projectId,
        design.id,
        {
          name: 'VIP Royal Box Direct Sightline',
          yaw: 35.5,
          pitch: -15.2,
          zoomLevel: 140,
          pan: { x: 25, y: -40 },
        },
        agencyReq
      );

      expect(vp1.data.id).toMatch(/^vp-/);
      expect(vp1.data.payload!.name).toBe('VIP Royal Box Direct Sightline');
      expect(vp1.data.payload!.yaw).toBe(35.5);
      expect(vp1.data.payload!.pan).toEqual({ x: 25, y: -40 });

      // Save Viewpoint 2: Truss Node A4
      designsController.saveViewpoint(
        projectId,
        design.id,
        {
          name: 'Truss Node A4 Dynamic Clearance',
          yaw: -80,
          pitch: -45,
          zoomLevel: 210,
          pan: { x: 0, y: 0 },
        },
        agencyReq
      );

      // Retrieve viewpoints
      const viewpoints = designsController.getViewpoints(projectId, design.id, agencyReq);
      expect(viewpoints).toHaveLength(2);
      expect(viewpoints[0].name).toBe('VIP Royal Box Direct Sightline');
      expect(viewpoints[1].name).toBe('Truss Node A4 Dynamic Clearance');
    });
  });

  // =========================================================================
  // 14. UNIVERSAL 3D MESH PARSERS (.OBJ & .GLTF)
  // =========================================================================
  describe('14. Universal 3D Model Parsers (Wavefront OBJ & GLTF)', () => {
    it('parses Wavefront .obj geometry with vertices and faces', () => {
      const rawObj = `
        v 0.0 0.0 0.0
        v 10.0 0.0 0.0
        v 10.0 10.0 0.0
        v 0.0 10.0 0.0
        f 1 2 3
        f 1 3 4
      `;
      const mesh = parseWavefrontObj(rawObj, 'stage_platform.obj');
      expect(mesh.name).toBe('stage_platform.obj');
      expect(mesh.vertices).toHaveLength(4);
      expect(mesh.faces).toHaveLength(2);
      expect(mesh.faces[0]).toEqual([0, 1, 2]);
      expect(mesh.faces[1]).toEqual([0, 2, 3]);
      expect(mesh.bounds.maxX).toBe(10);
    });

    it('parses GLTF mesh data with primitives and positions', () => {
      const gltfJson = JSON.stringify({
        asset: { version: '2.0' },
        meshes: [
          {
            name: 'TrussRing',
            primitives: [
              {
                indices: [0, 1, 2],
                attributes: {
                  POSITION: [
                    [0, 0, 0],
                    [50, 0, 0],
                    [25, 40, 0],
                  ],
                },
              },
            ],
          },
        ],
      });

      const mesh = parseGltfMesh(gltfJson, 'truss_ring.gltf');
      expect(mesh.name).toBe('truss_ring.gltf');
      expect(mesh.vertices).toHaveLength(3);
      expect(mesh.faces).toHaveLength(1);
      expect(mesh.faces[0]).toEqual([0, 1, 2]);
      expect(mesh.bounds.maxX).toBe(50);
    });
  });

  // =========================================================================
  // 15. VIDEO TIMESTAMP PIN ANCHORING & CAPABILITY MATRIX
  // =========================================================================
  describe('15. Video Timestamp Pin Anchoring & Capabilities Matrix', () => {
    it('anchors review pin threads to exact video playback timestamps', () => {
      const videoDesign = designsController.createDesign(
        projectId,
        {
          title: '360° Kinetic Ring Boulevard Rehearsal Simulation',
          discipline: 'staging',
          assetType: 'video_simulation',
        },
        agencyReq
      ).data.payload!;

      // Add pin thread at 14.5s timestamp
      const annotRes = designsController.addAnnotation(
        projectId,
        videoDesign.id,
        {
          versionId: `ver-${videoDesign.id}-v1`,
          xPercent: 62.5,
          yPercent: 38.0,
          videoTimestampSec: 14.5,
          threeDCoordinates: { x: 120, y: -45, z: 200 },
          title: 'Dynamic Torque Acceleration Peak',
          discipline: 'staging',
          priority: 'urgent',
          visibility: 'internal_only',
          message: 'Truss deflection exceeds 12mm at maximum rotational speed',
        },
        agencyReq
      );

      expect(annotRes.data.id).toMatch(/^annot-/);
      const annot = annotRes.data.payload!;
      expect(annot.videoTimestampSec).toBe(14.5);
      expect(annot.threeDCoordinates).toEqual({ x: 120, y: -45, z: 200 });

      // Verify retrieval
      const annots = designsController.listAnnotations(projectId, videoDesign.id, agencyReq);
      expect(annots).toHaveLength(1);
      expect(annots[0].videoTimestampSec).toBe(14.5);
      expect(annots[0].title).toBe('Dynamic Torque Acceleration Peak');
    });

    it('publishes transparent format capability matrix', () => {
      expect(DESIGN_FORMAT_CAPABILITY_MATRIX.length).toBeGreaterThanOrEqual(10);
      const dwg = DESIGN_FORMAT_CAPABILITY_MATRIX.find((c) => c.extension === '.dwg');
      const gltf = DESIGN_FORMAT_CAPABILITY_MATRIX.find((c) => c.extension === '.gltf');
      const mp4 = DESIGN_FORMAT_CAPABILITY_MATRIX.find((c) => c.extension === '.mp4');

      expect(dwg).toBeDefined();
      expect(dwg!.category).toBe('converted_view');
      expect(gltf).toBeDefined();
      expect(gltf!.viewerEngine).toBe('3d_model');
      expect(mp4).toBeDefined();
      expect(mp4!.viewerEngine).toBe('video');
    });
  });
});
