import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkService } from './work/work.service.js';
import { WorkController, taskRepository } from './work/work.controller.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const PROJECT = '22222222-2222-4222-8222-222222222222';
const OTHER_PROJECT = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
const MEMBER = '55555555-5555-4555-8555-555555555555';
const PACKAGE = '66666666-6666-4666-8666-666666666666';
const TASK = '77777777-7777-4777-8777-777777777777';
const req = (key = 'work-command-1') => ({
  organisationId: ORG, method: 'POST', url: '/projects/project/tasks',
  headers: { authorization: 'Bearer work-session', 'idempotency-key': key },
}) as any;

/** Transactional adapter double: exercise real scope checks and the durable receipt runner. */
function harness() {
  let state = { packages: [] as any[], tasks: [] as any[], receipts: [] as any[], audits: [] as any[], outbox: [] as any[] };
  let snapshot: typeof state;
  const live = { role: 'project_manager', audience: 'internal', grant: 'editor', active: true, targetActive: true, failOutbox: false, isSuperAdmin: false };
  const queries: Array<{ sql: string; values: any[] }> = [];
  const tx = { release: vi.fn(), query: vi.fn(async (sql: string, values: any[] = []) => {
    const q = sql.replace(/\s+/g, ' ').trim(); queries.push({ sql: q, values });
    const rows = (result: any[] = []) => ({ rows: result, rowCount: result.length });
    if (q === 'BEGIN') { snapshot = structuredClone(state); return rows(); }
    if (q === 'COMMIT') return rows();
    if (q === 'ROLLBACK') { state = snapshot; return rows(); }
    if (q.startsWith('SELECT set_config')) return rows();
    if (q.startsWith('SELECT id FROM organisations')) return rows([{ id: ORG }]);
    if (q.includes('FROM sessions s JOIN users')) return rows(live.active ? [{ user_id: USER, membership_id: MEMBER, role: live.role, audience: live.audience, is_super_admin: live.isSuperAdmin }] : []);
    if (q.startsWith('SELECT p.*,g.access_level FROM projects')) return rows(live.grant && values[0] === ORG && values[1] === PROJECT ? [{ id: PROJECT, organisation_id: ORG, access_level: live.grant }] : []);
    if (q.startsWith('SELECT actor_id,operation,request_hash,response_body FROM idempotency_records')) return rows(state.receipts.filter(r => r.organisation_id === values[0] && r.key === values[1]));
    if (q.startsWith('SELECT m.role FROM memberships')) return rows(live.targetActive && values[1] === USER ? [{ role: live.role }] : []);
    if (q.startsWith('INSERT INTO work_packages')) {
      const row = { id: values[0], organisation_id: values[1], project_id: values[2], stage_instance_id: values[3], name: values[4], owner_id: values[5], status: 'active', acceptance_state: 'pending', row_version: 1, created_at: new Date(), updated_at: new Date() };
      state.packages.push(row); return rows([row]);
    }
    if (q.startsWith('SELECT * FROM work_packages')) return rows(state.packages.filter(p => p.id === values[0] && p.organisation_id === values[1] && p.project_id === values[2]));
    if (q.startsWith('INSERT INTO task_instances')) {
      const row = { id: values[0], package_id: values[1], organisation_id: values[2], project_id: values[3], title: values[4], assignee_id: values[5], state: 'planned', is_completed: false, row_version: 1, created_at: new Date(), updated_at: new Date() };
      state.tasks.push(row); return rows([row]);
    }
    if (q.startsWith('SELECT t.*,p.acceptance_state')) {
      const task = state.tasks.find(t => t.id === values[0] && t.organisation_id === values[1] && t.project_id === values[2]);
      const pkg = task && state.packages.find(p => p.id === task.package_id && p.organisation_id === task.organisation_id && p.project_id === task.project_id);
      return rows(task && pkg ? [{ ...task, acceptance_state: pkg.acceptance_state, package_status: pkg.status }] : []);
    }
    if (q.startsWith('UPDATE task_instances')) {
      const task = state.tasks.find(t => t.id === values[0] && t.organisation_id === values[1] && t.project_id === values[2]);
      Object.assign(task, { state: 'completed', is_completed: true, completed_at: new Date(), completed_by: values[3], completion_evidence: values[4], row_version: task.row_version + 1, updated_at: new Date() });
      return rows([task]);
    }
    if (q.startsWith('SELECT t.*,u.name AS assignee_name')) return rows(state.tasks.filter(t => t.organisation_id === values[0] && t.project_id === values[1] && (!values[2] || t.assignee_id === values[3])));
    if (q.startsWith('SELECT p.*,u.name AS owner_name')) return rows(state.packages.filter(p => p.organisation_id === values[0] && p.project_id === values[1] && (!values[2] || state.tasks.some(t => t.package_id === p.id && t.assignee_id === values[3]))));
    if (q.startsWith('SELECT payload_digest FROM audit_events')) return rows(state.audits.slice(-1));
    if (q.startsWith('INSERT INTO audit_events')) { state.audits.push({ id: values[0], payload_digest: values[7] }); return rows(); }
    if (q.startsWith('INSERT INTO outbox')) { if (live.failOutbox) throw new Error('outbox unavailable'); state.outbox.push(JSON.parse(values[3])); return rows(); }
    if (q.startsWith('INSERT INTO idempotency_records')) { state.receipts.push({ organisation_id: values[0], actor_id: values[1], key: values[2], operation: values[3], request_hash: values[4], response_body: JSON.parse(values[5]) }); return rows(); }
    throw new Error(`Unmodelled database query: ${q}`);
  }) };
  const db = { getPool: () => ({ connect: async () => tx }) } as any;
  const packageRow = (overrides = {}) => ({ id: PACKAGE, organisation_id: ORG, project_id: PROJECT, name: 'Lighting package', owner_id: USER, status: 'active', acceptance_state: 'pending', row_version: 1, ...overrides });
  const taskRow = (overrides = {}) => ({ id: TASK, organisation_id: ORG, project_id: PROJECT, package_id: PACKAGE, title: 'Focus lights', assignee_id: USER, state: 'planned', is_completed: false, row_version: 1, ...overrides });
  return { live, db, queries, service: new WorkService(db), state: () => state, packageRow, taskRow };
}

