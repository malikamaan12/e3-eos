import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScopeController,
  requirementRepository,
  revisionRepository,
  attachmentRepository,
  clarificationRepository,
  parsingJobRepository,
} from '../apps/api/src/scope/scope.controller.js';
import {
  compareRequirementRevisions,
  validateBulkScopeRows,
  parseTenderDocument,
  ALL_MEDIA_CATEGORIES,
} from '@e3-eos/domain';

describe('Progressive Scope & Requirements Management Acceptance Suite', () => {
  let controller: ScopeController;
  const mockOrgId = '11111111-1111-4111-8111-111111111111';
  const mockProjectId = 'prj-qatar-test-01';
  const mockReq = {
    user: { id: 'usr-pm-01', name: 'Tariq Mansoor', role: 'technical_director' },
    organisationId: mockOrgId,
  } as any;

  beforeEach(() => {
    controller = new ScopeController();
    requirementRepository.clear();
    revisionRepository.clear();
    attachmentRepository.clear();
    clarificationRepository.clear();
    parsingJobRepository.clear();
  });

  // =========================================================================
  // 1. PROGRESSIVE SCOPE CAPTURE INVARIANT
  // =========================================================================
  describe('1. Progressive Scope Capture Invariant', () => {
    it('allows quick capture with title ONLY, preserving missing attributes as unassigned/null', async () => {
      const res = await controller.createRequirement(
        mockProjectId,
        {
          title: 'VIP Holding Majlis Canopy',
        },
        mockReq,
      );

      expect(res.data.id).toBeDefined();
      const created = res.data.payload;
      expect(created.title).toBe('VIP Holding Majlis Canopy');
      expect(created.status).toBe('draft');
      expect(created.code).toMatch(/^REQ-/);
      // Progressive invariant: missing attributes must NOT be fabricated
      expect(created.description).toBeUndefined();
      expect(created.ownerName).toBeUndefined();
      expect(created.ownerId).toBeUndefined();
      expect(created.dueDate).toBeUndefined();
      expect(created.targetCostQar).toBeUndefined();
      expect(created.boqItemId).toBeUndefined();
      expect(created.designPackageId).toBeUndefined();
    });

    it('progressively advances traceability score from 0/7 up to 7/7 as deliverables are connected', async () => {
      // Step 1: Title only -> 0/7 (0%)
      const createRes = await controller.createRequirement(
        mockProjectId,
        { title: 'Acoustic Sound Barrier' },
        mockReq,
      );
      const reqId = createRes.data.id;

      let trace = await controller.getTraceabilityMatrix(mockProjectId);
      let ev = trace.data.evaluations.find((e: any) => e.requirementId === reqId);
      expect(ev).toBeDefined();
      expect(ev.hasOwner).toBe(false);
      expect(ev.hasTargetDate).toBe(false);
      expect(ev.completedPoints).toBe(0);

      // Step 2: Assign Owner -> 1/7
      await controller.updateRequirement(
        mockProjectId,
        reqId,
        { ownerName: 'Ahmad Al-Kuwari', ownerId: 'usr-lead-01' },
        mockReq,
      );
      trace = await controller.getTraceabilityMatrix(mockProjectId);
      ev = trace.data.evaluations.find((e: any) => e.requirementId === reqId);
      expect(ev.hasOwner).toBe(true);
      expect(ev.completedPoints).toBe(1);

      // Step 3: Assign Due Date -> 2/7
      await controller.updateRequirement(
        mockProjectId,
        reqId,
        { dueDate: '2026-11-15' },
        mockReq,
      );
      trace = await controller.getTraceabilityMatrix(mockProjectId);
      ev = trace.data.evaluations.find((e: any) => e.requirementId === reqId);
      expect(ev.hasTargetDate).toBe(true);
      expect(ev.completedPoints).toBe(2);

      // Step 4: Link Controlled Document & Design Version -> 4/7
      await controller.updateRequirement(
        mockProjectId,
        reqId,
        {
          linkedDocumentNumber: 'DOC-ENV-001',
          linkedDesignVersion: 'CAD-REV-B',
        },
        mockReq,
      );
      trace = await controller.getTraceabilityMatrix(mockProjectId);
      ev = trace.data.evaluations.find((e: any) => e.requirementId === reqId);
      expect(ev.hasControlledDocument).toBe(true);
      expect(ev.hasDesignVersion).toBe(true);
      expect(ev.completedPoints).toBe(4);

      // Step 5: Link BOQ & Approval & Delivery Evidence -> 7/7
      await controller.updateRequirement(
        mockProjectId,
        reqId,
        {
          linkedBoqLineCode: 'BOQ-04-012',
          targetCostQar: 45000,
          approvalRequestId: 'appr-req-001',
          deliveryEvidenceHash: 'sha256-abcdef1234567890',
          status: 'delivered',
        },
        mockReq,
      );
      trace = await controller.getTraceabilityMatrix(mockProjectId);
      ev = trace.data.evaluations.find((e: any) => e.requirementId === reqId);
      expect(ev.hasBoqCost).toBe(true);
      expect(ev.hasApprovalSignoff).toBe(true);
      expect(ev.hasDeliveryEvidence).toBe(true);
      expect(ev.completedPoints).toBe(7);
      expect(ev.overallTraceabilityPct).toBe(100);
      expect(ev.isFullyTraceable).toBe(true);
    });
  });

  // =========================================================================
  // 2. BASELINE PROTECTION & REVISION GOVERNANCE INVARIANT
  // =========================================================================
  describe('2. Baseline Protection & Revision Governance Invariant', () => {
    it('allows direct edits in draft or active state without mandatory revision snapshots', async () => {
      const created = await controller.createRequirement(
        mockProjectId,
        { title: 'Preliminary Truss Calculation', status: 'draft' },
        mockReq,
      );
      const reqId = created.data.id;

      const updated = await controller.updateRequirement(
        mockProjectId,
        reqId,
        { title: 'Finalized Truss Structural Load' },
        mockReq,
      );

      expect(updated.data.payload.title).toBe('Finalized Truss Structural Load');
      const revisions = await controller.getRequirementRevisions(mockProjectId, reqId);
      expect(revisions.data.length).toBe(0);
    });

    it('automatically generates formal RequirementRevision snapshot when editing approved baseline scope', async () => {
      // Create and approve requirement
      const created = await controller.createRequirement(
        mockProjectId,
        {
          title: 'Approved Main Stage Canopy',
          targetCostQar: 200000,
          status: 'approved',
        },
        mockReq,
      );
      const reqId = created.data.id;

      // Edit approved baseline scope without super admin override
      await controller.updateRequirement(
        mockProjectId,
        reqId,
        {
          title: 'Approved Main Stage Canopy (Extended by 5m)',
          targetCostQar: 260000,
          changeReason: 'Client requested 5m extension for extra protocol seating',
        },
        mockReq,
      );

      const revisions = await controller.getRequirementRevisions(mockProjectId, reqId);
      expect(revisions.data.length).toBe(1);
      const rev = revisions.data[0];
      expect(rev.revisionNumber).toBe(1);
      expect(rev.authorName).toBe('Tariq Mansoor');
      expect(rev.reasonForChange).toBe('Client requested 5m extension for extra protocol seating');
      expect(rev.changedFields).toContain('title');
      expect(rev.changedFields).toContain('targetCostQar');
    });

    it('allows super admin override with mandatory justification without formal snapshotting', async () => {
      const created = await controller.createRequirement(
        mockProjectId,
        {
          title: 'Baseline Audio Array',
          status: 'approved',
        },
        mockReq,
      );
      const reqId = created.data.id;

      const superAdminReq = {
        user: { id: 'usr-admin-01', name: 'Super Admin', role: 'super_admin' },
        organisationId: mockOrgId,
      } as any;

      await controller.updateRequirement(
        mockProjectId,
        reqId,
        {
          title: 'Baseline Audio Array (Typo Fix)',
          superAdminOverride: true,
          overrideReason: 'Emergency typo correction per project steering committee directive',
        },
        superAdminReq,
      );

      const item = await controller.getRequirement(mockProjectId, reqId);
      expect(item.data.title).toBe('Baseline Audio Array (Typo Fix)');
      // No revision created due to super admin direct override
      const revisions = await controller.getRequirementRevisions(mockProjectId, reqId);
      expect(revisions.data.length).toBe(0);
    });

    it('accurately computes diffs using compareRequirementRevisions utility', () => {
      const rev1 = {
        title: 'Initial Stage Design',
        description: 'Original 10x10m platform',
        targetCostQar: 50000,
      };

      const rev2 = {
        title: 'Expanded Stage Design',
        description: 'Updated 15x15m platform with ramp',
        targetCostQar: 85000,
      };

      const comparison = compareRequirementRevisions(rev1, rev2);
      expect(comparison.hasChanges).toBe(true);
      expect(comparison.changedFields.length).toBeGreaterThanOrEqual(2);
      expect(comparison.newValues['title']).toBe('Expanded Stage Design');
      expect(comparison.newValues['targetCostQar']).toBe(85000);
    });
  });

  // =========================================================================
  // 3. MEDIA ATTACHMENTS ACROSS 17 CANONICAL CATEGORIES
  // =========================================================================
  describe('3. Media Attachments Across 17 Canonical Categories', () => {
    it('supports all 17 media attachment categories', () => {
      expect(ALL_MEDIA_CATEGORIES.length).toBe(17);
      expect(ALL_MEDIA_CATEGORIES).toContain('site_photo');
      expect(ALL_MEDIA_CATEGORIES).toContain('cad_drawing');
      expect(ALL_MEDIA_CATEGORIES).toContain('authority_permit');
      expect(ALL_MEDIA_CATEGORIES).toContain('engineering_calc');
    });

    it('attaches and retrieves media attachments for a scope requirement', async () => {
      const created = await controller.createRequirement(
        mockProjectId,
        { title: 'Structural Roof Truss' },
        mockReq,
      );
      const reqId = created.data.id;

      const attachRes = await controller.addAttachment(
        mockProjectId,
        reqId,
        {
          fileName: 'Truss_Structural_Calculation_v3.pdf',
          fileSize: 4194304,
          mimeType: 'application/pdf',
          mediaCategory: 'engineering_calc',
          fileUrl: 'https://storage.e3.qa/documents/truss-calc-v3.pdf',
          description: 'Stamped calculation by third-party engineering consultant',
        },
        mockReq,
      );

      expect(attachRes.data.id).toBeDefined();
      expect(attachRes.data.status).toBe('created');

      const attachments = await controller.getAttachments(mockProjectId, reqId);
      expect(attachments.data.length).toBe(1);
      expect(attachments.data[0].fileName).toBe('Truss_Structural_Calculation_v3.pdf');
      expect(attachments.data[0].mediaCategory).toBe('engineering_calc');
      expect(attachments.data[0].uploadedByName).toBe('Tariq Mansoor');
    });
  });

  // =========================================================================
  // 4. LINKED RFIs / CLARIFICATIONS
  // =========================================================================
  describe('4. Linked RFIs / Clarifications', () => {
    it('creates and links a clarification directly from a scope requirement', async () => {
      const created = await controller.createRequirement(
        mockProjectId,
        { title: 'Emergency Egress Lighting' },
        mockReq,
      );
      const reqId = created.data.id;

      const rfiRes = await controller.createClarificationForRequirement(
        mockProjectId,
        reqId,
        {
          question: 'Does QCDD require battery-backed fixtures or a secondary generator feed?',
          source: 'bidder_inquiry',
          dueAt: '2026-10-01T00:00:00Z',
          category: 'safety',
          rfpSectionRef: 'Section 8.4 Safety Codes',
        },
        mockReq,
      );

      expect(rfiRes.data.id).toBeDefined();
      expect(rfiRes.data.payload.clarificationCode).toMatch(/^RFI-/);

      // Verify requirement detail includes the linked clarification
      const detail = await controller.getRequirement(mockProjectId, reqId);
      expect(detail.data.linkedClarifications.length).toBe(1);
      expect(detail.data.linkedClarifications[0].question).toContain('QCDD');
    });
  });

  // =========================================================================
  // 5. BULK SCOPE ENTRY VALIDATION & PARTIAL SAVE
  // =========================================================================
  describe('5. Bulk Scope Entry Engine', () => {
    it('validates rows and reports precise row-level errors for invalid items', () => {
      const rows = [
        { title: 'VIP Protocol Majlis', category: 'protocol_ceremony', targetCostQar: 80000 },
        { title: '', category: 'staging_technical' }, // Invalid: missing title
        { title: 'LED Wall Screen 4K', category: 'creative_visual', targetCostQar: -500 }, // Invalid: negative cost
      ];

      const validation = validateBulkScopeRows(rows);
      expect(validation.validRows.length).toBe(1);
      expect(validation.invalidRows.length).toBe(2);
      expect(validation.invalidRows[0].index).toBe(2);
      expect(validation.invalidRows[0].errors[0]).toContain('Requirement Title is required');
      expect(validation.invalidRows[1].index).toBe(3);
      expect(validation.invalidRows[1].errors[0]).toContain('Target Cost must be a positive number');
    });

    it('performs bulk creation with valid rows and returns successful entries', async () => {
      const bulkRes = await controller.bulkCreateRequirements(
        mockProjectId,
        {
          items: [
            { title: 'Perimeter Crowd Barrier', category: 'health_safety', priority: 'high' },
            { title: 'Media Broadcast Riser', category: 'staging_technical', priority: 'medium' },
            { title: 'Ceremonial Flagpoles', category: 'protocol_ceremony', priority: 'low' },
          ],
        },
        mockReq,
      );

      expect(bulkRes.data.payload.count).toBe(3);
      expect(bulkRes.data.payload.created.length).toBe(3);
      expect(bulkRes.data.payload.created[0].code).toMatch(/^REQ-/);
    });

    it('performs bulk updates across selected requirement IDs', async () => {
      const req1 = await controller.createRequirement(mockProjectId, { title: 'Item 1' }, mockReq);
      const req2 = await controller.createRequirement(mockProjectId, { title: 'Item 2' }, mockReq);

      const bulkUpdateRes = await controller.bulkUpdateRequirements(
        mockProjectId,
        {
          requirementIds: [req1.data.id, req2.data.id],
          updates: {
            ownerName: 'Khalid Al-Hajri',
            status: 'in_design',
          },
        },
      );

      expect(bulkUpdateRes.data.payload.count).toBe(2);
      const item1 = await controller.getRequirement(mockProjectId, req1.data.id);
      const item2 = await controller.getRequirement(mockProjectId, req2.data.id);
      expect(item1.data.ownerName).toBe('Khalid Al-Hajri');
      expect(item1.data.status).toBe('in_design');
      expect(item2.data.ownerName).toBe('Khalid Al-Hajri');
      expect(item2.data.status).toBe('in_design');
    });
  });

  // =========================================================================
  // 6. RFP DOCUMENT PARSER ENGINE WITH CITATION PRESERVATION
  // =========================================================================
  describe('6. RFP Document Parser Engine', () => {
    it('extracts candidate requirements with exact verbatim quotes and citations', () => {
      const tenderText = `
        SECTION 3.1 STRUCTURAL STAGING SPECIFICATIONS
        The contractor shall supply a heavy-duty outdoor stage structure capable of withstanding 25 m/s wind gusts.
        All structural connections must be certified by an approved third-party engineer.

        SECTION 4.2 AUDIOVISUAL DELIVERABLES
        Provide a minimum of 400 square meters of high-resolution 2.6mm pitch outdoor LED screen.
        The screen must feature dual redundant power feeds and backup fiber optic processing.
      `;

      const result = parseTenderDocument(tenderText);
      expect(result.candidates.length).toBeGreaterThanOrEqual(2);

      const structuralCandidate = result.candidates.find((c) =>
        c.title.toLowerCase().includes('structural') || c.description.toLowerCase().includes('wind'),
      );
      expect(structuralCandidate).toBeDefined();
      expect(structuralCandidate?.sourceClause).toContain('SECTION 3.1');
      expect(structuralCandidate?.sourceQuote).toBeDefined();

      const ledCandidate = result.candidates.find((c) =>
        c.title.toLowerCase().includes('audiovisual') || c.description.toLowerCase().includes('led'),
      );
      expect(ledCandidate).toBeDefined();
      expect(ledCandidate?.sourceClause).toContain('SECTION 4.2');
    });

    it('flags potential duplicates when token similarity is high', () => {
      const existingReqs: any[] = [
        {
          id: 'req-01',
          title: 'Structural Staging Specifications',
          description: 'Outdoor stage structural frame with wind gust rating',
        },
      ];

      const tenderText = `
        SECTION 3.1 Structural Staging Specifications
        The contractor shall supply a heavy-duty outdoor stage structure capable of withstanding 25 m/s wind gusts.
      `;

      const result = parseTenderDocument(tenderText, { existingRequirements: existingReqs });
      const dup = result.candidates.find((c) => Boolean(c.potentialDuplicateOf));
      expect(dup).toBeDefined();
      expect(dup?.potentialDuplicateOf?.requirementId).toBe('req-01');
    });

    it('supports candidate review lifecycle (approve, reject, clarification)', async () => {
      const parseJob = await controller.parseDocument(
        mockProjectId,
        {
          documentName: 'Qatar Tourism RFP 2026',
          rawText: 'SECTION 1.0 General\nContractor must provide comprehensive crowd management fencing along the corniche.',
        },
        mockReq,
      );

      const jobId = parseJob.data.id;
      const jobRes = await controller.getParsingJob(mockProjectId, jobId);
      expect(jobRes.data.candidates.length).toBeGreaterThanOrEqual(1);
      const candidateId = jobRes.data.candidates[0].id;

      // Review and approve candidate
      const reviewRes = await controller.reviewParsingCandidate(
        mockProjectId,
        jobId,
        {
          candidateId,
          action: 'approve',
          edits: {
            title: 'Corniche Perimeter Crowd Control Fencing',
            priority: 'critical',
          },
        },
        mockReq,
      );

      expect(reviewRes.data.status).toBe('approved');
      expect(reviewRes.data.payload.createdRequirement).toBeDefined();

      const createdId = reviewRes.data.payload.createdRequirement.id;
      // Verify requirement is registered in repository
      const createdReq = await controller.getRequirement(
        mockProjectId,
        createdId,
      );
      expect(createdReq.data.title).toBe('Corniche Perimeter Crowd Control Fencing');
      expect(createdReq.data.priority).toBe('critical');
    });
  });

  // =========================================================================
  // 7. EXPORT REGISTER WITH TRACEABILITY & STAGE-GATE READINESS
  // =========================================================================
  describe('7. Scope Register CSV Export', () => {
    it('generates standard CSV with 7-point traceability and stage readiness columns', async () => {
      await controller.createRequirement(
        mockProjectId,
        {
          title: 'Royal Box Acoustic Baffles',
          description: 'Sound isolation baffles for royal seating enclosure',
          ownerName: 'Nasser Al-Attiyah',
          dueDate: '2026-10-20',
          targetCostQar: 75000,
          status: 'in_design',
        },
        mockReq,
      );

      const exportRes = await controller.exportRequirements(mockProjectId, 'csv');
      expect(exportRes.data.csv).toBeDefined();
      expect(typeof exportRes.data.csv).toBe('string');
      expect(exportRes.data.csv).toContain('Code,Title,Category,Discipline,Status');
      expect(exportRes.data.csv).toContain('Completeness,Owner,Due Date');
      expect(exportRes.data.csv).toContain('Royal Box Acoustic Baffles');
      expect(exportRes.data.csv).toContain('Nasser Al-Attiyah');
      expect(exportRes.data.csv).toContain('Tender Ready,Design Ready,Commercial Ready,Production Ready,Closeout Ready');
    });
  });
});
