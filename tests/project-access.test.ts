import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbPool } from '../packages/db/src/client.js';
import { ProjectAccessService } from '../apps/api/src/projects/project-access.service.js';
import { ProjectAccessGuard } from '../apps/api/src/projects/project-access.guard.js';
import { ProjectsController } from '../apps/api/src/projects/projects.controller.js';

// Written during the module batch; execute only in the combined final pass.
const pool = getDbPool();
const database = { getPool: () => pool } as any;
type Actor = { id: string; membershipId: string; token: string; org: string; role: string; audience: string };
let org: string, otherOrg: string, project: string;
let admin: Actor, manager: Actor, viewer: Actor, client: Actor, outsider: Actor;
let service: ProjectAccessService;
const organisations: string[] = [], users: string[] = [];

async function organisation() {
  const id = randomUUID(); organisations.push(id);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [id, 'Isolated project access regression', `PROJECT-ACCESS-${id}`]);
  return id;
}
async function actor(role: string, organisationId = org, audience = 'internal'): Promise<Actor> {
  const result = { id: randomUUID(), membershipId: randomUUID(), token: randomUUID(), org: organisationId, role, audience };
  users.push(result.id);
  await pool.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [result.id, `${result.id}@example.test`, 'Synthetic project grant user']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [result.membershipId, result.org, result.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,clock_timestamp()+INTERVAL '1 hour')", [result.id, result.token]);
  return result;
}
function request(person = admin, key = randomUUID()) {
  return { method: 'GET', organisationId: person.org, userId: person.id, actorId: person.id,
    role: person.role, audience: person.audience,
    headers: { authorization: `Bearer ${person.token}`, 'idempotency-key': key, 'x-organisation-id': person.org } } as any;
}
function grantBody(person = viewer, accessLevel = 'viewer') {
  return { projectId: project, membershipId: person.membershipId, accessLevel, reason: 'Isolated grant verification.' };
}
async function grant(person = viewer, level = 'viewer') { return (await service.create(grantBody(person, level), request())).data; }
async function counts() {
  return (await pool.query(`SELECT
    (SELECT count(*)::int FROM projects WHERE organisation_id=$1) projects,
    (SELECT count(*)::int FROM project_access_grants WHERE organisation_id=$1) grants,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) outbox,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [org])).rows[0];
}
function failing(table: string) {
  return new ProjectAccessService({ getPool: () => ({ connect: async () => {
    const tx = await pool.connect();
    return { query: (sql: string, values?: any[]) => {
      if (new RegExp(`INSERT\\s+INTO\\s+${table}\\b`, 'i').test(sql)) throw new Error('Isolated transactional failure');
      return tx.query(sql, values);
    }, release: () => tx.release() };
  } }) } as any);
}

beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  org = await organisation(); otherOrg = await organisation();
  admin = await actor('super_admin'); manager = await actor('project_manager'); viewer = await actor('operations');
  client = await actor('client_user', org, 'client'); outsider = await actor('operations', otherOrg);
  project = randomUUID();
  await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by,metadata)
    VALUES($1,$2,$3,'Synthetic scoped project','Internal confidential description','INTERNAL_IDEA',$4,$5,$5,$6::jsonb)`,
    [project, org, `SCOPED-${project}`, manager.id, admin.id, JSON.stringify({ financialAssumptions: { payroll: 'internal-only' } })]);
  service = new ProjectAccessService(database);
});

