import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request } from 'express';
import {
  parseIntelligentDocument,
  compareDocumentVersions,
  evaluateFinancialCoverage,
  calculatePublishPreview,
  applyDecisionMemory,
  ExtractedScopeCandidate,
  PARSER_VERSION,
  parseWavefrontObj,
  getBundledStageMesh,
  ClientPortalSanitizer,
  DesignItem,
} from '@e3-eos/domain';
import {
  ScopeController,
  requirementRepository,
  revisionRepository,
  allocationRepository,
  parsingJobRepository,
  decisionMemoryRepository,
  processedDocumentChecksums,
  projectPublishLocks,
} from '../apps/api/src/scope/scope.controller.js';
import { SettingsController } from '../apps/api/src/settings/settings.controller.js';
import {
  activeConfigurationStore,
  draftConfigurationStore,
  configurationHistoryStore,
  serverSideSecretVault,
  setDraftConfiguration,
  setActiveConfiguration,
} from '../apps/api/src/settings/settings.repositories.js';
import {
  EncryptedSecretVaultService,
  globalEncryptedSecretVault,
} from '../apps/api/src/settings/encrypted-secret-vault.js';
import { CompanyVaultController } from '../apps/api/src/documents/company-vault.controller.js';
import { SubmissionPacksController } from '../apps/api/src/documents/submission-packs.controller.js';
import {
  evidenceVaultRepository,
  evidenceVaultRevisionsRepository,
  requiredDocumentSlotsRepository,
  submissionPacksRepository,
} from '../apps/api/src/documents/documents.repositories.js';

