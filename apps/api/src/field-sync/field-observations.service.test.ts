import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { FieldObservationsService, validateFieldObservation } from './field-observations.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';

const org = '11111111-1111-4111-8111-111111111111', project = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333', taskId = '44444444-4444-4444-8444-444444444444';
const input = { clientOperationId: '55555555-5555-4555-8555-555555555555', deviceId: '66666666-6666-4666-8666-666666666666',
  capturedAt: '2026-09-26T09:30:00+03:00', note: 'The equipment cover needs a second look.', reason: 'Routine field observation' };
const req = (key = 'field-http-key') => ({ headers: { 'idempotency-key': key, 'x-user-role': 'super_admin', 'x-audience': 'internal' } }) as any;
afterEach(() => vi.restoreAllMocks());

function harness() {
  const observations: any[] = [], receipts: any[] = [], audits: any[] = [], outbox: any[] = [];
  const tasks = [{ id: taskId, organisation_id: org, project_id: project, assignee_id: actor, row_version: 3, is_completed: false, state: 'planned' }];
  const access = { organisationId: org, userId: actor, membershipId: '77777777-7777-4777-8777-777777777777', role: 'field_supervisor', audience: 'internal', project: { id: project }, accessLevel: 'editor', isSuperAdmin: false };
  const tx = { query: vi.fn(async (sql: string, params: any[] = []) => {
    if (sql.startsWith('SELECT id,row_version,assignee_id')) return { rows: tasks.filter(t => t.id === params[0] && t.organisation_id === params[1] && t.project_id === params[2]) };
    if (sql.startsWith('SELECT actor_id,operation')) return { rows: receipts.filter(r => r.org === params[0] && r.key === params[1]) };
    if (sql.includes('FROM field_observations WHERE organisation_id')) return { rows: observations.filter(o => o.organisation_id === params[0] && o.actor_id === params[1] && o.client_operation_id === params[2]) };
    if (sql.startsWith('SELECT clock_timestamp')) return { rows: [{ received_at: '2026-09-26T10:00:00.000Z' }] };
    if (sql.startsWith('INSERT INTO audit_events')) { audits.push(params); return { rows: [] }; }
    if (sql.startsWith('INSERT INTO outbox')) { outbox.push(JSON.parse(params[3])); return { rows: [] }; }
    if (sql.startsWith('INSERT INTO field_observations')) {
      const [id, organisation_id, project_id, actor_id, client_operation_id, device_id, captured_at, received_at, task_id, base_version, current_task_version, note, reason, payload_hash, status, audit_event_id, event_id] = params;
      const row = { id, organisation_id, project_id, actor_id, client_operation_id, device_id, captured_at, received_at, task_id, base_version, current_task_version, note, reason, payload_hash, status, audit_event_id, event_id };
      observations.push(row); return { rows: [row] };
    }
    if (sql.startsWith('INSERT INTO idempotency_records')) { receipts.push({ org: params[0], actor_id: params[1], key: params[2], operation: params[3], request_hash: params[4], response_body: JSON.parse(params[5]) }); return { rows: [] }; }
    if (sql.startsWith('SELECT o.*')) return { rows: observations.filter(o => o.organisation_id === params[0] && o.project_id === params[1] && (!params[2] || (o.actor_id === params[3] && (!o.task_id || tasks.some(t => t.id === o.task_id && t.assignee_id === params[3]))))).slice(0, 201) };
    if (sql.startsWith('SELECT * FROM field_observations WHERE id=')) return { rows: observations.filter(o => o.id === params[0] && o.organisation_id === params[1] && o.project_id === params[2]) };
    return { rows: [] };
  }) };
  const scope = vi.spyOn(ProjectAccessService.prototype, 'withAccess').mockImplementation(async (_req, _reference, _options, callback) => callback(tx as any, access as any));
  return { service: new FieldObservationsService({} as any), observations, receipts, audits, outbox, tasks, access, tx, scope };
}