afterEach(async () => {
  try {
    for (const table of ['idempotency_records', 'audit_events', 'outbox', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [organisations]);
  } finally { organisations.length = 0; users.length = 0; vi.unstubAllEnvs(); }
});

describe('Durable explicit project access', () => {
  it('rejects array project references before querying authorization', async () => {
    const req = request(); req.params = { id: [project, randomUUID()] };
    await expect(new ProjectAccessGuard(database).canActivate({ switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ProjectsController.prototype.getProject } as any)).rejects.toMatchObject({ status: 400 });
  });

  it('gives neither project owner nor Super Admin implicit business access', async () => {
    await expect(service.authorise(request(admin), project)).rejects.toMatchObject({ status: 404 });
    await expect(service.authorise(request(manager), project)).rejects.toMatchObject({ status: 404 });
    expect((await service.visibleProjects(request(admin))).rows).toEqual([]);
    const listed = await new ProjectsController(database).listProjects(request(admin));
    expect(listed.data).toEqual([]); expect(listed.meta.total).toBe(0);
    expect((await service.projects(request(admin))).data).toEqual([{ id: project, projectCode: `SCOPED-${project}`, title: 'Synthetic scoped project' }]);
  });

  it('commits grant audit outbox and receipt atomically and replays across instances', async () => {
    const req = request(), body = grantBody();
    const first = await service.create(body, req);
    expect(first.data).toMatchObject({ projectId: project, membershipId: viewer.membershipId, userId: viewer.id, accessLevel: 'viewer', rowVersion: 1, effectiveAccess: true, isRevoked: false });
    expect(await counts()).toMatchObject({ projects: 1, grants: 1, audits: 1, outbox: 1, receipts: 1 });
    expect(await new ProjectAccessService(database).create(body, req)).toEqual(first);
    expect(await counts()).toMatchObject({ grants: 1, audits: 1, outbox: 1, receipts: 1 });
    expect((await pool.query('SELECT owner_id FROM projects WHERE id=$1', [project])).rows[0].owner_id).toBe(manager.id);
  });

  it('filters business collections to a current active explicit grant', async () => {
    await grant();
    const visible = await service.visibleProjects(request(viewer));
    expect(visible.rows.map((p: any) => p.id)).toEqual([project]);
    expect((await service.visibleProjects(request(manager))).rows).toEqual([]);
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [viewer.membershipId]);
    await expect(service.authorise(request(viewer), project)).rejects.toMatchObject({ status: 401 });
    expect((await service.list(request())).data[0]).toMatchObject({ membershipRevoked: true, effectiveAccess: false });
  });

  it('requires current base role permission as well as an editor grant', async () => {
    await grant(viewer, 'editor');
    await expect(service.authorise(request(viewer), project, 'editor')).rejects.toMatchObject({ status: 403 });
    await grant(manager, 'editor');
    expect((await service.authorise(request(manager), project, 'editor')).accessLevel).toBe('editor');
    await pool.query("UPDATE memberships SET role='operations' WHERE id=$1", [manager.membershipId]);
    await expect(service.authorise(request(manager), project, 'editor')).rejects.toMatchObject({ status: 403 });
  });

  it('does not trust authority headers or a stale administrator role on replay', async () => {
    const req = request(); await service.create(grantBody(), req);
    await pool.query("UPDATE memberships SET role='operations' WHERE id=$1", [admin.membershipId]);
    req.headers['x-is-super-admin'] = 'true'; req.headers['x-user-roles'] = 'super_admin';
    await expect(service.create(grantBody(), req)).rejects.toMatchObject({ status: 403 });
    expect(await counts()).toMatchObject({ grants: 1, audits: 1, receipts: 1 });
  });

  it('rejects cross-org targets and enforces the composite membership FK', async () => {
    await expect(service.create(grantBody(outsider), request())).rejects.toMatchObject({ status: 404 });
    await expect(pool.query(`INSERT INTO project_access_grants(organisation_id,project_id,membership_id,access_level,granted_by,reason)
      VALUES($1,$2,$3,'viewer',$4,'Isolated invalid cross-scope fixture')`, [org, project, outsider.membershipId, admin.id])).rejects.toMatchObject({ code: '23503' });
    expect(await counts()).toMatchObject({ grants: 0, audits: 0 });
  });

  it('supports client viewer with minimal detail and denies client editor/internal cockpit', async () => {
    await expect(service.create(grantBody(client, 'editor'), request())).rejects.toMatchObject({ status: 403 });
    await grant(client);
    const req = request(client); req.params = { id: project };
    const controller = new ProjectsController(database), guard = new ProjectAccessGuard(database);
    await guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }), getHandler: () => controller.getProject } as any);
    const result = controller.getProject(project, req);
    expect(result.data).not.toHaveProperty('financialAssumptions');
    expect(result.data).not.toHaveProperty('description');
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }), getHandler: () => controller.getCockpit } as any)).rejects.toMatchObject({ status: 403 });
  });

  it('changes and revokes with optimistic versions and rejects stale writers', async () => {
    const first = await grant(manager);
    const changed = await service.change(first.id, { accessLevel: 'editor', expectedVersion: 1, reason: 'Additional verified editing scope.' }, request());
    expect(changed.data).toMatchObject({ rowVersion: 2, accessLevel: 'editor' });
    await expect(service.change(first.id, { expectedVersion: 1, reason: 'Stale revocation.' }, request(), true)).rejects.toMatchObject({ status: 409 });
    const req = request();
    const revoked = await service.change(first.id, { expectedVersion: 2, reason: 'Scope ended.' }, req, true);
    expect(revoked.data).toMatchObject({ rowVersion: 3, isRevoked: true, effectiveAccess: false });
    expect(await service.change(first.id, { expectedVersion: 2, reason: 'Scope ended.' }, req, true)).toEqual(revoked);
    await expect(service.authorise(request(manager), project)).rejects.toMatchObject({ status: 404 });
    await expect(service.change(first.id, { accessLevel: 'viewer', expectedVersion: 3, reason: 'Cannot restore old history.' }, request())).rejects.toMatchObject({ status: 409 });
    const explicitNew = await grant(manager);
    expect(explicitNew.id).not.toBe(first.id); expect(explicitNew.rowVersion).toBe(1);
  });

  it('detects changed commands and concurrent duplicate creation', async () => {
    const req = request(), body = grantBody();
    const results = await Promise.all([service.create(body, req), new ProjectAccessService(database).create(body, req)]);
    expect(results[0]).toEqual(results[1]);
    await expect(service.create({ ...body, reason: 'Different justification.' }, req)).rejects.toMatchObject({ status: 409 });
    await expect(service.create(body, request())).rejects.toMatchObject({ status: 409 });
    expect(await counts()).toMatchObject({ grants: 1, audits: 1, outbox: 1, receipts: 1 });
  });

  it('rolls back the grant if its outbox or receipt cannot be persisted', async () => {
    const before = await counts();
    await expect(failing('outbox').create(grantBody(), request())).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
    await expect(failing('idempotency_records').create(grantBody(), request())).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
  });

  it('rolls back a failed change and reports malformed/unknown roles as ineffective', async () => {
    const initial = await grant(); const before = await counts();
    await expect(failing('audit_events').change(initial.id, { expectedVersion: 1, reason: 'Injected failure.' }, request(), true)).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
    expect((await service.list(request())).data[0]).toMatchObject({ rowVersion: 1, isRevoked: false });
    await pool.query("UPDATE memberships SET role='invented_unknown_role' WHERE id=$1", [viewer.membershipId]);
    expect((await service.list(request())).data[0].effectiveAccess).toBe(false);
    await expect(service.authorise(request(viewer), project)).rejects.toMatchObject({ status: 403 });
  });

  it('fails closed on datastore failure without exposing synthetic repository projects', async () => {
    const controller = new ProjectsController({ getPool: () => ({ connect: async () => { throw new Error('Fixture database unavailable'); } }) } as any);
    await expect(controller.listProjects(request(admin))).rejects.toMatchObject({ status: 503 });
    await expect(service.visibleProjects({ organisationId: org, headers: { 'x-user-id': admin.id } } as any)).rejects.toMatchObject({ status: 401 });
  });

  it('does not let an editor commit legacy in-memory project commands', async () => {
    await grant(manager, 'editor');
    const req = request(manager); req.method = 'POST'; req.params = { id: project };
    const controller = new ProjectsController(database);
    await expect(new ProjectAccessGuard(database).canActivate({ switchToHttp: () => ({ getRequest: () => req }), getHandler: () => controller.closeDimension } as any)).rejects.toMatchObject({ status: 503 });
  });
});