beforeEach(() => { vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false'); });
afterEach(() => vi.unstubAllEnvs());

describe('Durable project work commands', () => {
  it('commits a package, audit, event and stable receipt together and replays exactly', async () => {
    const h = harness(), input = { name: 'Lighting package', ownerId: USER, reason: 'Approved delivery plan' };
    const first = await h.service.createPackage(PROJECT, input, req());
    const second = await h.service.createPackage(PROJECT, input, req());
    expect(second).toEqual(first);
    expect(first.data.payload.acceptanceState).toBe('pending');
    expect(first.data.auditEventId).toBeTruthy();
    expect(h.state().packages).toHaveLength(1);
    expect(h.state().audits).toHaveLength(1);
    expect(h.state().outbox).toHaveLength(1);
    await expect(h.service.createPackage(PROJECT, { ...input, name: 'Changed package' }, req())).rejects.toMatchObject({ status: 409 });
  });

  it('rolls back the work record and audit when durable event insertion fails', async () => {
    const h = harness(); h.live.failOutbox = true;
    await expect(h.service.createPackage(PROJECT, { name: 'Lighting package', ownerId: USER, reason: 'Delivery plan' }, req())).rejects.toMatchObject({ status: 503 });
    expect(h.state()).toEqual({ packages: [], tasks: [], receipts: [], audits: [], outbox: [] });
  });

  it.each([
    ['viewer grant', { grant: 'viewer' }, 403], ['no project grant', { grant: '' }, 404],
    ['client audience', { audience: 'client', role: 'client_user' }, 403],
    ['role without work permission', { role: 'finance' }, 403], ['revoked membership', { active: false }, 401],
  ])('rejects package creation with %s', async (_label, live, status) => {
    const h = harness(); Object.assign(h.live, live);
    await expect(h.service.createPackage(PROJECT, { name: 'Lighting package', ownerId: USER, reason: 'Plan' }, req())).rejects.toMatchObject({ status });
    expect(h.state().packages).toHaveLength(0);
  });

  it('allows operations work permission without requiring projects.manage again', async () => {
    const h = harness(); h.live.role = 'operations';
    await expect(h.service.createPackage(PROJECT, { name: 'Lighting package', ownerId: USER, reason: 'Plan' }, req())).resolves.toMatchObject({ data: { status: 'active' } });
  });

  it('does not substitute a requested package or infer owner/assignee access', async () => {
    const h = harness(); h.state().packages.push(h.packageRow({ project_id: OTHER_PROJECT }));
    await expect(h.service.createTask(PROJECT, { packageId: PACKAGE, title: 'Focus lights', reason: 'Plan' }, req())).rejects.toMatchObject({ status: 404 });
    expect(h.state().tasks).toHaveLength(0);
    h.state().packages[0].project_id = PROJECT; h.live.targetActive = false;
    await expect(h.service.createTask(PROJECT, { packageId: PACKAGE, title: 'Focus lights', assigneeId: USER, reason: 'Plan' }, req())).rejects.toMatchObject({ status: 404 });
    expect(h.state().tasks).toHaveLength(0);
  });

  it('creates the task under the exact package and preserves an unassigned task', async () => {
    const h = harness(); h.state().packages.push(h.packageRow());
    const result = await h.service.createTask(PROJECT, { packageId: PACKAGE, title: 'Focus lights', reason: 'Plan' }, req());
    expect(result.data.payload).toMatchObject({ packageId: PACKAGE, assigneeId: null, isCompleted: false, rowVersion: 1 });
  });

  it('records completion evidence and actor without accepting the package, then safely replays', async () => {
    const h = harness(); h.state().packages.push(h.packageRow()); h.state().tasks.push(h.taskRow());
    const input = { expectedVersion: 1, reason: 'Installation complete', completionEvidence: 'Crew inspection reference 12' };
    const first = await h.service.completeTask(PROJECT, TASK, input, req());
    expect(first.data.payload).toMatchObject({ task: { completedBy: USER, completionEvidence: input.completionEvidence, isCompleted: true, rowVersion: 2 }, packageAcceptanceState: 'pending' });
    expect(h.state().packages[0].acceptance_state).toBe('pending');
    expect(await h.service.completeTask(PROJECT, TASK, input, req())).toEqual(first);
    expect(h.state().audits).toHaveLength(1);
    expect(h.state().outbox[0]).not.toHaveProperty('completionEvidence');
    await expect(h.service.completeTask(PROJECT, TASK, input, req('another-key'))).rejects.toMatchObject({ status: 412 });
  });

  it('requires a version and never fabricates a missing completion target', async () => {
    const h = harness();
    await expect(h.service.completeTask(PROJECT, TASK, { reason: 'Done' }, req())).rejects.toMatchObject({ status: 428 });
    await expect(h.service.completeTask(PROJECT, TASK, { expectedVersion: 1, reason: 'Done' }, req())).rejects.toMatchObject({ status: 404 });
    expect(h.state().tasks).toHaveLength(0);
  });

  it('limits field reads and completion to current assignment, including before receipt replay', async () => {
    const h = harness(); h.live.role = 'field_supervisor'; h.live.isSuperAdmin = true;
    h.state().packages.push(h.packageRow()); h.state().tasks.push(h.taskRow());
    h.state().tasks.push(h.taskRow({ id: '88888888-8888-4888-8888-888888888888', assignee_id: MEMBER }));
    expect((await h.service.tasks(PROJECT, req())).data).toHaveLength(1);
    const input = { expectedVersion: 1, reason: 'Work finished' };
    await h.service.completeTask(PROJECT, TASK, input, req());
    h.state().tasks[0].assignee_id = MEMBER;
    await expect(h.service.completeTask(PROJECT, TASK, input, req())).rejects.toMatchObject({ status: 404 });
    expect((await h.service.packages(PROJECT, req())).data).toHaveLength(0);
  });

  it('does not return an old command receipt after grant revocation', async () => {
    const h = harness(), input = { name: 'Lighting package', ownerId: USER, reason: 'Plan' };
    await h.service.createPackage(PROJECT, input, req()); h.live.grant = '';
    await expect(h.service.createPackage(PROJECT, input, req())).rejects.toMatchObject({ status: 404 });
  });

  it('fails unavailable workflows explicitly after project authorization', async () => {
    const h = harness();
    await expect(h.service.unavailable(PROJECT, req(), 'Designated acceptance')).rejects.toMatchObject({ status: 503 });
    h.live.grant = '';
    await expect(h.service.unavailable(PROJECT, req(), 'Designated acceptance')).rejects.toMatchObject({ status: 404 });
  });

  it('cannot reach direct fixture completion from HTTP even when test fixture mode is opted in', async () => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('ENVIRONMENT', 'local'); vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    const h = harness(), controller = new WorkController(h.db); h.live.grant = '';
    taskRepository.set(TASK, { id: TASK, organisationId: ORG, projectId: PROJECT, packageId: PACKAGE, title: 'Fixture', state: 'planned', isCompleted: false });
    await expect(controller.completeTask(PROJECT, TASK, { expectedVersion: 1, reason: 'Done' }, req())).rejects.toMatchObject({ status: 404 });
    expect(taskRepository.get(TASK)?.isCompleted).toBe(false);
    taskRepository.delete(TASK);
  });
});
