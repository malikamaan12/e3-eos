import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { hasRolePermission } from '@e3-eos/domain';
import { DbService } from '../common/db.service.js';
import { DurableProjectCommand } from '../projects/durable-project-command.js';
import { ProjectAccessService, type ProjectAccessContext, type ProjectAccessTransaction } from '../projects/project-access.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const readAccess = { level: 'viewer' as const, audiences: ['internal'] as Array<'internal'>, permissions: ['projects.manage', 'portfolio.read'] };
const writeAccess = { level: 'editor' as const, audiences: ['internal'] as Array<'internal'>, permissions: ['projects.manage'] };
const fail = (code: string, detail: string, status = 400): never => { throw new HttpException({ code, detail }, status); };
const iso = (value: any): string => new Date(value).toISOString();
const dateOnly = (value: any): string => typeof value === 'string' ? value.slice(0, 10) : iso(value).slice(0, 10);

export function reportDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value || value < '1900-01-01') {
    fail('REPORT_PERIOD_INVALID', 'Report dates must be valid calendar dates in YYYY-MM-DD format from 1900 onward.');
  }
  return value as string;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail('VALIDATION_ERROR', `${label} must contain 1–${max} characters.`);
  return (value as string).trim();
}
function id(value: string) { if (!UUID.test(value)) fail('VALIDATION_ERROR', 'A valid report UUID is required.'); return value; }
function only(body: any, keys: string[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !keys.includes(key))) {
    fail('REPORT_INPUT_UNSUPPORTED', 'Only report metadata is accepted. Report facts are captured from canonical project records.');
  }
}
export function validateReportCreate(body: any) {
  only(body, ['reportCode', 'periodStart', 'periodEnd', 'reason', 'targetAudience']);
  if (body.targetAudience !== undefined && body.targetAudience !== 'internal_command') fail('REPORT_AUDIENCE_UNAVAILABLE', 'Only internal draft reports are currently supported. Client publication requires a separately approved publication path.');
  const periodStart = reportDate(body.periodStart), periodEnd = reportDate(body.periodEnd);
  if (periodStart > periodEnd) fail('REPORT_PERIOD_INVALID', 'Report start date must be on or before its end date.');
  return { reportCode: text(body.reportCode, 'Report code', 80), periodStart, periodEnd, reason: text(body.reason, 'Reason', 2000), targetAudience: 'internal_command' as const };
}
export function validateReportRevision(body: any) {
  only(body, ['expectedVersion', 'reason']);
  if (!Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1) fail('VALIDATION_ERROR', 'A positive expectedVersion is required.');
  return { expectedVersion: body.expectedVersion as number, reason: text(body.reason, 'Revision reason', 2000) };
}

export const REPORT_LIMITATIONS = [
  'Internal draft only. No client publication, approval, acceptance or project closure is implied.',
  'Project, stage and activity states are captured as of the snapshot time. The selected report period is a label; these states are not period-filtered performance measures.',
  'Financial, attendance, marketing and satisfaction figures are unavailable in this snapshot; no values are inferred.',
  'Stage progress and completion are recorded project states, not independently verified acceptance or readiness.',
];

export function buildProjectSnapshot(project: any, stages: any[], activities: any[], asOf: string) {
  return {
    definitionVersion: 'project-record-snapshot.v1' as const,
    asOf,
    project: { id: project.id, projectCode: project.project_code, title: project.title, description: project.description,
      maturity: project.maturity, outcome: project.outcome, rowVersion: project.row_version, updatedAt: iso(project.updated_at) },
    stages: stages.map((stage) => ({ id: stage.id, stageNumber: stage.stage_number, stageName: stage.stage_name,
      status: stage.status, progressPercent: stage.progress_percent, updatedAt: iso(stage.updated_at) })),
    activityCounts: { total: activities.length, completed: activities.filter((a) => a.status === 'completed').length,
      inProgress: activities.filter((a) => a.status === 'in_progress').length, blocked: activities.filter((a) => a.status === 'blocked').length,
      notStarted: activities.filter((a) => a.status === 'not_started').length,
      other: activities.filter((a) => !['completed', 'in_progress', 'blocked', 'not_started'].includes(a.status)).length },
    sourceManifest: [
      { type: 'project', id: project.id, version: project.row_version, updatedAt: iso(project.updated_at) },
      ...stages.map((row) => ({ type: 'project_stage', id: row.id, updatedAt: iso(row.updated_at) })),
      ...activities.map((row) => ({ type: 'project_activity', id: row.id, updatedAt: iso(row.updated_at) })),
    ],
    limitations: [...REPORT_LIMITATIONS],
  };
}

