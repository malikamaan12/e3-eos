import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { ReportingController } from './reporting.controller.js';
import { ReportingService, buildProjectSnapshot, reportDate, validateReportCreate, validateReportRevision } from './reporting.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';

const org = '11111111-1111-4111-8111-111111111111', projectId = '22222222-2222-4222-8222-222222222222';
const now = '2026-09-26T10:00:00.000Z';
const project = { id: projectId, project_code: 'REPORT-TEST', title: 'Stored project', description: 'Stored description', maturity: 'developing', outcome: 'undetermined', row_version: 7, updated_at: now,
  metadata: { financialAssumptions: { estimatedCost: '900000' }, restrictedNotes: 'Not a report source' } };
const input = { reportCode: 'REP-001', periodStart: '2026-09-01', periodEnd: '2026-09-30', reason: 'Review project records' };
const request = (key = 'report-test-create') => ({ organisationId: org, headers: { 'idempotency-key': key, 'x-audience': 'client_portal' } }) as any;
afterEach(() => vi.restoreAllMocks());

function harness() {
  const reports: any[] = [], receipts: any[] = [], events: any[] = [];
  const access = { organisationId: org, userId: '33333333-3333-4333-8333-333333333333', membershipId: '44444444-4444-4444-8444-444444444444', role: 'project_manager', audience: 'internal', project: { ...project }, accessLevel: 'editor', isSuperAdmin: false };
  const tx = { query: vi.fn(async (sql: string, params: any[] = []) => {
    if (sql.startsWith('SELECT actor_id')) return { rows: receipts.filter((row) => row.key === params[1]) };
    if (sql.startsWith('INSERT INTO idempotency_records')) { receipts.push({ actor_id: params[1], key: params[2], operation: params[3], request_hash: params[4], response_body: JSON.parse(params[5]) }); return { rows: [] }; }
    if (sql.startsWith('INSERT INTO outbox')) { events.push(params); return { rows: [] }; }
    if (sql.includes('lower(report_code)')) return { rows: reports.filter((row) => row.report_code.toLowerCase() === params[2].toLowerCase() && row.version === 1) };
    if (sql.includes('jsonb_agg')) return { rows: [{ as_of: now, stages: [{ id: 'stage-source', stage_number: 1, stage_name: 'Plan', status: 'in_progress', progress_percent: 25, updated_at: now }], activities: [{ id: 'activity-source', status: 'completed', updated_at: now }] }] };
    if (sql.startsWith('INSERT INTO project_report_snapshots')) {
      const [id, organisation_id, project_id, root_report_id, report_code, version, period_start, period_end, data_as_of, content_hash, snapshot, revision_reason, supersedes_id, created_by] = params;
      const row = { id, organisation_id, project_id, root_report_id, report_code, version, period_start, period_end, data_as_of, content_hash, snapshot: JSON.parse(snapshot), revision_reason, supersedes_id, created_by, created_at: now };
      reports.push(row); return { rows: [row] };
    }
    if (sql.includes('SELECT DISTINCT ON')) {
      const latest = [...reports].reverse().filter((row, i, all) => all.findIndex((other) => other.root_report_id === row.root_report_id) === i);
      return { rows: latest };
    }
    if (sql.startsWith('SELECT id,version FROM project_report_snapshots')) return { rows: reports.filter((row) => row.root_report_id === params[2]).sort((a, b) => b.version - a.version).slice(0, 1) };
    if (sql.includes('FROM project_report_snapshots') && sql.includes('root_report_id=$3')) return { rows: reports.filter((row) => row.root_report_id === params[2]).sort((a, b) => a.version - b.version) };
    if (sql.includes('FROM project_report_snapshots') && sql.includes('id=$3')) return { rows: reports.filter((row) => row.id === params[2] && row.project_id === params[1] && row.organisation_id === params[0]) };
    return { rows: [] };
  }) };
  const scope = vi.spyOn(ProjectAccessService.prototype, 'withAccess').mockImplementation(async (_req, _reference, _options, callback) => callback(tx as any, access as any));
  return { service: new ReportingService({} as any), reports, receipts, events, access, tx, scope };
}

