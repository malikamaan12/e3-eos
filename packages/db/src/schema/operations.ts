import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const crewShifts = pgTable('crew_shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  workerId: uuid('worker_id').references(() => users.id).notNull(),
  role: text('role').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  status: text('status').default('scheduled').notNull(), // 'scheduled', 'completed', 'cancelled'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const crewAttendance = pgTable('crew_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  shiftId: uuid('shift_id').references(() => crewShifts.id),
  workerId: uuid('worker_id').references(() => users.id).notNull(),
  checkInAt: timestamp('check_in_at', { withTimezone: true }).notNull(),
  checkOutAt: timestamp('check_out_at', { withTimezone: true }),
  verificationMethod: text('verification_method').default('field_app').notNull(),
  status: text('status').default('confirmed').notNull(), // 'confirmed', 'observation_flagged_for_review'
  location: text('location'),
  supervisorId: uuid('supervisor_id').references(() => users.id),
  qualificationsChecked: boolean('qualifications_checked').default(true).notNull(),
  fatigueWarningAcknowledged: boolean('fatigue_warning_acknowledged').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workerQualifications = pgTable('worker_qualifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  workerId: uuid('worker_id').references(() => users.id).notNull(),
  qualificationType: text('qualification_type').notNull(),
  certificateNumber: text('certificate_number').notNull(),
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  issuingBody: text('issuing_body'),
  status: text('status').default('active').notNull(), // 'active', 'expired', 'revoked'
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revocationReason: text('revocation_reason'),
  verificationEvidence: text('verification_evidence'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const logisticsTrips = pgTable('logistics_trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  vehicleId: text('vehicle_id').notNull(),
  driverId: uuid('driver_id').references(() => users.id).notNull(),
  loadingStart: timestamp('loading_start', { withTimezone: true }).notNull(),
  travelStart: timestamp('travel_start', { withTimezone: true }).notNull(),
  venueArrival: timestamp('venue_arrival', { withTimezone: true }).notNull(),
  eventStart: timestamp('event_start', { withTimezone: true }).notNull(),
  eventEnd: timestamp('event_end', { withTimezone: true }).notNull(),
  bumpOutEnd: timestamp('bump_out_end', { withTimezone: true }).notNull(),
  returnInspectionEnd: timestamp('return_inspection_end', { withTimezone: true }).notNull(),
  status: text('status').default('planned').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const regulatoryPermits = pgTable('regulatory_permits', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  authorityName: text('authority_name').notNull(),
  permitType: text('permit_type').notNull(),
  permitNumber: text('permit_number'),
  status: text('status').default('absent').notNull(), // 'obtained', 'absent', 'alternative_verified'
  hasDigitalUpload: boolean('has_digital_upload').default(false).notNull(),
  alternativeVerification: jsonb('alternative_verification'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const readinessCheckpoints = pgTable('readiness_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  zone: text('zone').notNull(),
  title: text('title').notNull(),
  isCritical: boolean('is_critical').default(false).notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'passed', 'failed'
  inspectorId: uuid('inspector_id').references(() => users.id),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const openingReleases = pgTable('opening_releases', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  zone: text('zone').notNull(),
  releasedBy: uuid('released_by').references(() => users.id).notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }).defaultNow().notNull(),
  decision: text('decision').notNull(), // 'released', 'blocked'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const incidentRecords = pgTable('incident_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  incidentNumber: text('incident_number'),
  title: text('title').notNull(),
  category: text('category').default('safety').notNull(), // 'safety', 'crowd', 'technical', 'structural', 'medical', 'weather', 'security'
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  zone: text('zone'),
  operationalImpact: text('operational_impact').notNull(),
  restrictedPersonalNarrative: text('restricted_personal_narrative'),
  status: text('status').default('open').notNull(), // 'open', 'contained', 'resolved', 'closed'
  protectiveActions: jsonb('protective_actions').default([]).notNull(),
  injuriesCount: integer('injuries_count').default(0).notNull(),
  hospitalTransportRequired: boolean('hospital_transport_required').default(false).notNull(),
  venueEvacuationInitiated: boolean('venue_evacuation_initiated').default(false).notNull(),
  requiresRegulatoryReporting: boolean('requires_regulatory_reporting').default(false).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolutionNotes: text('resolution_notes'),
  rootCause: text('root_cause'),
  reportedBy: uuid('reported_by').references(() => users.id).notNull(),
  reportedAt: timestamp('reported_at', { withTimezone: true }).defaultNow().notNull(),
});

export const venueHandoverRecords = pgTable('venue_handover_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  deliveryCompleted: boolean('delivery_completed').default(false).notNull(),
  venueReinstatementStatus: text('venue_reinstatement_status').default('pending').notNull(), // 'pending', 'inspected', 'accepted', 'remedial_required'
  openDamageClaims: jsonb('open_damage_claims').default([]).notNull(),
  depositStatus: text('deposit_status').default('held').notNull(), // 'held', 'partially_retained', 'released'
  signoffBy: text('signoff_by'),
  signoffRole: text('signoff_role'),
  keysReturned: boolean('keys_returned').default(false).notNull(),
  punchListItems: jsonb('punch_list_items').default([]).notNull(),
  clientRepresentativeName: text('client_representative_name'),
  clientSignedAt: timestamp('client_signed_at', { withTimezone: true }),
  auditHash: text('audit_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const packingLists = pgTable('packing_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  packingListNumber: text('packing_list_number').notNull(),
  warehouseId: uuid('warehouse_id'),
  destination: text('destination').notNull(),
  vehicleId: text('vehicle_id'),
  driverId: uuid('driver_id').references(() => users.id),
  dispatchDate: timestamp('dispatch_date', { withTimezone: true }).notNull(),
  requiredArrival: timestamp('required_arrival', { withTimezone: true }).notNull(),
  items: jsonb('items').default([]).notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'picking', 'packed', 'ready', 'dispatched', 'in_transit', 'delivered', 'acknowledged', 'returned', 'closed'
  deliveryProof: jsonb('delivery_proof'),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const logisticsPlans = pgTable('logistics_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  vehicleId: text('vehicle_id').notNull(),
  vehicleType: text('vehicle_type').default('7 Ton').notNull(),
  supplier: text('supplier').notNull(),
  driverName: text('driver_name').notNull(),
  driverPhone: text('driver_phone').notNull(),
  loadDescription: text('load_description').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  departureTime: timestamp('departure_time', { withTimezone: true }).notNull(),
  arrivalTime: timestamp('arrival_time', { withTimezone: true }).notNull(),
  accessSlot: text('access_slot').default('Slot A').notNull(),
  permitNumber: text('permit_number'),
  loadingDock: text('loading_dock').default('Dock 01').notNull(),
  contactPerson: text('contact_person'),
  status: text('status').default('planned').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const crewAssignments = pgTable('crew_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  personName: text('person_name').notNull(),
  employer: text('employer').default('E3 Live Operations').notNull(),
  role: text('role').notNull(),
  department: text('department').notNull(),
  shiftId: uuid('shift_id'),
  location: text('location').notNull(),
  supervisorName: text('supervisor_name'),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  accreditation: text('accreditation').default('Verified Site Pass').notNull(),
  permit: text('permit'),
  certification: text('certification'),
  personnelType: text('personnel_type').default('e3_employee').notNull(),
  status: text('status').default('scheduled').notNull(), // 'scheduled', 'confirmed', 'checked_in', 'checked_out', 'conflict_flagged'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dailySiteReports = pgTable('daily_site_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  reportDate: text('report_date').notNull(), // YYYY-MM-DD
  workCompleted: text('work_completed').notNull(),
  workDelayed: text('work_delayed').default('None').notNull(),
  manpowerCount: text('manpower_count').default('0').notNull(),
  equipmentActive: text('equipment_active').default('All operational').notNull(),
  deliveriesReceived: text('deliveries_received').default('All cleared').notNull(),
  incidentsOccurred: text('incidents_occurred').default('Zero incidents').notNull(),
  snagsIdentified: text('snags_identified').default('None').notNull(),
  clientInstructions: text('client_instructions').default('None').notNull(),
  weatherConditions: text('weather_conditions').default('Clear, 28°C').notNull(),
  photos: jsonb('photos').$type<string[]>().default([]).notNull(),
  tomorrowPlan: text('tomorrow_plan').notNull(),
  recordedBy: text('recorded_by').notNull(),
  isImmutable: boolean('is_immutable').default(true).notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});

export const installationItems = pgTable('installation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  packageId: uuid('package_id'),
  assetId: uuid('asset_id'),
  title: text('title').notNull(),
  status: text('status').default('not_delivered').notNull(), // 'not_delivered', 'delivered', 'positioned', 'installed', 'tested', 'accepted'
  evidenceUris: jsonb('evidence_uris').$type<string[]>().default([]).notNull(),
  installerNotes: text('installer_notes'),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const operationalReadinessGates = pgTable('operational_readiness_gates', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  overallStatus: text('overall_status').default('NOT_READY').notNull(), // 'READY', 'READY_WITH_EXCEPTIONS', 'NOT_READY'
  overallScorePercent: text('overall_score_percent').default('0').notNull(),
  dimensionChecks: jsonb('dimension_checks').default([]).notNull(),
  criticalBlockers: jsonb('critical_blockers').$type<string[]>().default([]).notNull(),
  exceptions: jsonb('exceptions').$type<string[]>().default([]).notNull(),
  eligibleForOpeningReview: boolean('eligible_for_opening_review').default(false).notNull(),
  canOpen: boolean('can_open').default(false).notNull(),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const openingAuthorizations = pgTable('opening_authorizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  authorizedBy: text('authorized_by').notNull(),
  authorizedRole: text('authorized_role').notNull(),
  authorizedAt: timestamp('authorized_at', { withTimezone: true }).defaultNow().notNull(),
  readinessStatus: text('readiness_status').notNull(),
  readinessScorePercent: text('readiness_score_percent').notNull(),
  exceptionsAcknowledged: jsonb('exceptions_acknowledged').$type<string[]>().default([]).notNull(),
  justification: text('justification'),
  dualSignoffBy: text('dual_signoff_by'),
  dualSignoffAt: timestamp('dual_signoff_at', { withTimezone: true }),
  auditHash: text('audit_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const complianceObligations = pgTable('compliance_obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  authorityType: text('authority_type').notNull(), // 'civil_defense', 'municipality', 'venue_noc', 'engineering_third_party', 'food_safety', 'environmental'
  title: text('title').notNull(),
  permitReference: text('permit_reference').notNull(),
  issueDate: timestamp('issue_date', { withTimezone: true }),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  applicableZone: text('applicable_zone').notNull(),
  criticalForOpening: boolean('critical_for_opening').default(true).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'expired', 'alternative_verified', 'revoked', 'pending'
  verificationMode: text('verification_mode').default('digital_upload').notNull(), // 'digital_upload', 'physical_verified'
  physicalVerification: jsonb('physical_verification'),
  auditHistory: jsonb('audit_history').default([]).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const liveRunSheetItems = pgTable('live_run_sheet_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  cueNumber: text('cue_number').notNull(),
  title: text('title').notNull(),
  department: text('department').notNull(),
  plannedStart: timestamp('planned_start', { withTimezone: true }).notNull(),
  plannedEnd: timestamp('planned_end', { withTimezone: true }).notNull(),
  actualStart: timestamp('actual_start', { withTimezone: true }),
  actualEnd: timestamp('actual_end', { withTimezone: true }),
  delayMinutes: integer('delay_minutes').default(0).notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'in_progress', 'completed', 'delayed', 'skipped'
  dependentOnCues: jsonb('dependent_on_cues').$type<string[]>().default([]).notNull(),
  responsiblePerson: text('responsible_person').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const maintenanceRecords = pgTable('maintenance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  faultReference: text('fault_reference').notNull(),
  assetId: text('asset_id'),
  zone: text('zone').notNull(),
  faultDescription: text('fault_description').notNull(),
  priority: text('priority').default('medium').notNull(), // 'low', 'medium', 'high', 'critical'
  reportedBy: uuid('reported_by').references(() => users.id).notNull(),
  reportedAt: timestamp('reported_at', { withTimezone: true }).defaultNow().notNull(),
  technicianAssigned: text('technician_assigned'),
  status: text('status').default('reported').notNull(), // 'reported', 'dispatched', 'in_progress', 'resolved'
  actionTaken: text('action_taken'),
  partsReplaced: jsonb('parts_replaced').default([]).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const clientRequests = pgTable('client_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  requestReference: text('request_reference').notNull(),
  description: text('description').notNull(),
  requestedBy: text('requested_by').notNull(),
  channel: text('channel').default('verbal').notNull(), // 'verbal', 'radio', 'whatsapp', 'email', 'written'
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  scopeCategory: text('scope_category').default('snag').notNull(), // 'variation', 'snag', 'enhancement', 'urgent_fix'
  commercialImplication: boolean('commercial_implication').default(false).notNull(),
  estimatedCost: integer('estimated_cost').default(0).notNull(),
  clientApprovedCost: integer('client_approved_cost'),
  priority: text('priority').default('medium').notNull(), // 'low', 'medium', 'high', 'critical'
  status: text('status').default('logged').notNull(), // 'logged', 'assessed', 'approved', 'in_progress', 'completed', 'declined'
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const shiftHandovers = pgTable('shift_handovers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  outgoingLeadId: uuid('outgoing_lead_id').references(() => users.id).notNull(),
  incomingLeadId: uuid('incoming_lead_id').references(() => users.id).notNull(),
  handoverTime: timestamp('handover_time', { withTimezone: true }).defaultNow().notNull(),
  zone: text('zone').notNull(),
  pendingIssues: jsonb('pending_issues').default([]).notNull(),
  safetyBriefing: text('safety_briefing').notNull(),
  crowdStatus: text('crowd_status').notNull(),
  equipmentStatus: text('equipment_status').notNull(),
  handoverNotes: text('handover_notes'),
  acknowledgedByIncoming: boolean('acknowledged_by_incoming').default(false).notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const zoneReadinessNodes = pgTable('zone_readiness_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  zoneName: text('zone_name').notNull(),
  department: text('department').notNull(),
  technicalPass: boolean('technical_pass').default(false).notNull(),
  safetyPass: boolean('safety_pass').default(false).notNull(),
  aestheticPass: boolean('aesthetic_pass').default(false).notNull(),
  compliancePass: boolean('compliance_pass').default(false).notNull(),
  inspectorId: uuid('inspector_id').references(() => users.id).notNull(),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').default('not_ready').notNull(), // 'not_ready', 'ready_with_exceptions', 'ready'
  snags: jsonb('snags').default([]).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const bumpOutActivities = pgTable('bump_out_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  zoneName: text('zone_name').notNull(),
  activityType: text('activity_type').notNull(),
  plannedCompletion: timestamp('planned_completion', { withTimezone: true }).notNull(),
  actualCompletion: timestamp('actual_completion', { withTimezone: true }),
  status: text('status').default('scheduled').notNull(), // 'scheduled', 'in_progress', 'completed'
  safetySignoffBy: uuid('safety_signoff_by').references(() => users.id),
  safetySignoffAt: timestamp('safety_signoff_at', { withTimezone: true }),
  assetsCleared: boolean('assets_cleared').default(false).notNull(),
  hazardsIdentified: text('hazards_identified'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const assetReturnInspections = pgTable('asset_return_inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  assetId: text('asset_id').notNull(),
  manifestId: text('manifest_id').notNull(),
  conditionReceived: text('condition_received').default('pristine').notNull(), // 'pristine', 'operational_wear', 'damaged', 'missing'
  damagePhotos: jsonb('damage_photos').$type<string[]>().default([]).notNull(),
  repairCostEstimate: integer('repair_cost_estimate').default(0).notNull(),
  responsibility: text('responsibility').default('venue').notNull(), // 'client', 'contractor', 'vendor', 'venue'
  notes: text('notes'),
  inspectedBy: uuid('inspected_by').references(() => users.id).notNull(),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const claimsExposures = pgTable('claims_exposures', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  claimType: text('claim_type').notNull(), // 'venue_damage', 'vendor_late_penalty', 'client_deduction', 'asset_loss'
  description: text('description').notNull(),
  claimedAmount: integer('claimed_amount').default(0).notNull(),
  assessedExposure: integer('assessed_exposure').default(0).notNull(),
  status: text('status').default('open').notNull(), // 'open', 'under_negotiation', 'settled', 'disputed'
  settledAmount: integer('settled_amount'),
  settlementNotes: text('settlement_notes'),
  loggedBy: uuid('logged_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const operationalClosureDecisions = pgTable('operational_closure_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  decision: text('decision').notNull(), // 'operationally_closed', 'conditional_closure', 'rejected'
  checklist: jsonb('checklist').notNull(),
  openReceivablesAcknowledged: boolean('open_receivables_acknowledged').default(true).notNull(),
  signoffBy: text('signoff_by').notNull(),
  signoffRole: text('signoff_role').notNull(),
  auditHash: text('audit_hash').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});


