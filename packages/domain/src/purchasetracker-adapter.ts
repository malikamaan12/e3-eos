export interface VendorOnboardingRequest {
  connectionId?: string;
  vendorClassification: 'company' | 'individual';
  legalName: string;
  tradeName?: string;
  country?: string;
  registrationNumber?: string;
  taxNumber?: string;
  contacts: Array<{
    name: string;
    email: string;
    phone?: string;
    role?: string;
  }>;
  serviceCategories: string[];
  documentReferences?: string[];
}

export interface VendorProjection {
  vendorRef: string;
  legalName: string;
  tradeName?: string;
  country: string;
  status: 'draft' | 'under_review' | 'approved' | 'blocked' | 'rejected';
  complianceStatus: 'compliant' | 'provisional_pr_only' | 'expired_documents' | 'suspended';
  bankingStatus: 'unverified' | 'verified_masked' | 'action_required';
  sourceCheckTime: string;
  connectionStatus?: 'connected' | 'disconnected_snapshot' | 'not_connected';
}

export interface PurchaseRequestCreate {
  projectId: string;
  demandRef: string;
  sourcingAllocationRef: string;
  purchaseType: 'rental' | 'purchase' | 'service' | 'subcontract';
  vendorRef?: string;
  itemDescription: string;
  quantity: number;
  unit?: string;
  estimatedCost: number;
  currency?: string;
  requiredByDate?: string;
  deliveryLocation?: string;
  quoteRevisionRef?: string;
  attachments?: string[];
}

export interface PurchaseRequestSubmit {
  prId: string;
  approvedByRole: string;
  justification?: string;
}

export interface StoredVendorRecord {
  vendorId: string;
  legalName: string;
  tradeName?: string;
  country: string;
  registrationNumber?: string;
  taxNumber?: string;
  complianceStatus: 'compliant' | 'provisional_pr_only' | 'expired_documents' | 'suspended';
  status: 'draft' | 'under_review' | 'approved' | 'blocked' | 'rejected';
  bankingStatus: 'unverified' | 'verified_masked' | 'action_required';
  isRentalsPartner: boolean;
}

export interface StoredPurchaseRequest {
  prId: string;
  projectId: string;
  demandRef: string;
  sourcingAllocationRef: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  currency: string;
  status: 'draft' | 'submitted_for_approval' | 'approved' | 'rejected';
  vendorRef?: string;
  approvedByRole?: string;
  isLocalEosDraft?: boolean;
  createdAt: string;
}

/**
 * Deterministic Contract Test Simulator for E3 PurchaseTracker.
 * Segregated from production adapter bindings.
 * Used exclusively for contract verification and isolated sandbox testing.
 */
export class PurchaseTrackerContractSimulator {
  private static vendors = new Map<string, StoredVendorRecord>([
    [
      'vnd-pt-001',
      {
        vendorId: 'vnd-pt-001',
        legalName: 'Gulf Rigging & Staging Solutions WLL',
        tradeName: 'Gulf Staging',
        country: 'QA',
        registrationNumber: 'CR-DOH-88219',
        taxNumber: 'TIN-QA-99120',
        complianceStatus: 'compliant',
        status: 'approved',
        bankingStatus: 'verified_masked',
        isRentalsPartner: true,
      },
    ],
    [
      'vnd-pt-002',
      {
        vendorId: 'vnd-pt-002',
        legalName: 'Qatar Custom Fabrication & Woodworks',
        tradeName: 'Q-Fab',
        country: 'QA',
        registrationNumber: 'CR-DOH-44102',
        taxNumber: 'TIN-QA-33180',
        complianceStatus: 'compliant',
        status: 'approved',
        bankingStatus: 'verified_masked',
        isRentalsPartner: false,
      },
    ],
    [
      'vnd-pt-003',
      {
        vendorId: 'vnd-pt-003',
        legalName: 'Al-Rayyan Event Hire & AV',
        tradeName: 'Rayyan AV',
        country: 'QA',
        registrationNumber: 'CR-DOH-11094',
        taxNumber: 'TIN-QA-11993',
        complianceStatus: 'suspended',
        status: 'blocked',
        bankingStatus: 'action_required',
        isRentalsPartner: true, // Rentals partner but PurchaseTracker blocked!
      },
    ],
  ]);

  private static purchaseRequests = new Map<string, StoredPurchaseRequest>();

  static searchVendors(
    query?: string,
    filterCompliantOnly: boolean = false
  ): VendorProjection[] {
    const now = new Date().toISOString();
    const results: VendorProjection[] = [];

    for (const v of this.vendors.values()) {
      if (filterCompliantOnly && (v.status !== 'approved' || v.complianceStatus !== 'compliant')) {
        continue;
      }
      if (query && !v.legalName.toLowerCase().includes(query.toLowerCase()) && !v.tradeName?.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }
      results.push({
        vendorRef: v.vendorId,
        legalName: v.legalName,
        tradeName: v.tradeName,
        country: v.country,
        status: v.status,
        complianceStatus: v.complianceStatus,
        bankingStatus: v.bankingStatus,
        sourceCheckTime: now,
        connectionStatus: 'connected',
      });
    }

    return results;
  }