describe('Durable project draft creation without implicit access', () => {
  function body() { return { projectCode: `NEW-${randomUUID().slice(0, 8)}`, title: 'New scoped draft', description: 'Synthetic new project description.', originCode: 'INTERNAL_IDEA', ownerId: manager.id }; }

  it('records actual creator/owner and atomic evidence without any automatic project grant', async () => {
    const input = body(), req = request(manager);
    const created = await service.createProject(input, req);
    expect(created.data).toMatchObject({ status: 'draft_created', projectAccessGranted: false, recordVersion: 1 });
    const row = (await pool.query('SELECT organisation_id,owner_id,created_by,maturity FROM projects WHERE id=$1', [created.data.id])).rows[0];
    expect(row).toEqual({ organisation_id: org, owner_id: manager.id, created_by: manager.id, maturity: 'draft' });
    expect(await counts()).toMatchObject({ projects: 2, grants: 0, audits: 1, outbox: 1, receipts: 1 });
    await expect(service.authorise(req, created.data.id)).rejects.toMatchObject({ status: 404 });
    expect(await new ProjectAccessService(database).createProject(input, req)).toEqual(created);
  });

  it('requires live creation permission and an actual current internal owner membership', async () => {
    await expect(service.createProject(body(), request(viewer))).rejects.toMatchObject({ status: 403 });
    await expect(service.createProject({ ...body(), ownerId: outsider.id }, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.createProject({ ...body(), organisationId: otherOrg }, request())).rejects.toMatchObject({ status: 403 });
    expect(await counts()).toMatchObject({ projects: 1, grants: 0, audits: 0 });
  });

  it('does not upsert supplied IDs and atomically rolls back when audit persistence fails', async () => {
    const before = await counts();
    await expect(failing('audit_events').createProject(body(), request())).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
    const created = await service.createProject({ ...body(), id: project }, request());
    expect(created.data.id).not.toBe(project);
    expect((await pool.query('SELECT title FROM projects WHERE id=$1', [project])).rows[0].title).toBe('Synthetic scoped project');
  });
});