describe('Field observation input boundary', () => {
  it('normalizes metadata while retaining the explicit client time basis', () => {
    expect(validateFieldObservation({ ...input, note: `  ${input.note}  ` })).toMatchObject({
      capturedAt: '2026-09-26T06:30:00.000Z', note: input.note, taskId: null, baseVersion: null,
    });
  });
  it.each([
    { capturedAt: '2026-09-26T09:30:00' }, { capturedAt: '2026-02-30T09:30:00Z' }, { capturedAt: 'not-a-time' },
    { clientOperationId: 'invalid' }, { deviceId: 'invalid' }, { note: ' ' }, { note: 'x'.repeat(2001) }, { reason: '' },
    { note: 'contains\0null' }, { baseVersion: 1 }, { taskId, baseVersion: 0 }, { taskId, baseVersion: 2147483648 },
    { taskId, baseVersion: 1.5 }, { userId: actor }, { organisationId: org }, { status: 'approved' },
    { incidentDetails: 'restricted' }, { files: ['photo.jpg'] }, { isCompleted: true }, { mediaType: 'photo' },
  ])('rejects unsupported or invalid observation input %j', (override) => {
    expect(() => validateFieldObservation({ ...input, ...override })).toThrow(HttpException);
  });
  it('accepts an optional task with no base version without inventing one', () => {
    expect(validateFieldObservation({ ...input, taskId })).toMatchObject({ taskId, baseVersion: null });
  });
});

