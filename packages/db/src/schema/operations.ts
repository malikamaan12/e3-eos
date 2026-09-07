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