  static submitVendorOnboarding(
    request: VendorOnboardingRequest
  ): { status: 'created' | 'duplicate_warning'; vendorId: string; message: string } {
    for (const existing of this.vendors.values()) {
      if (request.registrationNumber && existing.registrationNumber === request.registrationNumber) {
        return {
          status: 'duplicate_warning',
          vendorId: existing.vendorId,
          message: `DUPLICATE_REGISTRATION: Vendor already registered under ID ${existing.vendorId} with matching registration ${request.registrationNumber}.`,
        };
      }
      if (existing.legalName.toLowerCase() === request.legalName.toLowerCase()) {
        return {
          status: 'duplicate_warning',
          vendorId: existing.vendorId,
          message: `SIMILAR_NAME_MATCH: Vendor with exact legal name exists (${existing.vendorId}). Manual review required before creating separate entity.`,
        };
      }
    }

    const newVendorId = `vnd-pt-${Date.now().toString().slice(-4)}`;
    this.vendors.set(newVendorId, {
      vendorId: newVendorId,
      legalName: request.legalName,
      tradeName: request.tradeName,
      country: request.country || 'QA',
      registrationNumber: request.registrationNumber,
      taxNumber: request.taxNumber,
      complianceStatus: 'provisional_pr_only',
      status: 'under_review',
      bankingStatus: 'unverified',
      isRentalsPartner: false,
    });

    return {
      status: 'created',
      vendorId: newVendorId,
      message: 'Vendor onboarding draft submitted to PurchaseTracker. Initial status: under_review.',
    };
  }

