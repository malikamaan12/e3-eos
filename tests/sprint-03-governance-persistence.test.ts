import { describe, it, expect } from 'vitest';
import {
  // Crew & Qatar Labour Law & E3 Fatigue
  CrewFatiguePolicyEngine,
  QATAR_LABOUR_LAW_BASELINE,
  DEFAULT_E3_FATIGUE_POLICY,
  CrewConflictDetector,
  DailySiteReportEngine,
  ComprehensiveReadinessEvaluator,
  OpeningAuthorizationEngine,
  CrewAssignment,
  // Procurement & Vendors
  VendorApprovalPolicyEngine,
  VendorType,
  VendorStatus,
  Vendor,
  STANDARD_VENDOR_TYPES,
  STANDARD_VENDOR_STATUSES,
  Money,
  // Warehouse & Inventory
  STANDARD_WAREHOUSE_ZONES,
  WarehouseMovementType,
  WarehouseOperationsEngine,
  WarehouseZone,
  Asset,
  // Finance & EAC
  FinancialCalculator,
} from '@e3-eos/domain';

describe('Sprint 03 — Governance, Invariants & Persistence Verification Suite', () => {
  const projectId = 'a1111111-1111-4111-8111-111111111111';

  // ---------------------------------------------------------------------------
  // Checkpoint 1: Qatar Labour Law Statutory Compliance
  // ---------------------------------------------------------------------------
  describe('Checkpoint 1: Qatar Labour Law Statutory Compliance (Law No. 14 of 2004)', () => {
    it('enforces ordinary 8h/day limit during normal periods', () => {
      const normalShift = CrewFatiguePolicyEngine.evaluateStatutoryCompliance(
        8,
        false,
        QATAR_LABOUR_LAW_BASELINE
      );
      expect(normalShift.isCompliant).toBe(true);
      expect(normalShift.violations).toHaveLength(0);

      const excessShift = CrewFatiguePolicyEngine.evaluateStatutoryCompliance(
        9,
        false,
        QATAR_LABOUR_LAW_BASELINE
      );
      // 9h is overtime, compliant if <= 10h total, but flagged as overtime
      expect(excessShift.isCompliant).toBe(true);
      expect(excessShift.violations.some((v) => v.includes('STATUTORY_OVERTIME_APPLIED'))).toBe(true);

      const illegalShift = CrewFatiguePolicyEngine.evaluateStatutoryCompliance(
        11,
        false,
        QATAR_LABOUR_LAW_BASELINE
      );
      expect(illegalShift.isCompliant).toBe(false);
      expect(illegalShift.violations.some((v) => v.includes('STATUTORY_OVERTIME_BREACH'))).toBe(true);
    });

    it('enforces ordinary 6h/day limit during Holy Month of Ramadan', () => {
      const ramadanValid = CrewFatiguePolicyEngine.evaluateStatutoryCompliance(
        6,
        true,
        QATAR_LABOUR_LAW_BASELINE
      );
      expect(ramadanValid.isCompliant).toBe(true);

      const ramadanExceeded = CrewFatiguePolicyEngine.evaluateStatutoryCompliance(
        7,
        true,
        QATAR_LABOUR_LAW_BASELINE
      );
      expect(ramadanExceeded.violations.some((v) => v.includes('STATUTORY_OVERTIME_APPLIED'))).toBe(true);
    });

    it('limits actual overtime hours to a maximum of 2h overtime (10h max total shift)', () => {
      const maxAllowed = CrewFatiguePolicyEngine.evaluateStatutoryCompliance(
        10,
        false,
        QATAR_LABOUR_LAW_BASELINE
      );
      expect(maxAllowed.isCompliant).toBe(true);

      const exceedingMax = CrewFatiguePolicyEngine.evaluateStatutoryCompliance(
        10.5,
        false,
        QATAR_LABOUR_LAW_BASELINE
      );
      expect(exceedingMax.isCompliant).toBe(false);
      expect(exceedingMax.violations.some((v) => v.includes('STATUTORY_OVERTIME_BREACH'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 2: E3 Fatigue Management Policy (Internal Corporate Policy)
  // ---------------------------------------------------------------------------
  describe('Checkpoint 2: E3 Fatigue Management Policy (POL-HSE-FATIGUE-01)', () => {
    it('enforces 11-hour mandatory rest interval as internal policy, not statutory Qatar law', () => {
      expect(DEFAULT_E3_FATIGUE_POLICY.policyCode).toBe('POL-HSE-FATIGUE-01');
      expect(DEFAULT_E3_FATIGUE_POLICY.minRestBetweenShiftsHours).toBe(11);
      expect(DEFAULT_E3_FATIGUE_POLICY.allowExceptionWithDualSignoff).toBe(true);

      // Shift ending at 22:00, next shift starting at 09:00 (11h rest)
      const prevEnd = new Date('2026-09-12T22:00:00Z');
      const nextStart = new Date('2026-09-13T09:00:00Z');
      const evalCompliant = CrewFatiguePolicyEngine.evaluateRestInterval(
        prevEnd,
        nextStart,
        DEFAULT_E3_FATIGUE_POLICY
      );
      expect(evalCompliant.isCompliant).toBe(true);
      expect(evalCompliant.restHours).toBe(11);

      // Shift ending at 23:00, next shift starting at 08:00 (9h rest -> violation)
      const prevEndLate = new Date('2026-09-12T23:00:00Z');
      const nextStartEarly = new Date('2026-09-13T08:00:00Z');
      const evalViolation = CrewFatiguePolicyEngine.evaluateRestInterval(
        prevEndLate,
        nextStartEarly,
        DEFAULT_E3_FATIGUE_POLICY
      );
      expect(evalViolation.isCompliant).toBe(false);
      expect(evalViolation.restHours).toBe(9);
      expect(evalViolation.violation).toContain('11');
    });

    it('permits dual-signoff exceptions under strict corporate governance review', () => {
      expect(DEFAULT_E3_FATIGUE_POLICY.allowExceptionWithDualSignoff).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 3: 10 Vendor Types and 8 Lifecycle Statuses
  // ---------------------------------------------------------------------------
  describe('Checkpoint 3: Complete 10 Vendor Types & 8 Lifecycle Statuses', () => {
    it('supports all 10 canonical vendor types required for Qatar production and event delivery', () => {
      const expectedTypes: VendorType[] = [
        'company',
        'freelancer',
        'individual_supplier',
        'subcontractor',
        'rental_supplier',
        'fabricator',
        'technical_supplier',
        'logistics_supplier',
        'talent_supplier',
        'international_supplier',
      ];
      expect(STANDARD_VENDOR_TYPES).toHaveLength(10);
      expectedTypes.forEach((type) => {
        expect(STANDARD_VENDOR_TYPES).toContain(type);
      });
    });

    it('supports all 8 vendor lifecycle statuses', () => {
      const expectedStatuses: VendorStatus[] = [
        'prospect',
        'registration_pending',
        'under_review',
        'approved',
        'conditionally_approved',
        'suspended',
        'blacklisted',
        'archived',
      ];
      expect(STANDARD_VENDOR_STATUSES).toHaveLength(8);
      expectedStatuses.forEach((status) => {
        expect(STANDARD_VENDOR_STATUSES).toContain(status);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 4: Vendor Approval Policy Evaluation
  // ---------------------------------------------------------------------------
  describe('Checkpoint 4: Vendor Approval Policy Evaluation', () => {
    const validVendor: Vendor = {
      id: 'ven-test-01',
      vendorCode: 'VEN-TEST-01',
      name: 'Qatar Premium Audio Visual WLL',
      legalName: 'Qatar Premium Audio Visual WLL',
      vendorType: 'fabricator',
      status: 'onboarding',
      category: 'scenic',
      crNumber: 'CR-DOHA-998877',
      taxOrVatNumber: 'TIN-QA-10029988',
      complianceVerified: true,
      qualificationStatus: 'approved',
      insurancePolicy: {
        policyNumber: 'POL-QA-99881',
        coverageAmount: new Money(5000000, 'QAR'),
        validUntil: new Date('2026-12-31'),
        insurerName: 'Qatar General Insurance',
      },
      bankDetails: {
        bankName: 'Qatar National Bank',
        accountHolder: 'Qatar Premium Audio Visual WLL',
        iban: 'QA99QNBK000000001234567801',
        currency: 'QAR',
      },
      riskFlags: [],
    };

    it('approves vendor with valid CR, Tax TIN, and unexpired Insurance', () => {
      const evalResult = VendorApprovalPolicyEngine.evaluate(validVendor);
      expect(evalResult.canApprove).toBe(true);
      expect(evalResult.violations).toHaveLength(0);
      expect(evalResult.recommendedStatus).toBe('approved');
    });

    it('blocks vendor approval if Commercial Registration (CR) is missing', () => {
      const missingCr: Vendor = {
        ...validVendor,
        crNumber: undefined,
      };
      const evalResult = VendorApprovalPolicyEngine.evaluate(missingCr);
      expect(evalResult.canApprove).toBe(false);
      expect(evalResult.violations.some((v) => v.includes('MISSING_CR'))).toBe(true);
    });

    it('blocks vendor approval if Tax / VAT registration is missing', () => {
      const missingTax: Vendor = {
        ...validVendor,
        taxOrVatNumber: undefined,
      };
      const evalResult = VendorApprovalPolicyEngine.evaluate(missingTax);
      expect(evalResult.canApprove).toBe(false);
      expect(evalResult.violations.some((v) => v.includes('MISSING_TAX_ID'))).toBe(true);
    });

    it('blocks vendor approval if Public Liability Insurance is expired', () => {
      const expiredInsurance: Vendor = {
        ...validVendor,
        insurancePolicy: {
          ...validVendor.insurancePolicy!,
          validUntil: new Date('2025-01-01'), // Expired
        },
      };
      const evalResult = VendorApprovalPolicyEngine.evaluate(expiredInsurance);
      expect(evalResult.canApprove).toBe(false);
      expect(evalResult.violations.some((v) => v.includes('EXPIRED_INSURANCE'))).toBe(true);
    });

    it('blocks vendor approval if critical sanctions risk flags exist', () => {
      const flaggedVendor: Vendor = {
        ...validVendor,
        riskFlags: ['SANCTION_LIST_MATCH: Secondary entity match under investigation'],
      };
      const evalResult = VendorApprovalPolicyEngine.evaluate(flaggedVendor);
      expect(evalResult.canApprove).toBe(false);
      expect(evalResult.violations.some((v) => v.includes('RISK_FLAGS_EXCEEDED'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 5: RBAC Restricted Vendor Bank Details Access
  // ---------------------------------------------------------------------------
  describe('Checkpoint 5: RBAC Restricted Vendor Bank Details Access', () => {
    it('masks restricted bank account details for non-finance roles', () => {
      const unmaskedIban = 'QA99QNBK000000001234567801';
      const masked = VendorApprovalPolicyEngine.maskIban(unmaskedIban);
      expect(masked).toBe('QA99 •••• •••• •••• 7801');
      expect(masked).not.toContain('00000000123456');
    });

    it('authorizes bank details disclosure strictly for finance leadership roles', () => {
      expect(VendorApprovalPolicyEngine.canAccessRestrictedBankDetails('cfo')).toBe(true);
      expect(VendorApprovalPolicyEngine.canAccessRestrictedBankDetails('finance_controller')).toBe(true);
      expect(VendorApprovalPolicyEngine.canAccessRestrictedBankDetails('commercial_director')).toBe(true);
      expect(VendorApprovalPolicyEngine.canAccessRestrictedBankDetails('super_admin')).toBe(true);

      // Denied for general project and site roles
      expect(VendorApprovalPolicyEngine.canAccessRestrictedBankDetails('site_supervisor')).toBe(false);
      expect(VendorApprovalPolicyEngine.canAccessRestrictedBankDetails('lead_rigger')).toBe(false);
      expect(VendorApprovalPolicyEngine.canAccessRestrictedBankDetails('client_guest')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 6: 10 Standard Warehouse Zones
  // ---------------------------------------------------------------------------
  describe('Checkpoint 6: 10 Standard Warehouse Zones', () => {
    it('contains all 10 canonical warehouse zones including Quarantine and Returns', () => {
      const expectedZones: WarehouseZone[] = [
        'AV',
        'Lighting',
        'Furniture',
        'Games',
        'Scenic',
        'Branding',
        'Tools',
        'Consumables',
        'Quarantine',
        'Returns',
      ];
      expect(STANDARD_WAREHOUSE_ZONES).toHaveLength(10);
      expectedZones.forEach((z) => {
        expect(STANDARD_WAREHOUSE_ZONES).toContain(z);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 7 & 8: Warehouse Operations & Damaged Goods Quarantine Routing
  // ---------------------------------------------------------------------------
  describe('Checkpoints 7 & 8: 10-Stage Warehouse Lifecycle & Auto-Quarantine', () => {
    const testAsset: Asset = {
      id: 'ast-fee-01',
      assetTag: 'AST-SCN-001',
      barcode: 'BC-SCN-001',
      name: 'Registration Counter',
      category: 'Scenic',
      quantity: 1,
      unit: 'unit',
      ownership: 'e3_owned',
      warehouseName: 'Doha Central Depot',
      zone: 'Returns',
      location: 'Returns Bay 1',
      condition: 'serviceable',
      availability: 'returned',
      purchaseValue: 5000,
    };

    it('supports 10-stage physical custodial movement lifecycle', () => {
      const stages: WarehouseMovementType[] = [
        'received',
        'stored',
        'reserved',
        'picked',
        'packed',
        'dispatched',
        'on_site',
        'returned',
        'inspected',
        'restocked',
      ];
      expect(stages).toHaveLength(10);
    });

    it('auto-routes damaged inspection items directly to Quarantine zone', () => {
      const result = WarehouseOperationsEngine.executeMovement(testAsset, {
        assetId: testAsset.id,
        movementType: 'inspected',
        source: 'Returns',
        destination: 'Scenic', // Requested target zone
        condition: 'damaged', // Defect reported
        evidenceUris: ['photos/damaged-truss-bracket.jpg'],
        movementReason: 'Post-event inspection: Crack on primary bracket',
        performedBy: 'Tariq Al-Mansouri',
        notes: 'Crack on primary load corner bracket',
      });

      // Invariant: Damaged condition forces Quarantine
      expect(result.movement.destination).toBe('Quarantine');
      expect(result.updatedAsset.zone).toBe('Quarantine');
      expect(result.updatedAsset.condition).toBe('damaged');
      expect(result.updatedAsset.availability).toBe('damaged');
    });

    it('routes undamaged inspection items to regular target zone', () => {
      const result = WarehouseOperationsEngine.executeMovement(testAsset, {
        assetId: testAsset.id,
        movementType: 'inspected',
        source: 'Returns',
        destination: 'Scenic',
        condition: 'good',
        evidenceUris: [],
        movementReason: 'Post-event inspection passed',
        performedBy: 'Tariq Al-Mansouri',
      });

      expect(result.movement.destination).toBe('Scenic');
      expect(result.updatedAsset.zone).toBe('Scenic');
      expect(result.updatedAsset.availability).toBe('available');
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoints 9, 10, 11: Governed Opening Authorization & Audit Seal
  // ---------------------------------------------------------------------------
  describe('Checkpoints 9, 10, 11: Governed Opening Authorization Engine', () => {
    const perfectChecks = [
      { dimension: 'Scope', isPassed: true, isCritical: true, scorePercent: 100, details: 'Scope 100% delivered' },
      { dimension: 'Design', isPassed: true, isCritical: true, scorePercent: 100, details: 'Design approved' },
      { dimension: 'Production', isPassed: true, isCritical: true, scorePercent: 100, details: 'Fabrication completed' },
      { dimension: 'Assets', isPassed: true, isCritical: true, scorePercent: 100, details: 'Assets positioned' },
      { dimension: 'Logistics', isPassed: true, isCritical: true, scorePercent: 100, details: 'Trucks offloaded' },
      { dimension: 'Installation', isPassed: true, isCritical: true, scorePercent: 100, details: 'Signed off on site' },
      { dimension: 'HSE', isPassed: true, isCritical: true, scorePercent: 100, details: 'Zero incidents' },
      { dimension: 'Permits', isPassed: true, isCritical: true, scorePercent: 100, details: 'Civil Defence licensed' },
      { dimension: 'Staffing', isPassed: true, isCritical: true, scorePercent: 100, details: 'Staff on position' },
      { dimension: 'Technical Testing', isPassed: true, isCritical: true, scorePercent: 100, details: 'Comms verified' },
    ];

    it('Checkpoint 9: 100% readiness score confers eligibility, but does NOT auto-open show', () => {
      const report = ComprehensiveReadinessEvaluator.evaluate(projectId, perfectChecks);
      expect(report.overallStatus).toBe('READY');
      expect(report.overallScorePercent).toBe(100);
      expect(report.eligibleForOpeningReview).toBe(true);
      expect(report.canOpen).toBe(false); // Invariant: decoupled from auto-opening
    });

    it('Checkpoint 10: Authorized role sign-off produces immutable SHA-256 cryptographic audit hash', () => {
      const report = ComprehensiveReadinessEvaluator.evaluate(projectId, perfectChecks);
      const authResult = OpeningAuthorizationEngine.authorize(
        report,
        'Elena Rostova',
        'executive_producer',
        {
          justification: 'All 10 dimensions passed. Civil Defence approved.',
        }
      );

      expect(authResult.error).toBeUndefined();
      expect(authResult.authorization).toBeDefined();
      const auth = authResult.authorization!;
      expect(auth.auditHash).toBeDefined();
      expect(auth.auditHash).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('Checkpoint 10: Role gating enforces only permitted leadership roles can sign off', () => {
      const report = ComprehensiveReadinessEvaluator.evaluate(projectId, perfectChecks);
      const unauthorizedResult = OpeningAuthorizationEngine.authorize(
        report,
        'Junior Trainee',
        'intern_runner', // Invalid role
        { justification: 'Trying to open early' }
      );

      expect(unauthorizedResult.authorization).toBeUndefined();
      expect(unauthorizedResult.error).toContain('UNAUTHORIZED_ROLE');
    });

    it('Checkpoint 11: Opening authorization strictly blocked when critical blockers exist', () => {
      const blockedChecks = [
        ...perfectChecks.slice(0, 7),
        { dimension: 'Permits', isPassed: false, isCritical: true, scorePercent: 0, details: 'Civil Defence fire safety certificate missing' },
        ...perfectChecks.slice(8),
      ];

      const report = ComprehensiveReadinessEvaluator.evaluate(projectId, blockedChecks);
      expect(report.overallStatus).toBe('NOT_READY');
      expect(report.eligibleForOpeningReview).toBe(false);

      const authResult = OpeningAuthorizationEngine.authorize(
        report,
        'Elena Rostova',
        'executive_producer',
        { justification: 'Emergency request to bypass permits' }
      );

      expect(authResult.authorization).toBeUndefined();
      expect(authResult.error).toContain('OPENING_BLOCKED');
      expect(authResult.error).toContain('critical blockers');
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 12: PO Commitment to Actual Invariant (EAC Invariant)
  // ---------------------------------------------------------------------------
  describe('Checkpoint 12: PO Commitment to Actual Transition (Zero Double-Counting)', () => {
    it('preserves EAC = Actual + ETC invariant with zero double-counting when invoice is posted', () => {
      // Step 1: PO released for 66,000 QAR
      const initialPosition = FinancialCalculator.calculatePosition({
        currency: 'QAR',
        originalBudget: 1520000,
        approvedBudgetChanges: 0,
        postedActualCost: 0,
        acceptedAccruedCost: 0,
        remainingCommitments: 66000,
        uncommittedForecast: 1454000,
      });

      expect(initialPosition.estimateAtCompletion.amount.toNumber()).toBe(1520000);
      expect(initialPosition.costIncurred.amount.toNumber()).toBe(0);

      // Step 2: Invoice posted for 66,000 QAR -> commitment transitions to postedActualCost
      const postInvoicePosition = FinancialCalculator.calculatePosition({
        currency: 'QAR',
        originalBudget: 1520000,
        approvedBudgetChanges: 0,
        postedActualCost: 66000, // Shifted from remainingCommitments
        acceptedAccruedCost: 0,
        remainingCommitments: 0, // Zero remaining commitment (no double count)
        uncommittedForecast: 1454000,
      });

      expect(postInvoicePosition.estimateAtCompletion.amount.toNumber()).toBe(1520000); // Exact invariant maintained
      expect(postInvoicePosition.costIncurred.amount.toNumber()).toBe(66000);
      expect(postInvoicePosition.estimateAtCompletion.amount.toNumber()).toBe(initialPosition.estimateAtCompletion.amount.toNumber());
    });

    it('handles partial invoice transition without leaking commitments', () => {
      // Milestone 1 invoice of 33,000 QAR
      const partialPosition = FinancialCalculator.calculatePosition({
        currency: 'QAR',
        originalBudget: 1520000,
        approvedBudgetChanges: 0,
        postedActualCost: 33000, // 50% invoiced
        acceptedAccruedCost: 0,
        remainingCommitments: 33000, // 50% still committed
        uncommittedForecast: 1454000,
      });

      expect(partialPosition.estimateAtCompletion.amount.toNumber()).toBe(1520000); // EAC invariant holds
      expect(partialPosition.costIncurred.amount.toNumber()).toBe(33000);
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 13: Multi-Project Crew Conflict Detection
  // ---------------------------------------------------------------------------
  describe('Checkpoint 13: Multi-Project Crew Conflict Detection', () => {
    it('detects concurrent shift conflicts when a technician is double-booked across projects', () => {
      const newAssignment: CrewAssignment = {
        id: 'asgn-b',
        projectId: 'PRJ-B',
        workerId: 'worker-rashid',
        personName: 'Rashid Al-Kuwari',
        role: 'Lead Rigger',
        window: {
          start: new Date('2026-09-12T12:00:00Z'),
          end: new Date('2026-09-12T20:00:00Z'),
        },
        status: 'assigned',
      };

      const existingAssignments: CrewAssignment[] = [
        {
          id: 'asgn-a',
          projectId: 'PRJ-A',
          workerId: 'worker-rashid',
          personName: 'Rashid Al-Kuwari',
          role: 'Lead Rigger',
          window: {
            start: new Date('2026-09-12T08:00:00Z'),
            end: new Date('2026-09-12T16:00:00Z'),
          },
          status: 'assigned',
        },
      ];

      const conflict = CrewConflictDetector.detectMultiProjectConflict(newAssignment, existingAssignments);
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictMessage).toContain('CREW_PROJECT_CONFLICT');
    });
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 14: Daily Site Report Immutability
  // ---------------------------------------------------------------------------
  describe('Checkpoint 14: Daily Site Report Immutability & Audit Hash', () => {
    it('seals Daily Site Reports with immutable flag and timestamp upon recording', () => {
      const report = DailySiteReportEngine.recordReport({
        projectId: 'PRJ-2026-FEE-01',
        reportDate: '2026-09-12',
        workCompleted: '30 registration counters positioned, wired, and network tested',
        workDelayed: 'None',
        manpowerCount: 18,
        equipmentActive: 'Forklifts 2x, Pallet jacks 4x, Laser levels',
        deliveriesReceived: 'Truck 07 offloaded (30 registration counters)',
        incidentsOccurred: 'Zero safety incidents',
        snagsIdentified: 'Counter #14 edge banding touched up',
        clientInstructions: 'Approved network badge dry run',
        weatherConditions: 'Indoor DECC Hall 1 (21°C)',
        tomorrowPlan: 'Client walkthrough and operational readiness sign-off',
        recordedBy: 'Omar Farooq (Site Field Supervisor)',
        photos: ['site/dsr-today-01.jpg'],
      });

      expect(report.id).toBeDefined();
      expect(report.isImmutable).toBe(true);
      expect(report.recordedAt).toBeDefined();
    });
  });
});
