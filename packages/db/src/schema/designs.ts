import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, numeric } from 'drizzle-orm/pg-core';
import { organisations, users } from './identity.js';
import { projects } from './projects.js';

export const designWorkspaces = pgTable('design_workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  responsibleDepartment: text('responsible_department'),
  ownerId: uuid('owner_id').references(() => users.id),
  ownerName: text('owner_name'),
  defaultReviewers: jsonb('default_reviewers').$type<string[]>().default([]).notNull(),
  defaultClientReviewers: jsonb('default_client_reviewers').$type<string[]>().default([]).notNull(),
  defaultWorkflow: text('default_workflow').default('standard_14_step').notNull(),
  linkedZones: jsonb('linked_zones').$type<string[]>().default([]).notNull(),
  linkedLocations: jsonb('linked_locations').$type<string[]>().default([]).notNull(),
  visibility: text('visibility').default('all_members').notNull(),
  color: text('color'),
  icon: text('icon'),
  status: text('status').default('active').notNull(), // 'active', 'archived'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designs = pgTable('designs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  workspaceId: uuid('workspace_id').references(() => designWorkspaces.id, { onDelete: 'set null' }),
  designCode: text('design_code'), // e.g. "DES-DHA26-001"
  title: text('title').notNull(),
  titleAr: text('title_ar'),
  description: text('description'),
  category: text('category').notNull(), // 'moodboard', 'technical_drawing', 'floorplan', '3d_render', etc.
  assetType: text('asset_type').default('2d_design').notNull(),
  projectPhase: text('project_phase'),
  discipline: text('discipline').default('staging').notNull(),
  department: text('department'),
  ownerId: uuid('owner_id').references(() => users.id),
  ownerName: text('owner_name'),
  internalReviewerId: uuid('internal_reviewer_id').references(() => users.id),
  internalReviewerName: text('internal_reviewer_name'),
  clientReviewerId: uuid('client_reviewer_id').references(() => users.id),
  clientReviewerName: text('client_reviewer_name'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  priority: text('priority').default('medium').notNull(),
  currentVersionNumber: integer('current_version_number').default(1).notNull(),
  currentRevisionCode: text('current_revision_code').default('Rev A').notNull(),
  currentStatus: text('current_status').default('draft').notNull(), // 14-stage workflow
  approvalPurpose: text('approval_purpose').default('concept').notNull(),
  confidentiality: text('confidentiality').default('internal').notNull(),
  clientVisibility: boolean('client_visibility').default(true).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  zones: jsonb('zones').$type<string[]>().default([]).notNull(),
  locations: jsonb('locations').$type<string[]>().default([]).notNull(),
  scopePackageIds: jsonb('scope_package_ids').$type<string[]>().default([]).notNull(),
  requirementIds: jsonb('requirement_ids').$type<string[]>().default([]).notNull(),
  boqItemIds: jsonb('boq_item_ids').$type<string[]>().default([]).notNull(),
  taskIds: jsonb('task_ids').$type<string[]>().default([]).notNull(),
  productionPackageIds: jsonb('production_package_ids').$type<string[]>().default([]).notNull(),
  supplierIds: jsonb('supplier_ids').$type<string[]>().default([]).notNull(),
  relatedDesignItemIds: jsonb('related_design_item_ids').$type<string[]>().default([]).notNull(),
  externalUrl: text('external_url'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designVersions = pgTable('design_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  versionNumber: integer('version_number').notNull(),
  revisionCode: text('revision_code').default('Rev A').notNull(),
  contentHash: text('content_hash').notNull(),
  storageKey: text('storage_key').notNull(),
  title: text('title').notNull(),
  titleAr: text('title_ar'),
  revisionDescription: text('revision_description'),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  uploadedByName: text('uploaded_by_name'),
  purpose: text('purpose').default('for_review').notNull(), // 'for_review', 'for_client_approval', 'for_fabrication', etc.
  isLocked: boolean('is_locked').default(false).notNull(),
  addressedCommentIds: jsonb('addressed_comment_ids').$type<string[]>().default([]).notNull(),
  carriedForwardCommentIds: jsonb('carried_forward_comment_ids').$type<string[]>().default([]).notNull(),
  rejectedCommentIds: jsonb('rejected_comment_ids').$type<Array<{ commentId: string; reason: string }>>().default([]).notNull(),
  costImpactFlag: boolean('cost_impact_flag').default(false).notNull(),
  scheduleImpactFlag: boolean('schedule_impact_flag').default(false).notNull(),
  scopeImpactFlag: boolean('scope_impact_flag').default(false).notNull(),
  safetyImpactFlag: boolean('safety_impact_flag').default(false).notNull(),
  procurementImpactFlag: boolean('procurement_impact_flag').default(false).notNull(),
  fabricationApprovalHash: text('fabrication_approval_hash'),
  fabricationApprovedAt: timestamp('fabrication_approved_at', { withTimezone: true }),
  fabricationApprovedBy: uuid('fabrication_approved_by').references(() => users.id),
  structuralEngineerSignoff: jsonb('structural_engineer_signoff'),
  hseSignoff: jsonb('hse_signoff'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designFiles = pgTable('design_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  fileRole: text('file_role').notNull(), // 'original_source', 'review_preview', 'production_export', 'supporting_attachment'
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  storageUrl: text('storage_url').notNull(),
  storageKey: text('storage_key').notNull(),
  sha256Hash: text('sha256_hash').notNull(),
  processingState: text('processing_state').default('ready').notNull(), // 'uploading', 'uploaded', 'scanning', 'processing', 'ready', 'failed', 'quarantined'
  processingError: text('processing_error'),
  metadata: jsonb('metadata').default({}).notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const previewAssets = pgTable('preview_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').references(() => designFiles.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  assetType: text('asset_type').notNull(), // 'thumbnail', 'page_preview', 'model_view', 'video_hls'
  storageUrl: text('storage_url').notNull(),
  pageNumber: integer('page_number').default(1).notNull(),
  width: integer('width'),
  height: integer('height'),
  format: text('format').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designPagesArtboards = pgTable('design_pages_artboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  pageNumber: integer('page_number').notNull(),
  name: text('name').notNull(), // e.g. "Sheet 01 - North Elevation"
  width: numeric('width'),
  height: numeric('height'),
  scale: text('scale'), // e.g. "1:50"
  unit: text('unit').default('mm'),
  previewUrl: text('preview_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const savedViews = pgTable('saved_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  name: text('name').notNull(),
  viewType: text('view_type').notNull(), // '2d_zoom', '3d_viewpoint', 'camera'
  cameraData: jsonb('camera_data').notNull(), // { position, target, fov, zoom }
  sectionPlane: jsonb('section_plane'),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designAnnotations = pgTable('design_annotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  authorName: text('author_name'),
  pinNumber: integer('pin_number').default(1).notNull(),
  pageNumber: integer('page_number').default(1).notNull(),
  xPercent: numeric('x_percent').notNull(), // 0 - 100 normalized
  yPercent: numeric('y_percent').notNull(), // 0 - 100 normalized
  videoTimestampSec: numeric('video_timestamp_sec'),
  threeDCoordinates: jsonb('three_d_coordinates'),
  geometryType: text('geometry_type').default('point').notNull(),
  geometryData: jsonb('geometry_data').default({}).notNull(),
  title: text('title').notNull(),
  discipline: text('discipline').default('staging').notNull(),
  priority: text('priority').default('medium').notNull(), // 'low', 'medium', 'high', 'urgent'
  status: text('status').default('open').notNull(), // 'open', 'acknowledged', 'in_progress', 'ready_for_review', 'resolved', 'reopened', 'rejected', 'superseded'
  commentType: text('comment_type').default('general_comment').notNull(),
  visibility: text('visibility').default('internal_only').notNull(), // 'internal_only', 'client_visible', etc.
  assigneeId: uuid('assignee_id').references(() => users.id),
  assigneeName: text('assignee_name'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  comment: text('comment').notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolutionEvidence: text('resolution_evidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designComments = pgTable('design_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  annotationId: uuid('annotation_id').references(() => designAnnotations.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role'),
  discipline: text('discipline'),
  message: text('message').notNull(),
  visibility: text('visibility').default('internal_only').notNull(),
  attachments: jsonb('attachments').$type<Array<{ name: string; url: string; sizeBytes?: number }>>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designReviewRounds = pgTable('design_review_rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  purpose: text('purpose').notNull(),
  reviewers: jsonb('reviewers').$type<Array<{ userId: string; userName: string; role: string; isMandatory: boolean; responded: boolean; response?: string; respondedAt?: string }>>().default([]).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  instructions: text('instructions'),
  status: text('status').default('open').notNull(), // 'draft', 'scheduled', 'open', 'awaiting_reviewers', 'completed', 'cancelled', 'superseded'
  decision: text('decision'),
  completionDate: timestamp('completion_date', { withTimezone: true }),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designApprovalRequests = pgTable('design_approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  approvalPurpose: text('approval_purpose').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'approved', 'rejected', 'conditional'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designApprovalDecisions = pgTable('design_approval_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => designApprovalRequests.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  approverId: uuid('approver_id').references(() => users.id).notNull(),
  approverName: text('approver_name').notNull(),
  role: text('role').notNull(),
  decision: text('decision').notNull(), // 'approve', 'approve_with_conditions', 'request_changes', 'reject', 'acknowledge_only'
  approvalPurpose: text('approval_purpose').notNull(),
  comments: text('comments'),
  conditions: jsonb('conditions').$type<string[]>().default([]).notNull(),
  contentHash: text('content_hash').notNull(),
  digitalAcknowledgement: boolean('digital_acknowledgement').default(true).notNull(),
  structuralCertification: jsonb('structural_certification'),
  hseCertification: jsonb('hse_certification'),
  decidedAt: timestamp('decided_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designApprovalConditions = pgTable('design_approval_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: uuid('decision_id').references(() => designApprovalDecisions.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  conditionText: text('condition_text').notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id),
  status: text('status').default('pending').notNull(), // 'pending', 'in_progress', 'verified', 'waived'
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  resolutionEvidence: text('resolution_evidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designChangeRequests = pgTable('design_change_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  classification: text('classification').notNull(),
  estimatedCostDeltaQar: numeric('estimated_cost_delta_qar').default('0').notNull(),
  estimatedScheduleDeltaDays: integer('estimated_schedule_delta_days').default(0).notNull(),
  affectedRequirementIds: jsonb('affected_requirement_ids').$type<string[]>().default([]).notNull(),
  affectedScopePackageIds: jsonb('affected_scope_package_ids').$type<string[]>().default([]).notNull(),
  affectedBoqItemIds: jsonb('affected_boq_item_ids').$type<string[]>().default([]).notNull(),
  affectedTaskIds: jsonb('affected_task_ids').$type<string[]>().default([]).notNull(),
  escalateToVariation: boolean('escalate_to_variation').default(false).notNull(),
  linkedVariationId: text('linked_variation_id'),
  status: text('status').default('submitted').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designReleases = pgTable('design_releases', {
  id: uuid('id').primaryKey().defaultRandom(),
  releaseNumber: text('release_number').notNull(), // e.g. "REL-DHA26-001"
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  releasePurpose: text('release_purpose').notNull(),
  issuedBy: uuid('issued_by').references(() => users.id).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  requiredAcknowledgementDate: timestamp('required_acknowledgement_date', { withTimezone: true }).notNull(),
  notes: text('notes'),
  materialsAndFinishesNotes: text('materials_and_finishes_notes'),
  fabricationNotes: text('fabrication_notes'),
  installationNotes: text('installation_notes'),
  status: text('status').default('active').notNull(), // 'active', 'superseded', 'recalled'
  supersededByReleaseId: text('superseded_by_release_id'),
  includedFileIds: jsonb('included_file_ids').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designReleaseRecipients = pgTable('design_release_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  releaseId: uuid('release_id').references(() => designReleases.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  recipientName: text('recipient_name').notNull(),
  organization: text('organization').notNull(),
  role: text('role').notNull(), // 'internal_department', 'supplier', 'fabricator', etc.
  email: text('email'),
  adoptionStatus: text('adoption_status').default('clarification_required').notNull(), // 'adopted', 'production_started', etc.
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  notes: text('notes'),
  productionStarted: boolean('production_started').default(false).notNull(),
  productionStartDate: timestamp('production_start_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designExternalShares = pgTable('design_external_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  shareToken: text('share_token').notNull(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  versionId: uuid('version_id').references(() => designVersions.id, { onDelete: 'cascade' }),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  recipientName: text('recipient_name').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  requireOtp: boolean('require_otp').default(false).notNull(),
  otpHash: text('otp_hash'),
  canView: boolean('can_view').default(true).notNull(),
  canComment: boolean('can_comment').default(true).notNull(),
  canApprove: boolean('can_approve').default(false).notNull(),
  canDownload: boolean('can_download').default(false).notNull(),
  watermarkText: text('watermark_text'),
  accessCount: integer('access_count').default(0).notNull(),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designEntityLinks = pgTable('design_entity_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  entityType: text('entity_type').notNull(), // 'requirement', 'scope_package', 'boq_line', 'task', 'production_package', 'zone', 'location'
  entityId: text('entity_id').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const designActivityLogs = pgTable('design_activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  designId: uuid('design_id').references(() => designs.id, { onDelete: 'cascade' }).notNull(),
  versionId: text('version_id'),
  organisationId: uuid('organisation_id').references(() => organisations.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  actorId: uuid('actor_id').references(() => users.id),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role'),
  action: text('action').notNull(), // 'UPLOAD', 'MARKUP', 'COMMENT', 'REVIEW', 'APPROVE', 'RELEASE', 'ADOPT', 'ESCALATE'
  details: jsonb('details').default({}).notNull(),
  sha256Hash: text('sha256_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