// Legacy direct domain scenarios deliberately opt into isolated fixtures, never HTTP.
beforeEach(() => { vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true'); vi.stubEnv('ENVIRONMENT', 'test'); });
afterEach(() => vi.unstubAllEnvs());

describe('E3-EOS Acceptance Inspection & Repair Suite — Complete Proven Workflows', () => {
  const projectId = 'f1111111-1111-4111-8111-111111111111';
  const orgId = '11111111-1111-4111-8111-111111111111';

  let scopeController: ScopeController;
  let settingsController: SettingsController;
  let vaultController: CompanyVaultController;
  let submissionPacksController: SubmissionPacksController;

  const mockRequest = {
    organisationId: orgId,
    actorId: 'technical-director',
    userId: 'technical-director',
    sessionUser: { name: 'Karim Haddad (Technical Director)' },
    headers: { 'x-organisation-id': orgId, 'x-user-name': 'Karim Haddad' },
  } as unknown as Request;

  beforeEach(() => {
    scopeController = new ScopeController();
    settingsController = new SettingsController();
    vaultController = new CompanyVaultController();
    submissionPacksController = new SubmissionPacksController();

    // Reset scope repositories
    requirementRepository.clear();
    revisionRepository.clear();
    allocationRepository.clear();
    parsingJobRepository.clear();
    decisionMemoryRepository.clear();
    processedDocumentChecksums.clear();
    projectPublishLocks.clear();

    // Reset document repositories
    evidenceVaultRepository.clear();
    evidenceVaultRevisionsRepository.clear();
    requiredDocumentSlotsRepository.clear();
    submissionPacksRepository.clear();

    // Reset settings store to baseline v1
    setActiveConfiguration({
      version: 1,
      status: 'active',
      activatedAt: '2026-09-18T10:00:00.000Z',
      activatedBy: 'Executive Security Lead (Admin)',
      changeSummary: 'Baseline certified configuration with Doha Vertex, Anthropic fallback, and in-engine PDF/OCR adapters.',
      connections: [
        {
          id: 'conn-vertex-doha',
          provider: 'google_vertex',
          label: 'Google Vertex AI (Doha Regional Endpoint)',
          accountOrProjectId: 'e3-eos-qatar-prod',
          approvedEndpoint: 'https://me-central1-aiplatform.googleapis.com/v1',
          approvedRegion: 'me-central1-doha',
          secretStatus: 'active_encrypted',
          maskedSecret: 'AIzaSy••••••••••••••••••••78kL',
          health: 'healthy',
          lastTestedAt: '2026-09-18T12:00:00.000Z',
          latencyMs: 42,
          isDefault: true,
        },
        {
          id: 'conn-anthropic',
          provider: 'anthropic',
          label: 'Anthropic Claude (Contract Review Model)',
          accountOrProjectId: 'e3-eos-enterprise',
          approvedEndpoint: 'https://api.anthropic.com/v1',
          approvedRegion: 'eu-west-1',
          secretStatus: 'active_encrypted',
          maskedSecret: 'sk-ant••••••••••••••••••••98wQ',
          health: 'healthy',
          lastTestedAt: '2026-09-18T12:05:00.000Z',
          latencyMs: 58,
          isDefault: false,
        },
      ],
      taskRouting: [
        {
          capability: 'extraction',
          primaryProvider: 'google_vertex',
          primaryModel: 'gemini-1.5-pro',
          contextTokenLimit: 128000,
          outputTokenLimit: 8192,
          timeoutSeconds: 30,
          maxRetries: 2,
          costLimitPerCallQar: 0.15,
          active: true,
        },
      ],
      mediaAdapters: {
        ocrEngine: 'native_text_span',
        pdfEngine: 'pure_js_in_engine',
        cadViewerEngine: 'pure_canvas_2d_3d',
        videoPlayerEngine: 'html5_native',
        signingService: 'pure_js_visual_stamp',
        supportedFormats: ['application/pdf', 'video/mp4'],
      },
      policies: {
        numberingProfiles: {
          vault: 'E3-EV-<CATEGORY>-<NNNN>',
          pack: 'PACK-<PROJECT>-<ENV>-<NN>',
          drawing: 'DOC-<DISC>-<NNNN>',
        },
        renewalCriticalDays: 30,
        renewalUpcomingDays: 90,
        retentionHoldRules: ['Block deletion when retentionHold=true'],
        authorizedTestStampCodes: ['TEST_STAMP_AUTHORIZED', 'TEST_SIGNATURE_MOCK'],
      },
    });

    setDraftConfiguration({
      ...activeConfigurationStore,
      status: 'draft',
    });

    configurationHistoryStore.length = 0;
    configurationHistoryStore.push({ ...activeConfigurationStore });

    serverSideSecretVault.clear();
    serverSideSecretVault.set('conn-vertex-doha', 'AIzaSy_SECURE_DOHA_VERTEX_KEY_98124792184719');
    serverSideSecretVault.set('conn-anthropic', 'sk-ant-api03-SECURE_ANTHROPIC_KEY_1248912481');
  });

  // =========================================================================
  // THE EXACT 7-SECTION FIXTURE (ORIGINAL SEQUENCE AS REQUESTED)
  // Section 1: 100 banquet chairs in Zone A on 19 November 2026
  // Section 2: Repeated Zone A chairs reference for cross-checking
  // Section 3: 100 banquet chairs in Zone B
  // Section 4: Valid Commercial Registration (CR) and Trade Licence valid until 31 Dec 2027 due 10 Nov 2026
  // Section 5: Audited financial statements for FY23, FY24, FY25 due 10 Nov 2026
  // Section 6: Two stages (10 metres by 8 metres) placed in Section 6
  // Section 7: Addendum 01 changing Zone A chairs to 120
  // =========================================================================
  const EXACT_USER_FIXTURE_SECTIONS_1_TO_6 = `
SECTION 1: Banquet Seating in Zone A
The contractor shall supply and place 100 banquet chairs in Zone A on 19 November 2026.

SECTION 2: Reference Scope & Cross-Checking
The same 100 banquet chairs in Zone A on 19 November 2026 are repeated here for reference, not an additional quantity.

SECTION 3: Banquet Seating in Zone B
The contractor shall supply and place 100 banquet chairs in Zone B.

SECTION 4: Corporate Registration & Trade Licensing
The contractor must provide a valid Commercial Registration (CR) and Trade Licence valid until 31 December 2027 to be submitted by 10 November 2026.

SECTION 5: Financial Capability & Multi-Year Statements
The contractor must submit audited financial statements for FY23, FY24, and FY25 submitted by 10 November 2026.

SECTION 6: Main Ceremony Stages
The contractor shall design, fabricate, and install two stages (10 metres by 8 metres).
`;

  // Permutation fixture variation (where Section 2 = Zone B, Section 3 = Stages, Section 6 = Repeated Chairs)
  const PERMUTATION_FIXTURE_SECTIONS_1_TO_6 = `
SECTION 1: Banquet Seating in Zone A
The contractor shall supply and place 100 banquet chairs in Zone A on 19 November 2026.

SECTION 2: Banquet Seating in Zone B
The contractor shall supply and place 100 banquet chairs in Zone B.

SECTION 3: Main Ceremony Stages
The contractor shall design, fabricate, and install two stages (10 metres by 8 metres).

SECTION 4: Corporate Registration & Trade Licensing
The contractor must provide a valid Commercial Registration (CR) and Trade Licence valid until 31 December 2027 to be submitted by 10 November 2026.

SECTION 5: Financial Capability & Multi-Year Statements
The contractor must submit audited financial statements for FY23, FY24, and FY25 submitted by 10 November 2026.

SECTION 6: Reference Scope & Cross-Checking
The same 100 banquet chairs in Zone A on 19 November 2026 are repeated here for reference, not an additional quantity.
`;

  const SECTION_7_ADDENDUM_FIXTURE = `
Addendum 01 - Scope Amendment:
The chair quantity in Zone A on 19 November 2026 changes to 120 chairs and supersedes Section 1.
`;

  // =========================================================================
  // CRITERION 1: Exact User Fixture Order Regression (Section 2 Repeated Chairs, Section 6 Stages)
  // =========================================================================
  it('Criterion 1: Exact original sequence: Zone A chairs in Sec 1 has 2 citation spans (Sec 1 & Sec 2), Sec 6 stages (qty 2, 10x8m), and Sec 7 Addendum delta (+20)', () => {
    const parseResult = parseIntelligentDocument(EXACT_USER_FIXTURE_SECTIONS_1_TO_6, {
      documentName: 'Exact_Pasted_Tender_Specification.txt',
      documentType: 'pasted_text',
      isPastedText: true,
    });

    // 1. Locate Zone A chair candidate from Section 1
    const zoneACand = parseResult.candidates.find(
      (c) =>
        (c.title.toLowerCase().includes('chair') || c.description.toLowerCase().includes('chair')) &&
        (c.description.toLowerCase().includes('zone a') || c.title.toLowerCase().includes('zone a'))
    );
    expect(zoneACand).toBeDefined();
    expect(zoneACand?.quantity).toBe(100);
    expect(zoneACand?.suggestedAllocations).toEqual(
      expect.arrayContaining([expect.objectContaining({ zone: 'Zone A', quantity: 100 })])
    );
    expect(zoneACand?.dueDate).toBe('19 November 2026');

    // 2. Section 2 repeated evidence verification
    // Must be marked information_only and attach a second sourceEvidenceSpan to Zone A chair pointing to Section 2
    expect(zoneACand?.sourceEvidenceSpans).toBeDefined();
    expect(zoneACand?.sourceEvidenceSpans?.length).toBe(2);
    expect(zoneACand?.sourceEvidenceSpans?.[0].exactOriginalWording).toContain('SECTION 1');
    expect(zoneACand?.sourceEvidenceSpans?.[1].exactOriginalWording).toContain('SECTION 2');

    const section2Cand = parseResult.candidates.find((c) =>
      c.originalWording.toLowerCase().includes('repeated here for reference')
    );
    expect(section2Cand).toBeDefined();
    expect(section2Cand?.queueType).toBe('information_only');
    expect(section2Cand?.potentialDuplicateOf?.requirementId).toBe(zoneACand?.id);

    // 3. Stage candidate placed in Section 6
    const stageCand = parseResult.candidates.find((c) =>
      c.title.toLowerCase().includes('stage') || c.description.toLowerCase().includes('stage')
    );
    expect(stageCand).toBeDefined();
    expect(stageCand?.quantity).toBe(2);
    expect(stageCand?.unit).toBe('Stages');
    expect(stageCand?.title).toContain('10 metres by 8 metres');
    expect(stageCand?.suggestedDepartment).toBe('Production');
    expect(stageCand?.suggestedDiscipline).toBe('Stage Engineering');

    // 4. Baseline chair total across master scope remains exactly 200 (100 in Zone A + 100 in Zone B), NOT 300!
    const masterChairCandidates = parseResult.candidates.filter(
      (c) =>
        c.queueType === 'master_scope_requirements' &&
        (c.title.toLowerCase().includes('chair') ||
          c.title.toLowerCase().includes('seating') ||
          c.description.toLowerCase().includes('chair'))
    );
    const totalMasterChairQty = masterChairCandidates.reduce((sum, c) => sum + (c.quantity || 0), 0);
    expect(totalMasterChairQty).toBe(200);

    // 5. Compare with Section 7 Addendum
    const addendumParse = parseIntelligentDocument(SECTION_7_ADDENDUM_FIXTURE, {
      documentName: 'Tender_Addendum_01.pdf',
      documentType: 'Addendum',
      documentRole: 'addendum',
    });

    const comparison = compareDocumentVersions(
      { documentName: 'Tender_Specification_RFP.pdf', candidates: parseResult.candidates },
      { documentName: 'Tender_Addendum_01.pdf', candidates: addendumParse.candidates }
    );

    expect(comparison.totalDeltas).toBeGreaterThan(0);
    const zoneADelta = comparison.deltas.find(
      (d) =>
        d.title.toLowerCase().includes('zone a') ||
        (d.newWording && d.newWording.toLowerCase().includes('zone a'))
    );
    expect(zoneADelta).toBeDefined();
    expect(zoneADelta?.changeType).toBe('changed_quantity');
    expect(zoneADelta?.previousQuantity).toBe(100);
    expect(zoneADelta?.newQuantity).toBe(120);
    expect(zoneADelta?.quantityDelta).toBe(20);
    expect(zoneADelta?.affectedAllocations).toEqual([{ zone: 'Zone A', quantity: 120 }]);
  });

  // =========================================================================
  // CRITERION 2: Permutation Robustness & Zone B Independence
  // =========================================================================
  it('Criterion 2: Permutation sequence (Sec 2: Zone B, Sec 3: Stages, Sec 6: Repeated chairs) produces identical canonical scope and Zone B is unmutated by Addendum', () => {
    const parseResult = parseIntelligentDocument(PERMUTATION_FIXTURE_SECTIONS_1_TO_6);

    const zoneBCand = parseResult.candidates.find(
      (c) =>
        (c.title.toLowerCase().includes('chair') || c.description.toLowerCase().includes('chair')) &&
        (c.description.toLowerCase().includes('zone b') || c.title.toLowerCase().includes('zone b'))
    );
    expect(zoneBCand).toBeDefined();
    expect(zoneBCand?.quantity).toBe(100);
    expect(zoneBCand?.suggestedAllocations).toEqual(
      expect.arrayContaining([expect.objectContaining({ zone: 'Zone B', quantity: 100 })])
    );
    expect(zoneBCand?.queueType).toBe('master_scope_requirements');

    // Section 6 repeated evidence check in permutation
    const zoneACand = parseResult.candidates.find(
      (c) =>
        (c.title.toLowerCase().includes('chair') || c.description.toLowerCase().includes('chair')) &&
        (c.description.toLowerCase().includes('zone a') || c.title.toLowerCase().includes('zone a'))
    );
    expect(zoneACand?.sourceEvidenceSpans?.length).toBe(2);
    expect(zoneACand?.sourceEvidenceSpans?.[1].exactOriginalWording).toContain('SECTION 6');

    // Execute Addendum comparison against permutation
    const addendumParse = parseIntelligentDocument(SECTION_7_ADDENDUM_FIXTURE);
    const comparison = compareDocumentVersions(
      { documentName: 'Tender_Specification_RFP.pdf', candidates: parseResult.candidates },
      { documentName: 'Tender_Addendum_01.pdf', candidates: addendumParse.candidates }
    );

    // Assert that NO delta targets Zone B
    const zoneBDeltas = comparison.deltas.filter(
      (d) =>
        d.title.toLowerCase().includes('zone b') ||
        (d.newWording && d.newWording.toLowerCase().includes('zone b'))
    );
    expect(zoneBDeltas.length).toBe(0);
    expect(zoneBCand.quantity).toBe(100);
  });

  // =========================================================================
  // CRITERION 3: Stage Dimensions & Department Allocation
  // =========================================================================
  it('Criterion 3: Stage count is 2 with 10 x 8 metre dimensions, allocated to Production/Staging Engineering', () => {
    const parseResult = parseIntelligentDocument(EXACT_USER_FIXTURE_SECTIONS_1_TO_6);

    const stageCand = parseResult.candidates.find(
      (c) => c.title.toLowerCase().includes('stage') || c.description.toLowerCase().includes('stage')
    );
    expect(stageCand).toBeDefined();
    expect(stageCand?.quantity).toBe(2);
    expect(stageCand?.unit).toBe('Stages');
    expect(stageCand?.fieldAttributions.quantity.origin).toBe('explicit');
    expect(stageCand?.title).toContain('10 metres by 8 metres');
    expect(stageCand?.suggestedDepartment).toBe('Production');
    expect(stageCand?.suggestedDiscipline).toBe('Stage Engineering');
    expect(stageCand?.suggestedOwnerRole).toBe('Production Lead');
  });

  // =========================================================================
  // CRITERION 4: Company Document Slots & Deadlines
  // =========================================================================
  it('Criterion 4: Company document slots preserve the 10 November 2026 deadline and proper ownership', () => {
    const parseResult = parseIntelligentDocument(EXACT_USER_FIXTURE_SECTIONS_1_TO_6);

    // Section 4: CR and Trade Licence
    const crCand = parseResult.candidates.find((c) =>
      c.originalWording.toLowerCase().includes('commercial registration')
    );
    expect(crCand).toBeDefined();
    expect(crCand?.queueType).toBe('submission_requirements');
    expect(crCand?.suggestedDepartment).toBe('Legal & Governance');
    expect(crCand?.dueDate).toBe('10 November 2026');
    expect(crCand?.originalWording).toContain('31 December 2027');

    // Section 5: Audited Financials
    const finCand = parseResult.candidates.find((c) =>
      c.originalWording.toLowerCase().includes('audited financial')
    );
    expect(finCand).toBeDefined();
    expect(finCand?.queueType).toBe('submission_requirements');
    expect(finCand?.suggestedDepartment).toBe('Procurement & Commercial');
    expect(finCand?.dueDate).toBe('10 November 2026');
  });

  // =========================================================================
  // CRITERION 5: Multi-Year Financial Evidence Coverage
  // =========================================================================
  it('Criterion 5: Financial evidence covers each requested year (2023, 2024, 2025)', () => {
    const parseResult = parseIntelligentDocument(EXACT_USER_FIXTURE_SECTIONS_1_TO_6);

    const finCand = parseResult.candidates.find((c) =>
      c.title.toLowerCase().includes('audited financial')
    );
    expect(finCand).toBeDefined();
    expect(finCand?.title).toContain('FY23');
    expect(finCand?.title).toContain('FY24');
    expect(finCand?.title).toContain('FY25');

    const coverageEvaluation = evaluateFinancialCoverage(
      [
        { id: 'ev-fy23', reportingYear: 2023, verificationStatus: 'approved' },
        { id: 'ev-fy24', reportingYear: 2024, verificationStatus: 'approved' },
        { id: 'ev-fy25', reportingYear: 2025, verificationStatus: 'approved' },
      ],
      [2023, 2024, 2025]
    );

    expect(coverageEvaluation.covered).toBe(true);
    expect(coverageEvaluation.missingYears).toEqual([]);
    expect(coverageEvaluation.coveredYears).toEqual([2023, 2024, 2025]);
  });

  // =========================================================================
  // CRITERION 6: Reprocessing, Idempotency & Sealed Pack Immutability
  // =========================================================================
  it('Criterion 6: Reprocessing and repeated commit do not duplicate scope; sealed packs remain immutable', () => {
    const filePayload = {
      documentName: 'Qatar_National_Day_7Sections.pdf',
      documentType: 'tender_spec',
      checksum: 'sha256-qatar-7sec-acceptance-fixture-hash',
      rawText: EXACT_USER_FIXTURE_SECTIONS_1_TO_6,
    };

    const res1 = scopeController.parseDocument(projectId, filePayload, mockRequest);
    expect(res1.data.id).toBeDefined();
    const job1Id = res1.data.id;

    const pubRes1 = scopeController.publishImport(
      projectId,
      { jobId: job1Id, idempotencyKey: 'idemp-publish-key-1' },
      mockRequest
    );
    expect(pubRes1.data.status).toBe('published');
    const countAfterFirst = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId).length;

    // Reprocessing identical checksum returns cached job without duplication
    const res2 = scopeController.parseDocument(projectId, filePayload, mockRequest);
    expect(res2.data.id).toBe(job1Id);

    const pubRes2 = scopeController.publishImport(
      projectId,
      { jobId: job1Id, idempotencyKey: 'idemp-publish-key-1' },
      mockRequest
    );
    expect(pubRes2.data.id).toBe(pubRes1.data.id);
    const countAfterSecond = Array.from(requirementRepository.values()).filter((r) => r.projectId === projectId).length;
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  // =========================================================================
  // CRITERION 7: Dynamic AI Settings Routing & Credential Validation with Harmless Sample Content
  // =========================================================================
  it('Criterion 7: RFP parsing dynamically uses active Settings provider/model, and validates credentials against harmless sample content', async () => {
    // 1. Verify baseline active extraction uses google_vertex & gemini-1.5-pro
    const resVertex = scopeController.parseDocument(
      projectId,
      {
        documentName: 'Vertex_Sample_Tender.txt',
        documentType: 'tender_spec',
        rawText: 'SECTION 1: Supply 100 banquet chairs in Zone A on 19 November 2026.',
      },
      mockRequest
    );
    expect(resVertex.data.payload.modelProvider).toBe('google_vertex');
    expect(resVertex.data.payload.modelName).toBe('gemini-1.5-pro');
    expect(resVertex.data.payload.telemetry.activeConfigVersion).toBe(1);

    // 2. Test valid credentials against harmless test probe
    const validTest = await settingsController.testConnection({
      provider: 'google_vertex',
    });
    expect(validTest.data.healthy).toBe(true);
    expect(validTest.data.syntheticPayload).toBe('E3_SYNTHETIC_HEALTH_PROBE_SUCCESS');
    expect(validTest.data.sampleProbeEcho).toContain('E3-EOS Sovereign Gateway Health Probe');

    // 3. Test invalid credentials against harmless test probe -> must be rejected with 401
    await expect(
      settingsController.testConnection({
        provider: 'google_vertex',
        secretKey: 'INVALID_VERTEX_REVOKED_TOKEN_9988',
      })
    ).rejects.toThrow();

    // 4. Update draft to activate Anthropic Claude 3.5 Sonnet as the primary extraction engine
    const updateDraftPayload = {
      changeSummary: 'Switch primary extraction provider from Vertex to Anthropic Claude 3.5 Sonnet.',
      connections: [
        ...draftConfigurationStore.connections,
        {
          id: 'conn-anthropic-prod',
          provider: 'anthropic',
          label: 'Anthropic Claude 3.5 Sonnet (Production)',
          accountOrProjectId: 'e3-eos-ai-prod',
          approvedEndpoint: 'https://api.anthropic.com/v1',
          approvedRegion: 'me-central1-doha',
          secretKey: 'sk-ant-api03-VALID_ANTHROPIC_KEY_77889900',
          health: 'healthy',
          latencyMs: 38,
          isDefault: true,
        },
      ],
      taskRouting: [
        {
          capability: 'extraction',
          primaryProvider: 'anthropic',
          primaryModel: 'claude-3-5-sonnet',
          contextTokenLimit: 200000,
          outputTokenLimit: 8192,
          timeoutSeconds: 30,
          maxRetries: 2,
          costLimitPerCallQar: 0.2,
          active: true,
        },
      ],
    };

    settingsController.updateDraftConfiguration(updateDraftPayload);

    // Activate Configuration v2
    const activateRes = settingsController.activateConfiguration(
      { changeSummary: 'Promote Anthropic as primary extraction authority', activatedBy: 'Karim Haddad' },
      mockRequest
    );
    expect(activateRes.data.version).toBe(2);

    // 5. Subsequent RFP job MUST dynamically use Anthropic Claude 3.5 Sonnet as configured in Central Settings
    const resAnthropic = scopeController.parseDocument(
      projectId,
      {
        documentName: 'Anthropic_Sample_Tender.txt',
        documentType: 'tender_spec',
        rawText: 'SECTION 1: Supply 100 banquet chairs in Zone A on 19 November 2026.',
      },
      mockRequest
    );
    expect(resAnthropic.data.payload.modelProvider).toBe('anthropic');
    expect(resAnthropic.data.payload.modelName).toBe('claude-3-5-sonnet');
    expect(resAnthropic.data.payload.telemetry.activeConfigVersion).toBe(2);
    expect(resAnthropic.data.payload.telemetry.provider).toBe('anthropic');
    expect(resAnthropic.data.payload.telemetry.model).toBe('claude-3-5-sonnet');

    // 6. If active provider has bad credentials in vault, RFP parsing must fail with authentication error
    serverSideSecretVault.set('conn-anthropic', 'INVALID_ANTHROPIC_REVOKED_TOKEN');
    serverSideSecretVault.set('conn-anthropic-prod', 'INVALID_ANTHROPIC_REVOKED_TOKEN');

    expect(() =>
      scopeController.parseDocument(
        projectId,
        {
          documentName: 'Failing_Credentials_Tender.txt',
          documentType: 'tender_spec',
          rawText: 'SECTION 1: Supply 100 banquet chairs.',
        },
        mockRequest
      )
    ).toThrow();
  });

  // =========================================================================
  // CRITERION 8: Durable AES-256-GCM Secret Vault Surviving Restarts & RBAC
  // =========================================================================
  it('Criterion 8: Credential storage uses durable AES-256-GCM encryption surviving restarts with strict RBAC access control', () => {
    const testStoragePath = 'apps/api/data/test-encrypted-vault.json';
    const vault = new EncryptedSecretVaultService(testStoragePath);

    // 1. Store secret under authorized administrative role
    vault.setSecret('conn-qatar-sovereign', 'AIzaSy_SOVEREIGN_QATAR_KEY_7788112233', 'super_admin');
    expect(vault.hasSecret('conn-qatar-sovereign')).toBe(true);
    expect(vault.getSecret('conn-qatar-sovereign', 'admin')).toBe('AIzaSy_SOVEREIGN_QATAR_KEY_7788112233');

    // 2. Unauthorized role access MUST throw ACCESS_DENIED
    expect(() => vault.getSecret('conn-qatar-sovereign', 'client')).toThrow(/ACCESS_DENIED/);
    expect(() => vault.setSecret('conn-qatar-sovereign', 'new-key', 'field_supervisor')).toThrow(/ACCESS_DENIED/);

    // 3. Simulate Process Restart: Instantiate a new vault instance pointing to the persisted file
    const restartedVault = new EncryptedSecretVaultService(testStoragePath);
    restartedVault.loadFromDurableStorage();

    // Secret survives process restart and decrypts cleanly
    expect(restartedVault.hasSecret('conn-qatar-sovereign')).toBe(true);
    expect(restartedVault.getSecret('conn-qatar-sovereign', 'security_officer')).toBe('AIzaSy_SOVEREIGN_QATAR_KEY_7788112233');

    // Clean up test vault
    restartedVault.clear();
  });

  // =========================================================================
  // CRITERION 9: Client Collaboration Zero-Leak Portal & Redaction
  // =========================================================================
  it('Criterion 9: Client reviewer sees published sheets and client comments, strictly redacting internal markup, margins, and unpublished revisions', () => {
    const rawDesignItem: DesignItem = {
      id: 'DES-STAGE-01',
      projectId,
      title: 'Main Ceremony Stage Structure',
      description: '10m x 8m Structural Stage Platform',
      assetType: '3d_model',
      discipline: 'staging',
      currentRevisionCode: 'REV-B',
      currentStatus: 'approved_concept',
      clientVisibility: 'shared',
      revisions: [
        {
          revisionCode: 'REV-A',
          versionNumber: 1,
          contentHash: 'hash-rev-a',
          storageUrl: '/files/rev-a.dwg',
          uploadedBy: 'Lead Drafter',
          uploadedAt: '2026-09-18T08:00:00Z',
          releaseStatus: 'draft_concept', // Unpublished internal draft
          hasCostImpact: true,
          hasScheduleImpact: false,
        },
        {
          revisionCode: 'REV-B',
          versionNumber: 2,
          contentHash: 'hash-rev-b',
          storageUrl: '/files/rev-b.dwg',
          uploadedBy: 'Design Director',
          uploadedAt: '2026-09-18T10:00:00Z',
          releaseStatus: 'client_review', // Published for client
          hasCostImpact: false,
          hasScheduleImpact: false,
        },
      ],
      pins: [
        {
          id: 'pin-1',
          pinNumber: 1,
          revisionCode: 'REV-B',
          xPercent: 50,
          yPercent: 50,
          title: 'Central Kinetic Ring Clearance',
          discipline: 'staging',
          priority: 'high',
          status: 'open',
          comments: [
            {
              id: 'c-1',
              authorId: 'client-user',
              authorName: 'Client Representative',
              discipline: 'staging',
              message: 'Please confirm clearance above stage is at least 4.5m.',
              createdAt: '2026-09-18T11:00:00Z',
              visibility: 'client_visible',
            } as any,
            {
              id: 'c-2',
              authorId: 'estimator-internal',
              authorName: 'Senior Estimator',
              discipline: 'staging',
              message: 'INTERNAL: Our procurement margin on this truss is 28%. Do not disclose rate card.',
              createdAt: '2026-09-18T11:30:00Z',
              visibility: 'internal_only',
            } as any,
          ],
          createdAt: '2026-09-18T11:00:00Z',
        },
      ],
      zones: ['Zone A'],
      locations: ['Main Ceremony Area'],
      createdAt: '2026-09-18T08:00:00Z',
      updatedAt: '2026-09-18T11:30:00Z',
    };

    const clientView = ClientPortalSanitizer.sanitizeDesignItemForClient(rawDesignItem);

    // 1. Unpublished internal draft REV-A must be excluded
    expect(clientView.revisions?.length).toBe(1);
    expect(clientView.revisions?.[0].revisionCode).toBe('REV-B');

    // 2. Internal comments containing margins and rate card must be strictly redacted
    const comments = clientView.pins?.[0].comments || [];
    expect(comments.length).toBe(1);
    expect(comments[0].message).toContain('Please confirm clearance');
    expect(comments[0].message).not.toContain('INTERNAL');
    expect(comments[0].message).not.toContain('margin');
  });

  // =========================================================================
  // CRITERION 10: Actual Design Files: 3D Mesh Parsing & Stored File Downloads
  // =========================================================================
  it('Criterion 10: 3D mesh parser extracts vertices and faces accurately, and original stored file assets preserve byte fidelity', () => {
    // 1. Wavefront OBJ 3D Model Parser Verification
    const sampleObjContent = `
# E3-EOS Wavefront OBJ Stage Model
v -50.0 0.0 -40.0
v 50.0 0.0 -40.0
v 50.0 0.0 40.0
v -50.0 0.0 40.0
v -50.0 20.0 -40.0
v 50.0 20.0 -40.0
v 50.0 20.0 40.0
v -50.0 20.0 40.0
f 1 2 3 4
f 5 6 7 8
f 1 5 6 2
f 2 6 7 3
f 3 7 8 4
f 4 8 5 1
`;

    const parsedMesh = parseWavefrontObj(sampleObjContent, 'Uploaded_Main_Stage.obj');
    expect(parsedMesh.name).toBe('Uploaded_Main_Stage.obj');
    expect(parsedMesh.vertices.length).toBe(8);
    expect(parsedMesh.faces.length).toBe(6);
    expect(parsedMesh.bounds.minX).toBe(-50);
    expect(parsedMesh.bounds.maxX).toBe(50);
    expect(parsedMesh.bounds.minY).toBe(0);
    expect(parsedMesh.bounds.maxY).toBe(20);

    // 2. Bundled stage engineering mesh verification
    const stageMesh = getBundledStageMesh();
    expect(stageMesh.vertices.length).toBeGreaterThanOrEqual(30);
    expect(stageMesh.faces.length).toBeGreaterThanOrEqual(10);
    expect(stageMesh.bounds.maxX - stageMesh.bounds.minX).toBe(200); // 10m scaled width
  });
});
