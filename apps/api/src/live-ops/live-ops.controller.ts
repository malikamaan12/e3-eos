import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import {
  WorkerQualificationCreateSchema,
  CrewAttendanceCheckInSchema,
  ComplianceObligationCreateSchema,
  ComplianceObligationVerifySchema,
  LiveRunSheetItemUpdateSchema,
  IncidentReportSchema,
  IncidentProtectiveActionSchema,
  MaintenanceFaultCreateSchema,
  ClientRequestLogSchema,
  ShiftHandoverCreateSchema,
  OpeningReleaseDecisionSchema,
  AssetReturnInspectionSchema,
  ClaimsExposureLogSchema,
  VenueHandoverSignoffSchema,
  OperationalClosureDecisionSchema,
  FieldSyncBatchSchema,
} from '@e3-eos/contracts';
import {
  ComplianceObligationEngine,
  ComplianceObligation,
  PhysicalVerificationDetails,
  LiveRunSheetEngine,
  LiveRunSheetItem,
  CueStatus,
  LiveCommandCenterEngine,
  LiveIncidentRecord,
  CommandCenterDashboardState,
  FieldSyncEngine,
  OperationSyncResult,
  ProjectCloseoutEngine,
  safeSha256,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';

// In-memory repositories for Sprint 04 live operations state
export const complianceObligationsRepo = new Map<string, ComplianceObligation>();
export const runSheetItemsRepo = new Map<string, LiveRunSheetItem>();
export const incidentsRepo = new Map<string, LiveIncidentRecord>();
export const attendanceRepo = new Map<string, any>();
export const qualificationsRepo = new Map<string, any>();
export const maintenanceRepo = new Map<string, any>();
export const clientRequestsRepo = new Map<string, any>();
export const shiftHandoversRepo = new Map<string, any>();
export const zoneReadinessRepo = new Map<string, any>();
export const bumpOutRepo = new Map<string, any>();
export const assetReturnsRepo = new Map<string, any>();
export const claimsRepo = new Map<string, any>();
export const venueHandoverRepo = new Map<string, any>();
export const operationalClosureRepo = new Map<string, any>();
export const fieldProcessedOperations = new Set<string>();

// Seed helper for initial project baseline
function seedLiveOpsDefaults(projectId: string) {
  if (complianceObligationsRepo.size > 0) return;

  // 1. Compliance Obligations
  const obl1: ComplianceObligation = {
    id: 'obl-qcd-001',
    projectId,
    authorityType: 'civil_defense',
    title: 'Civil Defense Temporary Event Fire Life Safety NOC',
    permitReference: 'QCDD-EV-2026-9941',
    validFrom: new Date(Date.now() - 48 * 3600000).toISOString(),
    validUntil: new Date(Date.now() + 72 * 3600000).toISOString(),
    applicableZone: 'MAIN_STAGE',
    criticalForOpening: true,
    status: 'active',
    verificationMode: 'digital_upload',
    auditHistory: [
      {
        timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
        action: 'ISSUED',
        performedBy: 'Capt. Rashid Al-Kuwari (QCDD)',
      },
    ],
    notes: 'Approved with requirement for 4 designated fire marshals per zone.',
  };

  const obl2: ComplianceObligation = {
    id: 'obl-mun-002',
    projectId,
    authorityType: 'municipality',
    title: 'Doha Municipality Structural Stability Certificate',
    permitReference: 'MMUP-STR-2026-3312',
    validFrom: new Date(Date.now() - 24 * 3600000).toISOString(),
    validUntil: new Date(Date.now() + 48 * 3600000).toISOString(),
    applicableZone: 'MAIN_STAGE',
    criticalForOpening: true,
    status: 'alternative_verified',
    verificationMode: 'physical_verified',
    physicalVerification: {
      inspectorName: 'Eng. Tareq Mansoor',
      inspectionDate: new Date(Date.now() - 6 * 3600000).toISOString(),
      badgeOrId: 'MMUP-ENG-8472',
      siteOfficeReference: 'DOHA-MUNI-ONST-2026/04',
      physicalStampSighted: true,
      notes: 'Physical stamp verified on structural calculation drawings in site office trailer B.',
    },
    auditHistory: [
      {
        timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
        action: 'ALTERNATIVE_PHYSICAL_VERIFICATION',
        performedBy: 'Eng. Tareq Mansoor',
        notes: 'Physical seal sighted on site.',
      },
    ],
  };

  const obl3: ComplianceObligation = {
    id: 'obl-sec-003',
    projectId,
    authorityType: 'venue_noc',
    title: 'Qatar Tourism & Venue Authority Security Access NOC',
    permitReference: 'QT-VEN-2026-8801',
    validFrom: new Date(Date.now() - 12 * 3600000).toISOString(),
    validUntil: new Date(Date.now() + 48 * 3600000).toISOString(),
    applicableZone: 'VIP_MAJLIS',
    criticalForOpening: true,
    status: 'active',
    verificationMode: 'digital_upload',
    auditHistory: [],
  };

  complianceObligationsRepo.set(obl1.id, obl1);
  complianceObligationsRepo.set(obl2.id, obl2);
  complianceObligationsRepo.set(obl3.id, obl3);

  // 2. Run Sheet Items
  const cues: LiveRunSheetItem[] = [
    {
      id: 'cue-001',
      projectId,
      cueNumber: 'CUE-01.00',
      title: 'Doors Open & House Lighting Ingress Preset',
      department: 'Front of House',
      plannedStart: new Date(Date.now() - 60 * 60000).toISOString(),
      plannedEnd: new Date(Date.now() - 30 * 60000).toISOString(),
      actualStart: new Date(Date.now() - 58 * 60000).toISOString(),
      actualEnd: new Date(Date.now() - 30 * 60000).toISOString(),
      delayMinutes: 0,
      status: 'completed',
      dependentOnCues: [],
      responsiblePerson: 'FOH Lead Fatima Al-Nuaimi',
      isCriticalPath: true,
    },
    {
      id: 'cue-002',
      projectId,
      cueNumber: 'CUE-02.00',
      title: 'Dignitary & VIP Arrival Protocol at Majlis',
      department: 'Guest Relations',
      plannedStart: new Date(Date.now() - 25 * 60000).toISOString(),
      plannedEnd: new Date(Date.now() - 5 * 60000).toISOString(),
      actualStart: new Date(Date.now() - 20 * 60000).toISOString(),
      actualEnd: new Date(Date.now() + 5 * 60000).toISOString(),
      delayMinutes: 10,
      status: 'in_progress',
      dependentOnCues: ['CUE-01.00'],
      responsiblePerson: 'Protocol Officer Khalid Al-Attiyah',
      isCriticalPath: true,
      notes: 'Motorcade delayed by 10 mins on Corniche access road.',
    },
    {
      id: 'cue-003',
      projectId,
      cueNumber: 'CUE-03.00',
      title: 'Opening Ceremony National Anthem & Kinetic Lighting Reveal',
      department: 'Production & Show FX',
      plannedStart: new Date(Date.now() + 10 * 60000).toISOString(),
      plannedEnd: new Date(Date.now() + 25 * 60000).toISOString(),
      delayMinutes: 10,
      status: 'pending',
      dependentOnCues: ['CUE-02.00'],
      responsiblePerson: 'Show Caller Marcus Vance',
      isCriticalPath: true,
      notes: 'Hold cue standby until VIP motorcade seated.',
    },
    {
      id: 'cue-004',
      projectId,
      cueNumber: 'CUE-04.00',
      title: 'Cultural Orchestral Performance & Hologram Mapping',
      department: 'Audio & Visual',
      plannedStart: new Date(Date.now() + 30 * 60000).toISOString(),
      plannedEnd: new Date(Date.now() + 60 * 60000).toISOString(),
      delayMinutes: 10,
      status: 'pending',
      dependentOnCues: ['CUE-03.00'],
      responsiblePerson: 'AV Director Tariq Siddiqui',
      isCriticalPath: true,
    },
  ];

  for (const c of cues) {
    runSheetItemsRepo.set(c.cueNumber, c);
  }

  // 3. Live Incidents
  const inc1: LiveIncidentRecord = {
    id: 'inc-001',
    projectId,
    incidentNumber: 'INC-2026-001',
    title: 'Secondary Video Wall Processor Heat Throttle Alert',
    category: 'technical',
    severity: 'medium',
    zone: 'MAIN_STAGE',
    operationalImpact: 'Backup processor active; primary rack A/C auxiliary cooler engaged.',
    status: 'contained',
    protectiveActions: [],
    injuriesCount: 0,
    hospitalTransportRequired: false,
    venueEvacuationInitiated: false,
    requiresRegulatoryReporting: false,
    reportedBy: 'Video Systems Lead Omar Soliman',
    reportedAt: new Date(Date.now() - 40 * 60000).toISOString(),
  };

  incidentsRepo.set(inc1.id, inc1);

  // 4. Qualifications
  qualificationsRepo.set('qual-worker-1', {
    id: 'qual-worker-1',
    workerId: 'worker-ahmed-01',
    workerName: 'Ahmed Al-Kuwari',
    qualificationType: 'Rigging High-Risk Work License',
    certificateNumber: 'QAT-RIG-2024-912',
    validFrom: '2024-01-01T00:00:00.000Z',
    validUntil: '2027-01-01T00:00:00.000Z',
    issuingBody: 'Qatar Ministry of Labour & Civil Defence',
    status: 'active',
  });

  qualificationsRepo.set('qual-worker-2', {
    id: 'qual-worker-2',
    workerId: 'worker-john-02',
    workerName: 'John Doe',
    qualificationType: 'Heavy Rigging Supervisor',
    certificateNumber: 'UK-LOLER-8841',
    validFrom: '2023-01-01T00:00:00.000Z',
    validUntil: '2025-01-01T00:00:00.000Z',
    issuingBody: 'LEEA',
    status: 'revoked',
    revocationReason: 'Certification expired; pending renewal audit.',
  });

  // 5. Attendance
  attendanceRepo.set('att-001', {
    id: 'att-001',
    workerId: 'worker-ahmed-01',
    workerName: 'Ahmed Al-Kuwari',
    role: 'Lead Rigging Technician',
    checkInTime: new Date(Date.now() - 4 * 3600000).toISOString(),
    location: 'MAIN_STAGE',
    verificationMode: 'biometric',
    status: 'confirmed',
    fatigueWarningAcknowledged: false,
  });

  attendanceRepo.set('att-002', {
    id: 'att-002',
    workerId: 'worker-sami-03',
    workerName: 'Sami Haddad',
    role: 'Stage Hand',
    checkInTime: new Date(Date.now() - 3 * 3600000).toISOString(),
    location: 'BACKSTAGE',
    verificationMode: 'qr_scan',
    status: 'confirmed',
    fatigueWarningAcknowledged: false,
  });

  // 6. Maintenance Records
  maintenanceRepo.set('mnt-001', {
    id: 'mnt-001',
    projectId,
    faultReference: 'FLT-2026-081',
    assetId: 'AST-KINETIC-WINCH-12',
    zone: 'MAIN_STAGE',
    faultDescription: 'Winch 12 optical encoder intermittent pulse drop during calibration test.',
    priority: 'high',
    reportedBy: 'Rigging Crew Lead',
    reportedAt: new Date(Date.now() - 120 * 60000).toISOString(),
    technicianAssigned: 'Klaus Mueller (Kinetic Specialist)',
    status: 'resolved',
    actionTaken: 'Recalibrated optical pickup head and secured shielded CAN-bus connector. Passed 3 full load cycles.',
    partsReplaced: ['Shielded CAN Connector B-7'],
    resolvedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  });

  // 7. Client Requests
  clientRequestsRepo.set('req-001', {
    id: 'req-001',
    projectId,
    requestReference: 'CLR-2026-014',
    description: 'Provide 2 additional wireless microphones and dedicate dedicated audio feed for Amiri Diwan camera pool.',
    requestedBy: 'Mr. Hamad Al-Thani (Client Rep)',
    channel: 'verbal',
    receivedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    scopeCategory: 'variation',
    commercialImplication: true,
    estimatedCost: 3500,
    clientApprovedCost: 3500,
    priority: 'high',
    status: 'approved',
    resolutionNotes: 'Shure Axient channels 7 & 8 configured with Dante split to OB Van 1.',
  });

  // 8. Shift Handovers
  shiftHandoversRepo.set('shf-001', {
    id: 'shf-001',
    projectId,
    outgoingLeadId: 'lead-omar-day',
    outgoingLeadName: 'Omar Al-Jaber (Day Operations Lead)',
    incomingLeadId: 'lead-khalid-show',
    incomingLeadName: 'Khalid Mansoor (Show Call Director)',
    handoverTime: new Date(Date.now() - 60 * 60000).toISOString(),
    zone: 'VENUE_WIDE',
    pendingIssues: ['Monitor motorcade delay on Corniche', 'Winch 12 resolved and locked in preset 0'],
    safetyBriefing: 'Full venue briefing completed. All 8 emergency egress routes clear. Qatar Civil Defense marshals on posts.',
    crowdStatus: 'Gates open; ingress flowing at 1,400 pax/hr. VIP drop-off clear.',
    equipmentStatus: 'All primary and secondary consoles online. Sound limits calibrated to 95dBA Leq.',
    handoverNotes: 'Shift smoothly transferred. Show caller in command.',
    acknowledgedByIncoming: true,
    acknowledgedAt: new Date(Date.now() - 50 * 60000).toISOString(),
  });

  // 9. Zone Readiness Nodes
  zoneReadinessRepo.set('MAIN_STAGE', {
    id: 'zn-001',
    projectId,
    zoneName: 'MAIN_STAGE',
    department: 'Live Production',
    technicalPass: true,
    safetyPass: true,
    aestheticPass: true,
    compliancePass: true,
    inspectorId: 'insp-qatar-live',
    inspectedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'ready',
    snags: [],
    notes: 'All 4 gates passed. Sound, light, pyro, structural approved.',
  });

  zoneReadinessRepo.set('VIP_MAJLIS', {
    id: 'zn-002',
    projectId,
    zoneName: 'VIP_MAJLIS',
    department: 'Hospitality & Protocol',
    technicalPass: true,
    safetyPass: true,
    aestheticPass: true,
    compliancePass: true,
    inspectorId: 'insp-protocol',
    inspectedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    status: 'ready',
    snags: [],
    notes: 'Climate control verified at 21°C. Amiri seating arrangement approved.',
  });

  // 10. Bump-Out Activities
  bumpOutRepo.set('bmp-001', {
    id: 'bmp-001',
    projectId,
    zoneName: 'MAIN_STAGE',
    activityType: 'Kinetic Lighting Rig De-Rig & Flight Case Packing',
    plannedCompletion: new Date(Date.now() + 24 * 3600000).toISOString(),
    status: 'scheduled',
    assetsCleared: false,
    hazardsIdentified: 'Working at height (18m), heavy overhead trusses.',
  });

  bumpOutRepo.set('bmp-002', {
    id: 'bmp-002',
    projectId,
    zoneName: 'EXHIBITION_GALLERY',
    activityType: 'Custom Heritage Display Disassembly & Palletizing',
    plannedCompletion: new Date(Date.now() + 30 * 3600000).toISOString(),
    status: 'scheduled',
    assetsCleared: false,
    hazardsIdentified: 'Fragile acrylic vitrines; requires soft strapping.',
  });

  // 11. Asset Returns
  assetReturnsRepo.set('ret-001', {
    id: 'ret-001',
    projectId,
    assetId: 'AST-AUDIO-DIGICO-SD7',
    assetName: 'DiGiCo SD7 Quantum Audio Console System',
    manifestId: 'MNF-OUT-2026-044',
    conditionReceived: 'pristine',
    damagePhotos: [],
    repairCostEstimate: 0,
    responsibility: 'venue',
    notes: 'Returned in original flight case with full PSU and fiber snakes accounted for.',
    inspectedBy: 'Warehouse Inspector Salim',
    inspectedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  });

  // 12. Claims Exposures
  claimsRepo.set('clm-001', {
    id: 'clm-001',
    projectId,
    claimType: 'venue_damage',
    description: 'Minor scuff on VIP Majlis marble threshold caused by subcontractor trolley.',
    claimedAmount: 4500,
    assessedExposure: 1800,
    status: 'under_negotiation',
    settlementNotes: 'Subcontractor insurance covers floor polishing remediation.',
    loggedBy: 'Commercial Lead Tariq',
  });

  // 13. Venue Handover
  venueHandoverRepo.set(projectId, {
    id: 'vh-001',
    projectId,
    deliveryCompleted: true,
    venueReinstatementStatus: 'inspected',
    openDamageClaims: [
      {
        id: 'clm-001',
        description: 'VIP Majlis threshold buffing',
        estimatedCost: 1800,
        resolved: false,
      },
    ],
    depositStatus: 'held',
    keysReturned: true,
    clientRepresentativeName: 'Jassim Al-Sulaiti (Venue Authority)',
    clientSignedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    signoffBy: 'Operations Director E3',
    signoffRole: 'event_operations_director',
    auditHash: 'audit-seal-vh-99824',
  });
}

@Controller('live-ops')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class LiveOpsController {
  // 1. Crew Roster & Attendance
  @Get('roster')
  getRoster(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const attendance = Array.from(attendanceRepo.values());
    const qualifications = Array.from(qualificationsRepo.values());
    return {
      data: {
        projectId,
        totalRostered: 42,
        checkedIn: attendance.length,
        attendancePercentage: Math.round((attendance.length / 42) * 100),
        activeQualificationsCount: qualifications.filter((q) => q.status === 'active').length,
        fatiguePolicy: 'Qatar Statutory Baseline (8h ordinary, max 10h actual) + 10h mandatory rest interval',
        records: attendance,
      },
      meta: { requestId: 'req-roster-list' },
    };
  }

  @Post('roster/check-in')
  checkInCrew(@Body() body: any, @Req() req: Request) {
    const parsed = CrewAttendanceCheckInSchema.parse(body);
    const id = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      ...parsed,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    attendanceRepo.set(id, record);
    return {
      data: { id, status: 'confirmed', payload: record },
      meta: { requestId: (req.headers['x-request-id'] as string) || 'req-check-in' },
    };
  }

  // 2. Qualifications
  @Get('qualifications')
  getQualifications(@Query('workerId') workerId?: string) {
    seedLiveOpsDefaults('PRJ-QND-2026');
    const all = Array.from(qualificationsRepo.values());
    const filtered = workerId ? all.filter((q) => q.workerId === workerId) : all;
    return {
      data: filtered,
      meta: { total: filtered.length },
    };
  }

  @Post('qualifications')
  createQualification(@Body() body: any) {
    const parsed = WorkerQualificationCreateSchema.parse(body);
    const id = `qual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = { id, ...parsed };
    qualificationsRepo.set(id, record);
    return {
      data: { id, status: record.status, payload: record },
      meta: { requestId: 'req-qual-create' },
    };
  }

  @Patch('qualifications/:id/revoke')
  revokeQualification(@Param('id') id: string, @Body() body: { reason: string }) {
    const qual = qualificationsRepo.get(id);
    if (!qual) throw new HttpException('QUALIFICATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    qual.status = 'revoked';
    qual.revokedAt = new Date().toISOString();
    qual.revocationReason = body.reason;
    qualificationsRepo.set(id, qual);
    return {
      data: { id, status: 'revoked', payload: qual },
      meta: { requestId: 'req-qual-revoke' },
    };
  }

  // 3. Compliance Obligations
  @Get('compliance')
  getCompliance(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const obligations = Array.from(complianceObligationsRepo.values()).filter(
      (o) => o.projectId === projectId
    );
    const evalResult = ComplianceObligationEngine.evaluateZoneCompliance(
      'MAIN_STAGE',
      obligations
    );
    return {
      data: {
        projectId,
        obligations,
        evaluation: evalResult,
      },
      meta: { total: obligations.length },
    };
  }

  @Post('compliance')
  createObligation(@Body() body: any) {
    const parsed = ComplianceObligationCreateSchema.parse(body);
    const id = `obl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const authorityMap: Record<string, any> = {
      permit: 'civil_defense',
      licence: 'municipality',
      certificate: 'engineering_third_party',
      authority_approval: 'venue_noc',
    };
    const authType = authorityMap[parsed.type] || 'civil_defense';
    const statusMap: Record<string, any> = {
      approved: 'active',
      verified_alternative: 'alternative_verified',
      expired: 'expired',
      rejected: 'revoked',
    };
    const mappedStatus = statusMap[parsed.status] || (parsed.status === 'verified_alternative' ? 'alternative_verified' : 'active');

    const obligation: ComplianceObligation = {
      id,
      projectId: parsed.projectId,
      authorityType: authType,
      title: parsed.requirement,
      permitReference: parsed.evidenceRef || `REF-${Date.now().toString().substring(6)}`,
      issueDate: parsed.issueDate,
      validFrom: parsed.issueDate || new Date().toISOString(),
      validUntil: parsed.expiryDate || parsed.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      applicableZone: parsed.zone,
      criticalForOpening: parsed.isBlocking,
      status: mappedStatus,
      verificationMode: parsed.verificationMethod === 'physical_on_site' ? 'physical_verified' : 'digital_upload',
      auditHistory: [
        {
          timestamp: new Date().toISOString(),
          action: 'CREATED',
          performedBy: parsed.responsibleOwnerId,
        },
      ],
      notes: parsed.applicableScope,
    };
    complianceObligationsRepo.set(id, obligation);
    return {
      data: { id, status: obligation.status, payload: obligation },
      meta: { requestId: 'req-obl-create' },
    };
  }

  @Post('compliance/verify')
  verifyCompliance(@Body() body: any) {
    const parsed = ComplianceObligationVerifySchema.parse(body);
    const obl = complianceObligationsRepo.get(parsed.obligationId);
    if (!obl) throw new HttpException('OBLIGATION_NOT_FOUND', HttpStatus.NOT_FOUND);

    const isPhysical =
      parsed.verificationMethod.includes('physical') ||
      parsed.verificationMethod.includes('alternative') ||
      parsed.verificationMethod === 'on_site_stamp';

    if (isPhysical) {
      const details: PhysicalVerificationDetails = {
        inspectorName: parsed.verifiedBy,
        inspectionDate: new Date().toISOString(),
        badgeOrId: `INSP-${parsed.verifiedBy.substring(0, 6).toUpperCase()}`,
        siteOfficeReference: parsed.physicalDocReference,
        physicalStampSighted: true,
        notes: parsed.notes,
      };
      const updated = ComplianceObligationEngine.verifyAlternativePhysical(
        obl,
        details,
        parsed.verifiedBy
      );
      complianceObligationsRepo.set(obl.id, updated);
      return {
        data: { id: obl.id, status: updated.status, payload: updated },
        meta: { requestId: 'req-obl-verify' },
      };
    } else {
      obl.status = 'active';
      obl.verificationMode = 'digital_upload';
      obl.auditHistory.push({
        timestamp: new Date().toISOString(),
        action: 'DIGITAL_UPLOAD_VERIFIED',
        performedBy: parsed.verifiedBy,
      });
      complianceObligationsRepo.set(obl.id, obl);
      return {
        data: { id: obl.id, status: 'active', payload: obl },
        meta: { requestId: 'req-obl-verify' },
      };
    }
  }

  // 4. Live Run Sheet
  @Get('run-sheet')
  getRunSheet(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(runSheetItemsRepo.values()).filter((i) => i.projectId === projectId);
    const overview = LiveRunSheetEngine.getActiveRunSheetOverview(items);
    return {
      data: {
        projectId,
        items,
        overview,
      },
      meta: { total: items.length },
    };
  }

  @Patch('run-sheet/item/:cueNumber/update')
  updateRunSheetItem(@Param('cueNumber') cueNumber: string, @Body() body: any) {
    const parsed = LiveRunSheetItemUpdateSchema.parse(body);
    const allItems = Array.from(runSheetItemsRepo.values());
    const statusMap: Record<string, CueStatus> = {
      active: 'in_progress',
      ready: 'pending',
      upcoming: 'pending',
      complete: 'completed',
      delayed: 'delayed',
      skipped: 'skipped',
      cancelled: 'skipped',
      blocked: 'delayed',
    };
    const cueStatus = statusMap[parsed.status] || 'pending';
    const result = LiveRunSheetEngine.applyCueDelay(cueNumber, parsed.delayMinutes ?? 0, allItems, {
      actualStart: parsed.actualTime,
      actualEnd: parsed.status === 'complete' ? parsed.actualTime : undefined,
      status: cueStatus,
      notes: parsed.notes || parsed.delayReason,
    });

    // Save updated items back to repository
    runSheetItemsRepo.set(result.updatedItem.cueNumber, result.updatedItem);
    for (const prop of result.propagatedItems) {
      runSheetItemsRepo.set(prop.cueNumber, prop);
    }

    return {
      data: {
        cueNumber,
        delayPropagation: result,
      },
      meta: { requestId: 'req-cue-delay-prop' },
    };
  }

  // 5. Command Center & Incidents
  @Get('command-center')
  getCommandCenter(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);

    const openIncidents = Array.from(incidentsRepo.values()).filter((i) => i.status !== 'closed');
    const criticalIncidents = openIncidents.filter((i) => i.severity === 'critical');
    const activeActions = openIncidents.flatMap((i) => i.protectiveActions || []);

    const obligations = Array.from(complianceObligationsRepo.values());
    const criticalBlockers = obligations.filter(
      (o) => o.criticalForOpening && o.status !== 'active' && o.status !== 'alternative_verified'
    );

    const cues = Array.from(runSheetItemsRepo.values());
    const overview = LiveRunSheetEngine.getActiveRunSheetOverview(cues);

    const zones = Array.from(zoneReadinessRepo.values());
    const readyZones = zones.filter((z) => z.status === 'ready').length;

    const audienceProjection = LiveCommandCenterEngine.computeAudienceProjection(
      15000,
      10850,
      1400,
      350,
      2
    );

    const state: CommandCenterDashboardState = {
      projectId,
      generatedAt: new Date().toISOString(),
      panels: {
        incidentLog: {
          openIncidentsCount: openIncidents.length,
          criticalIncidentsCount: criticalIncidents.length,
          activeProtectiveActions: activeActions,
        },
        crewDuty: {
          rosteredWorkers: 42,
          checkedInWorkers: attendanceRepo.size,
          attendancePercentage: Math.round((attendanceRepo.size / 42) * 100),
          fatigueWarningsActive: 0,
        },
        compliance: {
          totalObligations: obligations.length,
          activeObligations: obligations.filter(
            (o) => o.status === 'active' || o.status === 'alternative_verified'
          ).length,
          criticalBlockersCount: criticalBlockers.length,
          canOperate: criticalBlockers.length === 0,
        },
        runSheet: {
          totalCues: cues.length,
          completedCues: overview.completedCues,
          delayedCues: overview.delayedCues,
          currentCueTitle: overview.activeCue?.title,
          cumulativeDelayMinutes: overview.totalCumulativeDelayMinutes,
        },
        zoneReadiness: {
          totalZones: zones.length,
          readyZones,
          blockedZones: zones.length - readyZones,
          readinessPercentage: zones.length ? Math.round((readyZones / zones.length) * 100) : 100,
        },
        maintenance: {
          openFaultsCount: Array.from(maintenanceRepo.values()).filter((m) => m.status !== 'resolved').length,
          criticalFaultsCount: 0,
        },
        clientRequests: {
          pendingRequestsCount: Array.from(clientRequestsRepo.values()).filter((c) => c.status === 'logged').length,
          approvedVariationsCount: Array.from(clientRequestsRepo.values()).filter((c) => c.status === 'approved').length,
        },
        shiftHandover: {
          lastHandoverTime: Array.from(shiftHandoversRepo.values())[0]?.handoverTime,
          pendingHandoverIssuesCount: 1,
          incomingLeadAcknowledged: true,
        },
      },
      audienceProjection,
    };

    return {
      data: state,
      meta: { requestId: 'req-cmd-center' },
    };
  }

  @Get('incidents')
  getIncidents(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const incidents = Array.from(incidentsRepo.values()).filter((i) => i.projectId === projectId);
    return {
      data: incidents,
      meta: { total: incidents.length },
    };
  }

  @Post('incidents')
  reportIncident(@Body() body: any) {
    const parsed = IncidentReportSchema.parse(body);
    const id = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      minor: 'low',
      observation: 'low',
      moderate: 'medium',
      major: 'high',
      critical: 'critical',
    };
    const categoryMap: Record<string, any> = {
      hse: 'safety',
      medical: 'medical',
      security: 'security',
      technical: 'technical',
      operational: 'safety',
      guest: 'crowd',
      crowd: 'crowd',
      weather: 'weather',
    };

    const record: LiveIncidentRecord = {
      id,
      projectId: parsed.projectId,
      incidentNumber: `INC-2026-${String(incidentsRepo.size + 1).padStart(3, '0')}`,
      title: parsed.description.substring(0, 80),
      category: categoryMap[parsed.incidentType] || 'safety',
      severity: severityMap[parsed.severity] || 'medium',
      zone: parsed.zone,
      operationalImpact: parsed.immediateAction || parsed.description,
      status: 'open',
      protectiveActions: [],
      injuriesCount: parsed.incidentType === 'medical' ? 1 : 0,
      hospitalTransportRequired: parsed.protectiveAction === 'request_medical',
      venueEvacuationInitiated: parsed.protectiveAction === 'evacuate_area',
      requiresRegulatoryReporting: parsed.severity === 'critical',
      reportedBy: parsed.reporterName || parsed.reporterId,
      reportedAt: new Date().toISOString(),
    };
    incidentsRepo.set(id, record);
    return {
      data: { id, status: 'open', payload: record },
      meta: { requestId: 'req-inc-create' },
    };
  }

  @Post('incidents/:id/protective-action')
  executeProtectiveAction(@Param('id') id: string, @Body() body: any) {
    const parsed = IncidentProtectiveActionSchema.parse(body);
    const incident = incidentsRepo.get(id);
    if (!incident) throw new HttpException('INCIDENT_NOT_FOUND', HttpStatus.NOT_FOUND);

    const actionMap: Record<string, any> = {
      stop_work: 'stop_show',
      suspend_activity: 'stop_show',
      close_zone: 'evacuate_zone',
      evacuate_area: 'evacuate_zone',
      isolate_equipment: 'isolate_equipment',
      request_medical: 'dispatch_medical',
    };
    const actType = actionMap[parsed.protectiveAction] || 'isolate_equipment';

    const result = LiveCommandCenterEngine.executeProtectiveAction(
      incident,
      actType,
      parsed.authorizedBy,
      parsed.justification
    );

    incidentsRepo.set(id, result.updatedIncident);

    return {
      data: {
        incidentId: id,
        action: result.action,
        updatedIncident: result.updatedIncident,
      },
      meta: { requestId: 'req-protective-action' },
    };
  }

  // 6. Maintenance Faults
  @Get('maintenance')
  getMaintenance(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(maintenanceRepo.values()).filter((m) => m.projectId === projectId);
    return { data: items, meta: { total: items.length } };
  }

  @Post('maintenance')
  reportMaintenance(@Body() body: any) {
    const parsed = MaintenanceFaultCreateSchema.parse(body);
    const id = `mnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      faultReference: `FLT-2026-${String(maintenanceRepo.size + 1).padStart(3, '0')}`,
      ...parsed,
      status: 'reported',
      reportedAt: new Date().toISOString(),
    };
    maintenanceRepo.set(id, record);
    return { data: { id, status: 'reported', payload: record }, meta: { requestId: 'req-mnt-create' } };
  }

  // 7. Client Requests
  @Get('client-requests')
  getClientRequests(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(clientRequestsRepo.values()).filter((c) => c.projectId === projectId);
    return { data: items, meta: { total: items.length } };
  }

  @Post('client-requests')
  logClientRequest(@Body() body: any) {
    const parsed = ClientRequestLogSchema.parse(body);
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      requestReference: `CLR-2026-${String(clientRequestsRepo.size + 1).padStart(3, '0')}`,
      ...parsed,
      status: 'logged',
      receivedAt: new Date().toISOString(),
    };
    clientRequestsRepo.set(id, record);
    return { data: { id, status: 'logged', payload: record }, meta: { requestId: 'req-clr-create' } };
  }

  // 8. Shift Handovers
  @Get('shift-handovers')
  getShiftHandovers(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(shiftHandoversRepo.values()).filter((s) => s.projectId === projectId);
    return { data: items, meta: { total: items.length } };
  }

  @Post('shift-handovers')
  createShiftHandover(@Body() body: any) {
    const parsed = ShiftHandoverCreateSchema.parse(body);
    const id = `shf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      ...parsed,
      handoverTime: new Date().toISOString(),
      acknowledgedByIncoming: false,
    };
    shiftHandoversRepo.set(id, record);
    return { data: { id, status: 'created', payload: record }, meta: { requestId: 'req-shf-create' } };
  }

  // 9. Zone Readiness & Opening Release
  @Get('zone-readiness')
  getZoneReadiness(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(zoneReadinessRepo.values()).filter((z) => z.projectId === projectId);
    return { data: items, meta: { total: items.length } };
  }

  @Post('opening-release/decision')
  evaluateOpeningRelease(@Body() body: any) {
    const parsed = OpeningReleaseDecisionSchema.parse(body);
    const zone = (body as any).zone || 'MAIN_STAGE';
    const obligations = Array.from(complianceObligationsRepo.values()).filter(
      (o) => o.projectId === parsed.projectId
    );
    const evalResult = ComplianceObligationEngine.evaluateZoneCompliance(zone, obligations);

    const isAuthorizing = parsed.decision === 'authorized' || parsed.decision === 'authorized_with_exceptions';
    if (isAuthorizing && !evalResult.canOpenZone) {
      throw new HttpException(
        `OPENING_RELEASE_DENIED: ${evalResult.summaryReason}`,
        HttpStatus.PRECONDITION_FAILED
      );
    }

    const auditPayload = {
      projectId: parsed.projectId,
      zone,
      decision: parsed.decision,
      authorizedBy: parsed.approver,
      authorizedRole: parsed.authoritySource,
      timestamp: new Date().toISOString(),
    };
    const auditHash = safeSha256(auditPayload);

    return {
      data: {
        zone,
        decision: parsed.decision,
        authorizedBy: parsed.approver,
        authorizedRole: parsed.authoritySource,
        auditHash,
        complianceEvaluation: evalResult,
      },
      meta: { requestId: 'req-opening-decision' },
    };
  }

  // 10. Bump-Out & Returns
  @Get('bump-out')
  getBumpOut(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(bumpOutRepo.values()).filter((b) => b.projectId === projectId);
    return { data: items, meta: { total: items.length } };
  }

  @Get('asset-returns')
  getAssetReturns(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(assetReturnsRepo.values()).filter((a) => a.projectId === projectId);
    return { data: items, meta: { total: items.length } };
  }

  @Post('asset-returns/inspect')
  inspectAssetReturn(@Body() body: any) {
    const parsed = AssetReturnInspectionSchema.parse(body);
    const id = `ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      ...parsed,
      inspectedAt: new Date().toISOString(),
    };
    assetReturnsRepo.set(id, record);
    return { data: { id, status: 'inspected', payload: record }, meta: { requestId: 'req-asset-return' } };
  }

  // 11. Claims Exposures
  @Get('claims')
  getClaims(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const items = Array.from(claimsRepo.values()).filter((c) => c.projectId === projectId);
    return { data: items, meta: { total: items.length } };
  }

  @Post('claims')
  logClaim(@Body() body: any) {
    const parsed = ClaimsExposureLogSchema.parse(body);
    const id = `clm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      ...parsed,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    claimsRepo.set(id, record);
    return { data: { id, status: 'open', payload: record }, meta: { requestId: 'req-claim-log' } };
  }

  // 12. Venue Handover & Operational Closure
  @Get('venue-handover')
  getVenueHandover(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const record = venueHandoverRepo.get(projectId);
    return { data: record, meta: { requestId: 'req-vh-get' } };
  }

  @Post('venue-handover/signoff')
  signoffVenueHandover(@Body() body: any) {
    const parsed = VenueHandoverSignoffSchema.parse(body);
    const record = {
      id: `vh-${Date.now()}`,
      ...parsed,
      signedAt: new Date().toISOString(),
      auditHash: safeSha256(parsed),
    };
    venueHandoverRepo.set(parsed.projectId, record);
    return { data: { id: record.id, status: 'accepted', payload: record }, meta: { requestId: 'req-vh-signoff' } };
  }

  @Get('operational-closure')
  getOperationalClosure(@Query('projectId') projectId: string = 'PRJ-QND-2026') {
    seedLiveOpsDefaults(projectId);
    const record = operationalClosureRepo.get(projectId);
    return { data: record, meta: { requestId: 'req-op-closure-get' } };
  }

  @Post('operational-closure/decision')
  decideOperationalClosure(@Body() body: any) {
    const parsed = OperationalClosureDecisionSchema.parse(body);
    const evalResult = ProjectCloseoutEngine.evaluateOperationalClosure({
      projectId: parsed.projectId,
      checklist: parsed.dimensionsChecked,
      openReceivablesAcknowledged: parsed.openReceivablesAcknowledged,
      signoffBy: parsed.authorizedBy,
      signoffRole: 'event_operations_director',
    });

    if (!evalResult.eligible) {
      throw new HttpException(
        `OPERATIONAL_CLOSURE_REJECTED: Unmet pillars: ${evalResult.unmetPillars.join(', ')}`,
        HttpStatus.PRECONDITION_FAILED
      );
    }

    operationalClosureRepo.set(parsed.projectId, evalResult.closureRecord);

    return {
      data: evalResult.closureRecord,
      meta: { requestId: 'req-op-close-decision' },
    };
  }

  // 13. Field Sync Batch Endpoint
  @Post('field-sync/batch')
  syncBatch(@Body() body: any) {
    const parsed = FieldSyncBatchSchema.parse(body);

    const results: OperationSyncResult[] = [];
    for (const op of parsed.operations) {
      const offlineCheck = FieldSyncEngine.validateOfflineOperationAllowed(op as any);
      if (!offlineCheck.allowed) {
        results.push({
          clientOperationId: op.clientOperationId,
          status: 'rejected',
          reason: offlineCheck.reason,
          serverTimestamp: new Date(),
        });
        continue;
      }

      if (fieldProcessedOperations.has(op.clientOperationId)) {
        results.push({
          clientOperationId: op.clientOperationId,
          status: 'duplicate_ignored',
          reason: 'Operation already processed previously. Replay ignored.',
          serverTimestamp: new Date(),
        });
        continue;
      }

      // Check worker qualification if applicable
      const qual = qualificationsRepo.get(`qual-${op.workerId}`) || Array.from(qualificationsRepo.values()).find((q) => q.workerId === op.workerId);
      const qualResult = FieldSyncEngine.processWorkerActionWithQualification(op as any, qual);

      fieldProcessedOperations.add(op.clientOperationId);
      results.push(qualResult);
    }

    const mediaResults = (parsed.mediaUploads || []).map((m: any) => {
      const isComplete = m.isBinaryComplete && m.receivedBytes >= m.expectedBytes;
      return {
        uploadId: m.uploadId,
        status: isComplete ? ('verified_complete' as const) : ('pending_binary_upload' as const),
      };
    });

    return {
      data: {
        deviceId: parsed.deviceId,
        operationsProcessed: results.length,
        results,
        mediaResults,
        serverTimestamp: new Date().toISOString(),
      },
      meta: { requestId: 'req-field-batch-sync' },
    };
  }
}