describe('Field operation receipts and provenance', () => {
  it('commits one append-only observation, audit and outbox with no task mutation or note leakage into the outbox', async () => {
    const h = harness(), result = await h.service.create(project, input, req());
    expect(result.data).toMatchObject({ actorId: actor, projectId: project, status: 'accepted', note: input.note, reason: input.reason,
      receivedAt: '2026-09-26T10:00:00.000Z', capturedAt: '2026-09-26T06:30:00.000Z', clientTimestampClaimed: true, deviceIdClaimed: true, authorityEffect: 'observation_only' });
    expect(result.data.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(h.observations).toHaveLength(1); expect(h.audits).toHaveLength(1); expect(h.outbox).toHaveLength(1); expect(h.receipts).toHaveLength(1);
    expect(h.outbox[0]).not.toHaveProperty('note'); expect(h.outbox[0]).not.toHaveProperty('reason');
    expect(h.outbox[0].payloadHash).toBe(result.data.payloadHash);
    expect(h.tx.query.mock.calls.some(([sql]) => /^UPDATE /i.test(sql))).toBe(false);
    expect(h.scope.mock.calls[0][2]).toMatchObject({ level: 'editor', audiences: ['internal'], permissions: ['projects.manage', 'operations.manage', 'field.inspect'] });
  });
  it('deduplicates the operation across same and different transport keys without duplicate business effects', async () => {
    const h = harness(), first = await h.service.create(project, input, req());
    expect(await h.service.create(project, input, req())).toEqual(first);
    expect(await h.service.create(project, input, req('replacement-key'))).toEqual(first);
    expect(h.observations).toHaveLength(1); expect(h.audits).toHaveLength(1); expect(h.outbox).toHaveLength(1);
    expect(h.receipts).toHaveLength(2);
  });
  it('rejects a changed payload using the same operation ID even with a new HTTP key', async () => {
    const h = harness(); await h.service.create(project, input, req());
    await expect(h.service.create(project, { ...input, note: 'Changed note' }, req('new-key'))).rejects.toMatchObject({ status: 409 });
    await expect(h.service.create(project, { ...input, clientOperationId: '88888888-8888-4888-8888-888888888888' }, req())).rejects.toMatchObject({ status: 409 });
    expect(h.observations).toHaveLength(1);
  });
  it('binds the operation to its project while permitting the same client operation ID for a different actor', async () => {
    const h = harness(); await h.service.create(project, input, req());
    h.access.project.id = '88888888-8888-4888-8888-888888888888';
    await expect(h.service.create(h.access.project.id, input, req('another-project-key'))).rejects.toMatchObject({ status: 409 });
    h.access.project.id = project; h.access.userId = '99999999-9999-4999-8999-999999999999';
    const independent = await h.service.create(project, input, req('another-actor-key'));
    expect(independent.data.actorId).toBe(h.access.userId); expect(h.observations).toHaveLength(2);
  });
  it('preserves a stale fact as a conflict observation without changing current task state', async () => {
    const h = harness(), before = structuredClone(h.tasks);
    const body = { ...input, taskId, baseVersion: 1 };
    const result = await h.service.create(project, body, req());
    expect(result.data).toMatchObject({ status: 'accepted_as_observation_with_conflict', baseVersion: 1, currentTaskVersion: 3, authorityEffect: 'observation_only' });
    expect(h.tasks).toEqual(before);
    h.tasks[0].row_version = 4;
    expect(await h.service.create(project, body, req('later-retry'))).toEqual(result);
  });
  it('accepts a current base version and keeps timestamp order separate from authority', async () => {
    const h = harness();
    const result = await h.service.create(project, { ...input, taskId, baseVersion: 3, capturedAt: '2090-01-01T00:00:00Z' }, req());
    expect(result.data.status).toBe('accepted');
    expect(result.data.clientTimestampClaimed).toBe(true);
    expect(result.data.receivedAt).toBe('2026-09-26T10:00:00.000Z');
  });
  it('rechecks current task assignment before returning either kind of retry receipt', async () => {
    const h = harness(), body = { ...input, taskId, baseVersion: 3 };
    await h.service.create(project, body, req());
    h.tasks[0].assignee_id = '99999999-9999-4999-8999-999999999999';
    await expect(h.service.create(project, body, req())).rejects.toMatchObject({ status: 404 });
    await expect(h.service.create(project, body, req('new-transport-key'))).rejects.toMatchObject({ status: 404 });
    expect(h.receipts).toHaveLength(1);
  });
  it('rejects cross-project task references even when the request contains valid-looking identifiers', async () => {
    const h = harness(); h.tasks[0].project_id = '99999999-9999-4999-8999-999999999999';
    await expect(h.service.create(project, { ...input, taskId }, req())).rejects.toMatchObject({ status: 404 });
    expect(h.observations).toHaveLength(0); expect(h.audits).toHaveLength(0);
  });
});

describe('Field observation reads', () => {
  it('limits field workers to their own observations and currently assigned task scope', async () => {
    const h = harness();
    const unlinked = await h.service.create(project, input, req());
    const linked = await h.service.create(project, { ...input, clientOperationId: '88888888-8888-4888-8888-888888888888', taskId }, req('linked'));
    h.access.userId = '99999999-9999-4999-8999-999999999999';
    const other = await h.service.create(project, { ...input, clientOperationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, req('other-actor'));
    h.access.userId = actor; h.tasks[0].assignee_id = other.data.actorId;
    const listed = await h.service.list(project, req());
    expect(listed.data.map(row => row.id)).toEqual([unlinked.data.id]);
    await expect(h.service.get(project, other.data.id, req())).rejects.toMatchObject({ status: 404 });
    await expect(h.service.get(project, linked.data.id, req())).rejects.toMatchObject({ status: 404 });
    expect((await h.service.get(project, unlinked.data.id, req())).data).toEqual(unlinked.data);
  });
  it('reports capture unavailable on viewer grants and bounds lists to 200 receipts', async () => {
    const h = harness(); const original = await h.service.create(project, input, req());
    for (let i = 0; i < 205; i++) h.observations.push({ ...h.observations[0], id: `fixture-${i}` });
    h.access.accessLevel = 'viewer';
    const listed = await h.service.list(project, req());
    expect(listed.data).toHaveLength(200);
    expect(listed.meta).toMatchObject({ limit: 200, truncated: true, capabilities: { canCapture: false } });
    expect(listed.data[0].id).toBe(original.data.id);
    expect(h.scope.mock.calls.at(-1)?.[2]).toMatchObject({ level: 'viewer', audiences: ['internal'] });
  });
});
