import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workerQualifications = pgTable('worker_qualifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  workerId: uuid('worker_id').references(() => users.id).notNull(),
  qualificationType: text('qualification_type').notNull(),
  certificateNumber: text('certificate_number').notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'revoked'
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revocationReason: text('revocation_reason'),
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
  title: text('title').notNull(),
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  operationalImpact: text('operational_impact').notNull(),
  restrictedPersonalNarrative: text('restricted_personal_narrative'),
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