export class ReportingService {
  private readonly access: ProjectAccessService;
  private readonly commands: DurableProjectCommand;
  constructor(db: DbService) { this.access = new ProjectAccessService(db); this.commands = new DurableProjectCommand(db); }

  private summary(row: any) {
    return { id: row.id, rootReportId: row.root_report_id, projectId: row.project_id,
      projectCode: row.snapshot.project.projectCode, projectTitle: row.snapshot.project.title,
      reportCode: row.report_code, version: row.version, status: 'draft' as const, targetAudience: 'internal_command' as const,
      periodStart: dateOnly(row.period_start), periodEnd: dateOnly(row.period_end), asOf: iso(row.data_as_of),
      contentHash: row.content_hash, createdAt: iso(row.created_at), createdBy: row.created_by,
      revisionReason: row.revision_reason, supersedesId: row.supersedes_id };
  }
  private canWrite(access: ProjectAccessContext) { return access.accessLevel === 'editor' && hasRolePermission(access.role, 'projects.manage', access.isSuperAdmin); }
  private async detail(tx: ProjectAccessTransaction, org: string, row: any, canWrite = false) {
    const history = await tx.query('SELECT * FROM project_report_snapshots WHERE organisation_id=$1 AND project_id=$2 AND root_report_id=$3 ORDER BY version', [org, row.project_id, row.root_report_id]);
    return { ...this.summary(row), canRevise: canWrite && history.rows[history.rows.length - 1]?.id === row.id,
      snapshot: row.snapshot, history: history.rows.map((entry) => this.summary(entry)) };
  }
  async list(projectId: string, req: Request) {
    return this.access.withAccess(req, projectId, readAccess, async (tx, access) => {
      const rows = await tx.query(`SELECT * FROM (SELECT DISTINCT ON(root_report_id) * FROM project_report_snapshots
        WHERE organisation_id=$1 AND project_id=$2 ORDER BY root_report_id,version DESC) latest ORDER BY created_at DESC,id`, [access.organisationId, access.project.id]);
      const canWrite = this.canWrite(access);
      return { data: rows.rows.map((row) => ({ ...this.summary(row), canRevise: canWrite })),
        meta: { capabilities: { canCreateSnapshot: canWrite, canReviseSnapshot: canWrite, canPublish: false } } };
    });
  }
  async get(projectId: string, reportId: string, req: Request) {
    id(reportId);
    return this.access.withAccess(req, projectId, readAccess, async (tx, access) => {
      const row = (await tx.query('SELECT * FROM project_report_snapshots WHERE organisation_id=$1 AND project_id=$2 AND id=$3', [access.organisationId, access.project.id, reportId])).rows[0];
      if (!row) fail('REPORT_NOT_FOUND', 'Report is unavailable in this project.', 404);
      return { data: await this.detail(tx, access.organisationId, row, this.canWrite(access)) };
    });
  }
  async create(projectId: string, body: any, req: Request) {
    const input = validateReportCreate(body);
    return this.commands.run(req, projectId, { ...writeAccess, operation: 'POST /projects/:projectId/reports', action: 'report.created', targetType: 'project_report', input }, async (tx, access) => {
      const duplicate = await tx.query('SELECT id FROM project_report_snapshots WHERE organisation_id=$1 AND project_id=$2 AND lower(report_code)=lower($3) AND version=1', [access.organisationId, access.project.id, input.reportCode]);
      if (duplicate.rows.length) fail('REPORT_CODE_EXISTS', 'This project already has that report code. Open it and create a revision.', 409);
      return this.capture(tx, access, { ...input, id: randomUUID(), version: 1 });
    });
  }
  async revise(projectId: string, reportId: string, body: any, req: Request) {
    id(reportId); const input = validateReportRevision(body);
    return this.commands.run(req, projectId, { ...writeAccess, operation: `POST /projects/:projectId/reports/${reportId}/revisions`, action: 'report.revised', targetType: 'project_report', input }, async (tx, access) => {
      const row = (await tx.query('SELECT * FROM project_report_snapshots WHERE organisation_id=$1 AND project_id=$2 AND id=$3', [access.organisationId, access.project.id, reportId])).rows[0];
      if (!row) fail('REPORT_NOT_FOUND', 'Report is unavailable in this project.', 404);
      const latest = (await tx.query('SELECT id,version FROM project_report_snapshots WHERE organisation_id=$1 AND project_id=$2 AND root_report_id=$3 ORDER BY version DESC LIMIT 1', [access.organisationId, access.project.id, row.root_report_id])).rows[0];
      if (latest.id !== reportId || latest.version !== input.expectedVersion) fail('REPORT_VERSION_CONFLICT', 'A newer report version exists. Refresh and revise the latest version using a new command key.', 409);
      return this.capture(tx, access, { id: randomUUID(), rootReportId: row.root_report_id, supersedesId: reportId,
        reportCode: row.report_code, periodStart: dateOnly(row.period_start), periodEnd: dateOnly(row.period_end),
        reason: input.reason, version: latest.version + 1 });
    });
  }
  private async capture(tx: ProjectAccessTransaction, access: ProjectAccessContext, input: {
    id: string; rootReportId?: string; supersedesId?: string; reportCode: string; periodStart: string; periodEnd: string; reason: string; version: number;
  }) {
    // One SQL statement reads all child source rows from one database snapshot.
    const source = (await tx.query(`SELECT clock_timestamp() AS as_of,
      COALESCE((SELECT jsonb_agg(s ORDER BY s.stage_number,s.id) FROM project_stage_instances s WHERE s.organisation_id=$1 AND s.project_id=$2),'[]'::jsonb) AS stages,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'status',a.status,'updated_at',a.updated_at) ORDER BY a.activity_code,a.id)
        FROM project_stage_activities a WHERE a.organisation_id=$1 AND a.project_id=$2),'[]'::jsonb) AS activities`, [access.organisationId, access.project.id])).rows[0];
    const asOf = iso(source.as_of), snapshot = buildProjectSnapshot(access.project, source.stages, source.activities, asOf);
    const contentHash = createHash('sha256').update(JSON.stringify({ reportCode: input.reportCode, periodStart: input.periodStart, periodEnd: input.periodEnd, snapshot })).digest('hex');
    const row = (await tx.query(`INSERT INTO project_report_snapshots(id,organisation_id,project_id,root_report_id,report_code,version,period_start,period_end,data_as_of,content_hash,snapshot,revision_reason,supersedes_id,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14) RETURNING *`, [input.id, access.organisationId, access.project.id,
      input.rootReportId || input.id, input.reportCode, input.version, input.periodStart, input.periodEnd, asOf, contentHash, JSON.stringify(snapshot), input.reason, input.supersedesId || null, access.userId])).rows[0];
    return { id: input.id, version: input.version, data: await this.detail(tx, access.organisationId, row, true),
      event: { rootReportId: row.root_report_id, reason: input.reason, contentHash, targetAudience: 'internal_command', asOf,
        periodStart: input.periodStart, periodEnd: input.periodEnd, supersedesId: input.supersedesId || null } };
  }
}