  static createPurchaseRequest(
    request: PurchaseRequestCreate
  ): { status: 'success' | 'blocked'; pr: StoredPurchaseRequest; message: string } {
    if (request.vendorRef) {
      const vendor = this.vendors.get(request.vendorRef);
      if (!vendor || vendor.status === 'blocked' || vendor.complianceStatus === 'suspended') {
        return {
          status: 'blocked',
          pr: null as any,
          message: `VENDOR_COMPLIANCE_BLOCKED: Vendor ${request.vendorRef} is frozen or suspended in PurchaseTracker. Cannot initiate PR.`,
        };
      }
    }

    const prId = `PR-PT-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    const pr: StoredPurchaseRequest = {
      prId,
      projectId: request.projectId,
      demandRef: request.demandRef,
      sourcingAllocationRef: request.sourcingAllocationRef,
      itemDescription: request.itemDescription,
      quantity: request.quantity,
      unit: request.unit || 'each',
      estimatedCost: request.estimatedCost,
      currency: request.currency || 'QAR',
      status: 'draft',
      vendorRef: request.vendorRef,
      createdAt: now,
    };

    this.purchaseRequests.set(prId, pr);

    return {
      status: 'success',
      pr,
      message: `Purchase request ${prId} created in draft state in PurchaseTracker.`,
    };
  }

  static submitPurchaseRequest(
    dto: PurchaseRequestSubmit
  ): { status: 'approved' | 'not_found'; pr?: StoredPurchaseRequest; message: string } {
    const pr = this.purchaseRequests.get(dto.prId);
    if (!pr) {
      return { status: 'not_found', message: `PR ${dto.prId} not found.` };
    }

    pr.status = 'approved';
    pr.approvedByRole = dto.approvedByRole;

    return {
      status: 'approved',
      pr,
      message: `PR ${dto.prId} approved under authority of ${dto.approvedByRole}. Ready for quotation/award.`,
    };
  }

  static getPurchaseRequestsForProject(projectId: string): StoredPurchaseRequest[] {
    return Array.from(this.purchaseRequests.values()).filter((p) => p.projectId === projectId);
  }

  static resetForTesting(): void {
    this.purchaseRequests.clear();
  }
}

/**
 * Production EOS Adapter for E3 PurchaseTracker.
 * Enforces authoritative source-system boundaries, explicit disconnected states,
 * and delegates to PurchaseTrackerContractSimulator only when connection mode is explicitly 'sandbox'.
 */
export class PurchaseTrackerAdapterEngine {
  /**
   * Searches vendors via PurchaseTracker.
   * In disconnected mode, returns honest disconnected status or authorized snapshot if available.
   */
  static searchVendors(
    query?: string,
    filterCompliantOnly: boolean = false,
    connectionMode: 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' = 'disabled'
  ): VendorProjection[] {
    if (connectionMode === 'disabled') {
      // In disconnected mode, no live records are fetched.
      // Return empty projection with zero fake data, or snapshot when caller requests
      return [];
    }

    if (connectionMode === 'sandbox') {
      return PurchaseTrackerContractSimulator.searchVendors(query, filterCompliantOnly);
    }

    // Production live mode deferred in this phase
    return [];
  }

  /**
   * Submits a vendor onboarding request.
   * In disconnected mode, external vendor onboarding submission is blocked.
   */
  static submitVendorOnboarding(
    request: VendorOnboardingRequest,
    connectionMode: 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' = 'disabled'
  ): { status: 'created' | 'duplicate_warning' | 'blocked'; vendorId: string; message: string } {
    if (connectionMode === 'disabled') {
      return {
        status: 'blocked',
        vendorId: '',
        message: 'CONNECTOR_DISABLED: E3 PurchaseTracker connector is disabled in Central Settings. Live vendor onboarding submission is prohibited during the disconnected phase.',
      };
    }

    if (connectionMode === 'production_read_only') {
      return {
        status: 'blocked',
        vendorId: '',
        message: 'READ_ONLY_MODE: E3 PurchaseTracker connector is in read-only mode. Vendor onboarding mutations are blocked.',
      };
    }

    if (connectionMode === 'sandbox') {
      return PurchaseTrackerContractSimulator.submitVendorOnboarding(request);
    }

    return {
      status: 'blocked',
      vendorId: '',
      message: 'PRODUCTION_CONNECTION_DEFERRED: Live E3 PurchaseTracker machine integration is deferred until EOS core validation is complete.',
    };
  }

  /**
   * Creates a purchase request draft.
   * Conforms to Section 4: Local EOS demand / PR preparation draft saving is allowed,
   * but no external source reference or approval is fabricated.
   */
  static createPurchaseRequest(
    request: PurchaseRequestCreate,
    connectionMode: 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' = 'disabled'
  ): { status: 'success' | 'blocked'; pr: StoredPurchaseRequest; message: string } {
    if (connectionMode === 'disabled') {
      // Local EOS draft saving is allowed without external submission
      const prId = `PR-DRAFT-EOS-${Date.now().toString().slice(-5)}`;
      const now = new Date().toISOString();
      const pr: StoredPurchaseRequest = {
        prId,
        projectId: request.projectId,
        demandRef: request.demandRef,
        sourcingAllocationRef: request.sourcingAllocationRef,
        itemDescription: request.itemDescription,
        quantity: request.quantity,
        unit: request.unit || 'each',
        estimatedCost: request.estimatedCost,
        currency: request.currency || 'QAR',
        status: 'draft',
        vendorRef: request.vendorRef,
        isLocalEosDraft: true,
        createdAt: now,
      };
      return {
        status: 'success',
        pr,
        message: `Local EOS purchase request draft ${prId} created. External submission to PurchaseTracker is disabled during the disconnected phase.`,
      };
    }

    if (connectionMode === 'sandbox') {
      return PurchaseTrackerContractSimulator.createPurchaseRequest(request);
    }

    return {
      status: 'blocked',
      pr: null as any,
      message: 'PRODUCTION_CONNECTION_DEFERRED: Live E3 PurchaseTracker connection deferred.',
    };
  }

  /**
   * Submits a purchase request for source approval.
   * In disconnected mode, external submission is blocked.
   */
  static submitPurchaseRequest(
    dto: PurchaseRequestSubmit,
    connectionMode: 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' = 'disabled'
  ): { status: 'approved' | 'not_found' | 'blocked'; pr?: StoredPurchaseRequest; message: string } {
    if (connectionMode === 'disabled') {
      return {
        status: 'blocked',
        message: 'CONNECTOR_DISABLED: External PR submission to PurchaseTracker is disabled. E3 PurchaseTracker connector is not active in Central Settings.',
      };
    }

    if (connectionMode === 'sandbox') {
      return PurchaseTrackerContractSimulator.submitPurchaseRequest(dto);
    }

    return {
      status: 'blocked',
      message: 'PRODUCTION_CONNECTION_DEFERRED: Live E3 PurchaseTracker connection deferred.',
    };
  }

  /**
   * Attempts direct PO creation.
   * Strictly disabled in this phase (Section 10 & 15).
   */
  static attemptPurchaseOrderCreation(): { allowed: boolean; errorCode: string; message: string } {
    return {
      allowed: false,
      errorCode: 'PO_CREATION_DEFERRED',
      message: 'Direct PO creation capability is deferred and unverified in PurchaseTracker adapter. Action disabled.',
    };
  }

  static getPurchaseRequestsForProject(
    projectId: string,
    connectionMode: 'disabled' | 'sandbox' | 'production_read_only' | 'production_full' = 'disabled'
  ): StoredPurchaseRequest[] {
    if (connectionMode === 'sandbox') {
      return PurchaseTrackerContractSimulator.getPurchaseRequestsForProject(projectId);
    }
    return [];
  }

  static resetForTesting(): void {
    PurchaseTrackerContractSimulator.resetForTesting();
  }
}