describe('Controlled report input and source integrity', () => {
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-09-26T00:00:00Z', '1899-12-31', '', null])('rejects invalid or unsupported calendar date %s', (value) => {
    expect(() => reportDate(value)).toThrow(HttpException);
  });
  it('accepts leap dates and normalizes metadata without changing the period', () => {
    expect(reportDate('2024-02-29')).toBe('2024-02-29');
    expect(validateReportCreate({ ...input, reportCode: ' REP-001 ' })).toMatchObject({ reportCode: 'REP-001', periodStart: '2026-09-01' });
  });
  it('rejects a reversed period, forged snapshots and client publication', () => {
    expect(() => validateReportCreate({ ...input, periodEnd: '2026-08-31' })).toThrow();
    expect(() => validateReportCreate({ ...input, snapshotData: { financials: { actualCost: '10' } } })).toThrow();
    expect(() => validateReportCreate({ ...input, targetAudience: 'client_portal' })).toThrow();
  });
  it('requires a revision version and rejects directly supplied corrected facts', () => {
    expect(() => validateReportRevision({ reason: 'Correction' })).toThrow();
    expect(() => validateReportRevision({ expectedVersion: 0, reason: 'Correction' })).toThrow();
    expect(() => validateReportRevision({ expectedVersion: 1, reason: 'Correction', revisedActualCost: '10' })).toThrow();
  });
  it('snapshots explicit record state and lineage without copying project metadata or inventing money', () => {
    const source = { ...project };
    const snapshot = buildProjectSnapshot(source, [], [{ id: 'x', status: 'unknown-status', updated_at: now }], now);
    source.title = 'Later update';
    expect(snapshot.project.title).toBe('Stored project');
    expect(snapshot.activityCounts).toMatchObject({ total: 1, completed: 0, other: 1 });
    expect(snapshot.sourceManifest).toContainEqual({ type: 'project', id: projectId, version: 7, updatedAt: now });
    expect(snapshot).not.toHaveProperty('financials');
    expect(JSON.stringify(snapshot)).not.toContain('900000');
    expect(JSON.stringify(snapshot)).not.toContain('restrictedNotes');
    expect(snapshot.limitations.join(' ')).toContain('not period-filtered');
  });
});

describe('Durable report service commands', () => {
  it('creates a draft from stored sources, ignores forged audience headers and returns a stable retry receipt', async () => {
    const h = harness();
    const created = await h.service.create(projectId, input, request());
    const replay = await h.service.create(projectId, input, request());
    expect(created.data).toMatchObject({ version: 1, status: 'draft', targetAudience: 'internal_command', canRevise: true });
    expect(created.data.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.data.snapshot.project.title).toBe('Stored project');
    expect(created.data.snapshot.activityCounts.completed).toBe(1);
    expect(replay).toEqual(created);
    expect(h.reports).toHaveLength(1);
    expect(h.receipts).toHaveLength(1);
    expect(h.events).toHaveLength(1);
    expect(h.scope.mock.calls[0][2]).toMatchObject({ level: 'editor', audiences: ['internal'], permissions: ['projects.manage'] });
  });
  it('rejects idempotency key reuse for changed metadata and duplicate codes with a new key', async () => {
    const h = harness();
    await h.service.create(projectId, input, request());
    await expect(h.service.create(projectId, { ...input, reason: 'Different' }, request())).rejects.toMatchObject({ status: 409 });
    await expect(h.service.create(projectId, { ...input, reportCode: 'rep-001' }, request('other-key'))).rejects.toMatchObject({ status: 409 });
    expect(h.reports).toHaveLength(1);
  });
  it('keeps old versions immutable while a new revision captures current canonical records', async () => {
    const h = harness(), created = await h.service.create(projectId, input, request());
    h.access.project.title = 'Updated stored project'; h.access.project.row_version = 8;
    const revised = await h.service.revise(projectId, created.data.id, { expectedVersion: 1, reason: 'Project updated' }, request('revision-key'));
    expect(revised.data).toMatchObject({ version: 2, rootReportId: created.data.id, supersedesId: created.data.id, status: 'draft' });
    expect(revised.data.snapshot.project.title).toBe('Updated stored project');
    expect(revised.data.contentHash).not.toBe(created.data.contentHash);
    expect(revised.data.history).toHaveLength(2);
    const old = await h.service.get(projectId, created.data.id, request());
    expect(old.data.snapshot.project.title).toBe('Stored project');
    expect(old.data.version).toBe(1);
    expect(old.data.canRevise).toBe(false);
    await expect(h.service.revise(projectId, created.data.id, { expectedVersion: 1, reason: 'Stale' }, request('stale-key'))).rejects.toMatchObject({ status: 409 });
    const listed = await h.service.list(projectId, request());
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].version).toBe(2);
  });
  it('does not report create capability for a viewer grant and always uses internal read authorization', async () => {
    const h = harness(); h.access.accessLevel = 'viewer';
    const result = await h.service.list(projectId, request());
    expect(result.meta.capabilities).toEqual({ canCreateSnapshot: false, canReviseSnapshot: false, canPublish: false });
    expect(h.scope.mock.calls[0][2]).toMatchObject({ level: 'viewer', audiences: ['internal'], permissions: ['projects.manage', 'portfolio.read'] });
  });
  it('returns no report for an unknown immutable version', async () => {
    const h = harness();
    await expect(h.service.get(projectId, '55555555-5555-4555-8555-555555555555', request())).rejects.toMatchObject({ status: 404 });
  });
});

describe('Unavailable release workflows', () => {
  it('fails closed for publishing, settlement and unsaved lessons', () => {
    const controller = new ReportingController({} as any);
    for (const operation of [() => controller.publishReport(), () => controller.recordClosureDecision(), () => controller.captureLesson()]) {
      expect(operation).toThrow(HttpException);
      try { operation(); } catch (error) { expect((error as HttpException).getStatus()).toBe(503); }
    }
  });
});
