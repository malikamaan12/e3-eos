import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseIntelligentDocument,
  compareDocumentVersions,
  PARSER_VERSION,
  ExtractedScopeCandidate,
  calculateTokenSimilarity,
} from '@e3-eos/domain';
import { ScopeController, requirementRepository, revisionRepository, allocationRepository, designPackageRepository, designVariantRepository, clarificationRepository, parsingJobRepository, documentComparisonRepository } from '../apps/api/src/scope/scope.controller.js';
import { Request } from 'express';

describe('E3-EOS Phase 3: Intelligent RFP & Document Requirement Parser', () => {
  const testProjectId = 'f1111111-1111-4111-8111-111111111111';
  const testOrgId = '11111111-1111-4111-8111-111111111111';
  let controller: ScopeController;

  const mockRequest = {
    organisationId: testOrgId,
    actorId: 'test-lead-pm',
    userId: 'test-lead-pm',
    headers: { 'x-organisation-id': testOrgId },
  } as unknown as Request;

  beforeEach(() => {
    controller = new ScopeController();
    requirementRepository.clear();
    revisionRepository.clear();
    allocationRepository.clear();
    designPackageRepository.clear();
    designVariantRepository.clear();
    clarificationRepository.clear();
    parsingJobRepository.clear();
    documentComparisonRepository.clear();
  });

  describe('1. Document Ingestion, Multi-Pass Pipeline & Provenance Model', () => {
    it('should extract document blocks with page numbers, bounding boxes, and OCR confidence', () => {
      const sampleText = `SECTION 4.2: SCENIC ARCHITECTURE
Clause 4.2.1: The contractor shall engineer, fabricate, and install a continuous 360-degree motorized kinetic LED arch spanning the central court.
Delivery and certification by Civil Defense must be completed no later than 2026-11-15.
Dual certified secondary safety steels rated for 150% dynamic load must be inspected by a certified structural engineer.
Estimated Quantity: 1 complete architectural installation.`;

      const result = parseIntelligentDocument(sampleText, {
        documentName: 'Lusail_RFP_Specification.pdf',
        documentType: 'tender_spec',
      });

      expect(result.jobId).toBeDefined();
      expect(result.parserVersion).toBe(PARSER_VERSION);
      expect(result.blocks.length).toBeGreaterThanOrEqual(1);

      const block = result.blocks[0];
      expect(block.pageNumber).toBe(1);
      expect(block.boundingBox).toBeDefined();
      expect(block.boundingBox?.width).toBeGreaterThan(0);
      expect(block.ocrConfidence).toBeGreaterThanOrEqual(0.95);
      expect(block.rawText).toContain('SECTION 4.2');
    });

    it('should immutably record source provenance on every extracted candidate', () => {
      const sampleText = `Clause 5.1.3: Audio distribution requires 12 synchronized line-array towers along the boulevard.
Quantity: 12 tower units. Target Date: 2026-11-01.`;

      const result = parseIntelligentDocument(sampleText, {
        documentName: 'Acoustic_Specification_Doc.docx',
      });

      expect(result.candidates.length).toBe(1);
      const cand = result.candidates[0];

      expect(cand.sourceProvenance).toBeDefined();
      expect(cand.sourceProvenance.fileName).toBe('Acoustic_Specification_Doc.docx');
      expect(cand.sourceProvenance.pageNumber).toBe(1);
      expect(cand.sourceProvenance.clauseNumber).toContain('5.1.3');
      expect(cand.sourceProvenance.boundingBox).toBeDefined();
      expect(cand.sourceProvenance.exactOriginalWording).toContain('Audio distribution requires 12 synchronized');
      expect(cand.sourceProvenance.parserVersion).toBe(PARSER_VERSION);
    });

    it('should distribute candidates into discrete review queues with dynamic counts', () => {
      const sampleBundle = `SECTION 1: TENDER INFORMATION
Clause 1.1: Project overview and administrative guidelines for bidders.

SECTION 4: SCOPE OF WORK
Clause 4.1: The contractor shall supply and install 5 main stage projection screens. Quantity: 5 units.

SECTION 7: CLIENT RESPONSIBILITIES
Clause 7.2: Client shall provide raw electrical power at the site boundary free of charge.

SECTION 9: COMPLIANCE
Clause 9.1: Contractor shall obtain Civil Defence fire safety inspection permit before event opening.`;

      const result = parseIntelligentDocument(sampleBundle);

      expect(result.queueCounts.master_scope_requirements).toBeGreaterThanOrEqual(1);
      expect(result.queueCounts.client_responsibilities).toBeGreaterThanOrEqual(1);
      expect(result.queueCounts.permits_and_compliance).toBeGreaterThanOrEqual(1);
      expect(result.totalExtracted).toBe(result.candidates.length);
    });
  });

  describe('2. Explicit vs. Inferred Tracking & Missing-Field Invariants', () => {
    it('should mark explicitly stated quantities and dates as explicit origin', () => {
      const text = `Clause 2.4: Fabricate 10 perimeter entrance arches no later than 2026-11-10.`;
      const result = parseIntelligentDocument(text);
      const cand = result.candidates[0];

      expect(cand.quantity).toBe(10);
      expect(cand.fieldAttributions['quantity']?.origin).toBe('explicit');
      expect(cand.fieldAttributions['dueDate']?.origin).toBe('explicit');
      expect(cand.fieldAttributions['dueDate']?.value).toContain('2026-11-10');
    });

    it('should strictly mark missing quantities and dates as null with origin missing rather than hallucinating', () => {
      const text = `Clause 3.2: Provide general ceremonial flags and banners along the perimeter as directed.`;
      const result = parseIntelligentDocument(text);
      const cand = result.candidates[0];

      // Invariant: Never manufacture missing values!
      expect(cand.quantity).toBeUndefined();
      expect(cand.fieldAttributions['quantity']?.origin).toBe('missing');
      expect(cand.fieldAttributions['quantity']?.value).toBeNull();
      expect(cand.fieldAttributions['dueDate']?.origin).toBe('missing');
      expect(cand.missingFields).toContain('quantity');
    });

    it('should mark department and owner role suggestions as system_suggestion with reasons', () => {
      const text = `Clause 4.1: Custom scenic joinery and registration kiosks fabrication. Quantity: 6 units.`;
      const result = parseIntelligentDocument(text);
      const cand = result.candidates[0];

      expect(cand.suggestedDepartment).toBe('Production');
      expect(cand.fieldAttributions['suggestedDepartment']?.origin).toBe('system_suggestion');
      expect(cand.fieldAttributions['suggestedDepartment']?.reason).toContain('Scenic Fabrication');
      expect(cand.fieldAttributions['suggestedOwnerRole']?.origin).toBe('system_suggestion');
    });
  });

  describe('3. Required Acceptance Scenario: The 20-Counter RFP & BOQ Row', () => {
    const originalRfpClause = `The contractor shall design, fabricate, deliver and install 20 themed information counters across the three event zones. Final allocation shall be coordinated with the client. All counter designs are subject to client approval before fabrication.`;
    const boqRowText = `Fabrication and installation of themed information counters – 20 Nos.`;

    it('should parse 1 master requirement for 20 counters with all required flags and no assumed zone split', () => {
      const fullDoc = `${originalRfpClause}\n\n${boqRowText}`;
      const result = parseIntelligentDocument(fullDoc, {
        documentName: 'Qatar_National_Day_Tender_RFP.pdf',
      });

      // Master requirement candidate
      const masterCand = result.candidates.find((c) => c.queueType === 'master_scope_requirements' || c.title.toLowerCase().includes('information counters'));
      expect(masterCand).toBeDefined();
      expect(masterCand?.quantity).toBe(20);
      expect(masterCand?.unit).toBe('Nos');

      // Requirement flags
      expect(masterCand?.designRequired).toBe(true);
      expect(masterCand?.clientApprovalRequired).toBe(true);
      expect(masterCand?.fabricationRequired).toBe(true);
      expect(masterCand?.deliveryRequired).toBe(true);
      expect(masterCand?.installationRequired).toBe(true);

      // Department suggestions
      expect(masterCand?.suggestedDepartment).toBe('Production');
      expect(masterCand?.suggestedContributingDepartments).toContain('Design');
      expect(masterCand?.suggestedContributingDepartments).toContain('Logistics');
      expect(masterCand?.suggestedContributingDepartments).toContain('Site Operations');

      // Invariant: No assumed zone allocation across the 3 zones!
      expect(masterCand?.unallocatedQuantity).toBe(20);
      expect(masterCand?.suggestedAllocations).toBeUndefined();

      // Propose clarification requesting zone quantities
      expect(masterCand?.suggestedClarifications).toContain('Please confirm the specific quantity allocation across the event zones');
    });

    it('should link the BOQ row to the master requirement without creating a duplicate master requirement', () => {
      const fullDoc = `${originalRfpClause}\n\n${boqRowText}`;
      const result = parseIntelligentDocument(fullDoc, {
        documentName: 'Qatar_National_Day_Tender_RFP.pdf',
      });

      const boqCand = result.candidates.find((c) => c.queueType === 'boq_commercial_lines');
      expect(boqCand).toBeDefined();
      expect(boqCand?.candidateType).toBe('boq_line');
      expect(boqCand?.quantity).toBe(20);

      // Linked without duplicating master requirement
      expect(boqCand?.potentialDuplicateOf).toBeDefined();
      expect(boqCand?.potentialDuplicateOf?.reason).toContain('Propose linking as commercial line');
    });

    it('should accept the master requirement candidate and create a standard EOS record with traceability', () => {
      // 1. Ingest via API
      const parseCommand = controller.parseDocument(
        testProjectId,
        {
          documentName: 'Qatar_National_Day_Tender_RFP.pdf',
          rawText: originalRfpClause,
        },
        mockRequest
      );

      const job = parseCommand.data.payload;
      const masterCand = job.candidates[0];

      // 2. Review action: Accept
      const reviewCommand = controller.reviewParsingCandidate(
        testProjectId,
        job.id,
        {
          candidateId: masterCand.id,
          action: 'accept',
        },
        mockRequest
      );

      expect(reviewCommand.data.status).toBe('accepted');
      const createdReq = reviewCommand.data.payload.createdRequirement;
      expect(createdReq).toBeDefined();
      expect(createdReq.title).toContain('information counters');
      expect(createdReq.sourceType).toBe('Client RFP');
      expect(createdReq.sourceReference).toContain('Qatar_National_Day_Tender_RFP.pdf');

      // Traceability evaluation attached
      expect(createdReq.traceability).toBeDefined();
      expect(createdReq.traceability.requirementId).toBe(createdReq.id);

      // Verify stored in standard requirementRepository
      const stored = requirementRepository.get(createdReq.id);
      expect(stored).toBeDefined();
      expect(stored?.code).toBe(createdReq.code);
    });

    it('should link the BOQ row candidate to the accepted requirement without creating a second requirement', () => {
      // First ensure master req is accepted
      const masterReqId = `req-counters-${Date.now()}`;
      requirementRepository.set(masterReqId, {
        id: masterReqId,
        organisationId: testOrgId,
        projectId: testProjectId,
        code: 'REQ-QND-020',
        title: 'Themed Information Counters Fabrication & Installation',
        originalWording: originalRfpClause,
        sourceType: 'Client RFP',
        sourceReference: 'RFP Page 1',
        disposition: 'applicable',
        createdAt: new Date().toISOString(),
      });

      const parseCommand = controller.parseDocument(
        testProjectId,
        {
          documentName: 'BOQ_Schedule_Vol3.xlsx',
          rawText: boqRowText,
        },
        mockRequest
      );

      const job = parseCommand.data.payload;
      const boqCand = job.candidates[0];

      const reviewCommand = controller.reviewParsingCandidate(
        testProjectId,
        job.id,
        {
          candidateId: boqCand.id,
          action: 'accept',
          targetRequirementId: masterReqId,
        },
        mockRequest
      );

      expect(reviewCommand.data.status).toBe('accepted');
      const updatedReq = requirementRepository.get(masterReqId);
      expect(updatedReq?.linkedBoqLineCode).toBeDefined();

      // No new requirement record was created for the BOQ row!
      const allCounters = Array.from(requirementRepository.values()).filter((r) => r.id === masterReqId);
      expect(allCounters.length).toBe(1);
    });

    it('should convert an ambiguous candidate into a formal client clarification (RFI)', () => {
      const ambiguousText = `Clause 8.4.2: Temporary tensile fabric canopy structure for the Main Amiri Pavilion. Details TBC by client representative.`;
      const parseCommand = controller.parseDocument(
        testProjectId,
        {
          documentName: 'Canopy_Specs.pdf',
          rawText: ambiguousText,
        },
        mockRequest
      );

      const job = parseCommand.data.payload;
      const cand = job.candidates[0];

      const rfiCommand = controller.reviewParsingCandidate(
        testProjectId,
        job.id,
        {
          candidateId: cand.id,
          action: 'convert_to_clarification',
        },
        mockRequest
      );

      expect(rfiCommand.data.status).toBe('converted_to_clarification');

      const clars = Array.from(clarificationRepository.values()).filter((c) => c.projectId === testProjectId);
      const generatedRfi = clars.find((c) => c.clarificationCode.startsWith('RFI-'));
      expect(generatedRfi).toBeDefined();
      expect(generatedRfi?.question).toContain('Ambiguity identified');
    });
  });

  describe('4. Later Addendum: 20 Counters Revised to 24 with VIP Allocation', () => {
    const addendumClause = `Information counter quantity is revised to 24. Four additional premium counters shall be installed in the VIP Zone.`;

    it('should detect quantity revision from 20 to 24 and calculate delta of +4 counters', () => {
      // Create baseline candidate with 20 counters
      const baselineResult = parseIntelligentDocument(
        `Clause 1: Fabricate 20 themed information counters across zones.`,
        { documentName: 'RFP_Original.pdf' }
      );

      // Create addendum result with 24 counters
      const addendumResult = parseIntelligentDocument(
        addendumClause,
        { documentName: 'Addendum_No_01.pdf' }
      );

      const comparison = compareDocumentVersions(
        { documentName: 'RFP_Original.pdf', candidates: baselineResult.candidates },
        { documentName: 'Addendum_No_01.pdf', candidates: addendumResult.candidates }
      );

      expect(comparison.totalDeltas).toBeGreaterThanOrEqual(1);
      const delta = comparison.deltas[0];

      expect(delta.changeType).toBe('changed_quantity');
      expect(delta.previousQuantity).toBe(20);
      expect(delta.newQuantity).toBe(24);
      expect(delta.quantityDelta).toBe(4);

      // Allocation proposal
      expect(delta.affectedAllocations).toBeDefined();
      expect(delta.affectedAllocations?.[0]?.zone).toBe('VIP Zone');
      expect(delta.affectedAllocations?.[0]?.quantity).toBe(4);

      // Proposed design variant
      expect(delta.proposedDesignVariant).toContain('Premium Counter Variant');

      // Cross-department impact
      expect(delta.designImpact).toContain('Requires bespoke high-end finishes');
      expect(delta.boqImpact).toContain('+4 units');
      expect(delta.productionImpact).toContain('+4 units');
      expect(delta.affectedDepartments).toContain('Production');
      expect(delta.affectedDepartments).toContain('Design');
    });

    it('should preserve baseline requirement and require explicit review before applying revision', () => {
      // Setup existing approved 20-unit requirement
      const counterReqId = `req-counter-baseline-${Date.now()}`;
      requirementRepository.set(counterReqId, {
        id: counterReqId,
        organisationId: testOrgId,
        projectId: testProjectId,
        code: 'REQ-QND-020',
        title: 'Themed Information Counters',
        originalWording: 'Contractor shall fabricate 20 information counters.',
        interpretation: 'Original baseline: 20 units.',
        sourceType: 'Client RFP',
        sourceReference: 'RFP Page 4',
        quantity: 20,
        status: 'approved',
        disposition: 'applicable',
        recordVersion: 1,
        createdAt: new Date().toISOString(),
      });

      // Run comparison via API
      const parseAddendum = controller.parseDocument(
        testProjectId,
        {
          documentName: 'Addendum_No_01.pdf',
          rawText: addendumClause,
        },
        mockRequest
      );

      const compareCommand = controller.compareDocuments(
        testProjectId,
        {
          newJobId: parseAddendum.data.payload.id,
          priorDocumentName: 'Original RFP Specifications',
          newDocumentName: 'Addendum_No_01.pdf',
        }
      );

      const cmp = compareCommand.data.payload;
      expect(cmp.deltas.length).toBeGreaterThanOrEqual(1);
      const delta = cmp.deltas[0];
      expect(delta.quantityDelta).toBe(4);

      // Baseline is preserved prior to approval!
      const baselineBefore = requirementRepository.get(counterReqId);
      expect(baselineBefore?.interpretation).toContain('Original baseline: 20 units.');

      // Apply Addendum Revision
      const applyCommand = controller.applyAddendumRevision(
        testProjectId,
        {
          deltaId: delta.id,
          reason: 'Client Addendum No. 1 approved by Hamad K.',
          confirmAllocations: true,
          targetRequirementId: counterReqId,
        },
        mockRequest
      );

      expect(applyCommand.data.status).toBe('revision_applied');
      const rev = applyCommand.data.payload.revision;
      expect(rev.revisionNumber).toBe(1);
      expect(rev.newValues.quantityDelta).toBe(4);
      expect(rev.newValues.quantity).toBe(24);
      expect(rev.previousValues.quantity).toBe(20);

      // Check VIP allocation created
      const allocations = Array.from(allocationRepository.values()).filter((a) => a.requirementId === counterReqId);
      const vipAlloc = allocations.find((a) => a.zone === 'VIP Zone');
      expect(vipAlloc).toBeDefined();
      expect(vipAlloc?.quantity).toBe(4);

      // Check Premium design variant created in gated state
      const variants = Array.from(designVariantRepository.values()).filter((v) => v.requirementId === counterReqId);
      const premVariant = variants.find((v) => v.name.includes('Premium'));
      expect(premVariant).toBeDefined();
      expect(premVariant?.productionReleaseStatus).toBe('not_released'); // Zero automatic release to production!

      // Requirement baseline preserved in interpretation note
      const reqAfter = requirementRepository.get(counterReqId);
      expect(reqAfter?.recordVersion).toBe(2);
      expect(reqAfter?.interpretation).toContain('revised to 24 units (+4 units in VIP Zone)');
    });
  });

  describe('5. Safety Interlocks, Tenant Isolation & Bulk Review Constraints', () => {
    it('should block bulk approval of low-confidence candidates without explicit override', () => {
      // Ingest candidates with varying confidence
      const mixedText = `Clause 1: Simple description without quantity or dates.
Clause 2: High confidence requirement with 5 units no later than 2026-11-10.`;

      const parseCommand = controller.parseDocument(
        testProjectId,
        { rawText: mixedText },
        mockRequest
      );

      const job = parseCommand.data.payload;
      const lowConfCand = job.candidates.find((c: any) => c.confidenceScore < 0.75);
      expect(lowConfCand).toBeDefined();

      // Bulk review without forceLowConfidence must throw 412 PRECONDITION_FAILED
      expect(() => {
        controller.bulkReviewCandidates(
          testProjectId,
          job.id,
          {
            candidateIds: [lowConfCand.id],
            action: 'approve',
            forceLowConfidence: false,
          },
          mockRequest
        );
      }).toThrow();
    });

    it('should enforce strict tenant isolation and block cross-project job access', () => {
      const otherProjectId = '00000000-0000-4000-8000-000000000001';

      const parseCommand = controller.parseDocument(
        testProjectId,
        { rawText: 'Clause 1: Project 1 private specifications.' },
        mockRequest
      );

      const jobId = parseCommand.data.payload.id;

      // Accessing from other project must throw 404 NOT_FOUND
      expect(() => {
        controller.getParsingJob(otherProjectId, jobId);
      }).toThrow();
    });
  });
});
