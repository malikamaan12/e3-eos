import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbPool } from '../packages/db/src/client.js';
import { ClarificationRegisterService } from '../apps/api/src/scope/clarification-register.service.js';
import { RequirementIntakeService } from '../apps/api/src/scope/requirement-intake.service.js';

// Prepared with migrations 0021/0022; run once the full control batch is ready.
const pool = getDbPool(), database = { getPool: () => pool } as any;
const organisations: string[] = [], users: string[] = [];
type Actor = { id: string; membership: string; org: string; token: string };
let org: string, otherOrg: string, project: string, otherProject: string;
let manager: Actor, designer: Actor, viewer: Actor, client: Actor, unassigned: Actor;
let service: ClarificationRegisterService;
async function organisation() {
  const id = randomUUID(); organisations.push(id);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [id, 'Synthetic clarification tests', `CLAR-${id}`]);
  return id;
}
async function actor(role: string, audience = 'internal', organisationId = org) {
  const result = { id: randomUUID(), membership: randomUUID(), org: organisationId, token: randomUUID() }; users.push(result.id);
  await pool.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [result.id, `${result.id}@example.test`, 'Synthetic clarification actor']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [result.membership, result.org, result.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,clock_timestamp()+INTERVAL '1 hour')", [result.id, result.token]);
  return result;
}
async function makeProject() {
  const id = randomUUID();
  await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
    VALUES($1,$2,$3,'Synthetic clarification project','Test-only source attribution','INTERNAL_IDEA',$4,$4,$4)`, [id, org, `CLAR-${id}`, manager.id]);
  return id;
}
async function grant(person: Actor, level = 'editor', projectId = project) {
  await pool.query(`INSERT INTO project_access_grants(id,organisation_id,project_id,membership_id,access_level,granted_by,reason)
    VALUES($1,$2,$3,$4,$5,$6,'Synthetic clarification regression')`, [randomUUID(), person.org, projectId, person.membership, level, manager.id]);
}
function request(person = manager, key = randomUUID()) {
  return { method: 'POST', organisationId: person.org, headers: { authorization: `Bearer ${person.token}`, 'idempotency-key': key } } as any;
}
const question = (extra = {}) => ({ question: 'What is the intended access width?', sourceAttribution: 'Planning note awaiting qualified review', ownerId: manager.id,
  respondentId: designer.id, reason: 'Record a missing source fact', ...extra });
const answer = (extra = {}) => ({ expectedVersion: 1, response: 'The supplied note proposes a 3 metre access route.', respondentAttribution: 'Venue coordinator, as stated in the source note',
  sourceAttribution: 'Meeting note revision A, paragraph 2; authenticity not yet verified', reason: 'Record the attributed source response', ...extra });
async function counts() {
  return (await pool.query(`SELECT
    (SELECT count(*)::int FROM clarifications WHERE organisation_id=$1) questions,
    (SELECT count(*)::int FROM clarification_responses WHERE organisation_id=$1) responses,
    (SELECT count(*)::int FROM clarification_history WHERE organisation_id=$1) history,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) events,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [org])).rows[0];
}
beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  org = await organisation(); otherOrg = await organisation();
  manager = await actor('project_manager'); designer = await actor('design_production'); viewer = await actor('operations');
  client = await actor('client_user', 'client'); unassigned = await actor('super_admin');
  project = await makeProject(); otherProject = await makeProject();
  await grant(manager); await grant(designer); await grant(viewer, 'viewer'); await grant(client, 'viewer'); await grant(manager, 'editor', otherProject);
  service = new ClarificationRegisterService(database);
});
afterEach(async () => {
  try {
    await pool.query(`UPDATE clarifications SET status='open',response=NULL,responded_by=NULL,responded_at=NULL,latest_response_id=NULL
      WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    for (const table of ['clarification_history', 'clarification_responses', 'clarifications']) await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    await pool.query('UPDATE requirements SET current_revision_id=NULL WHERE organisation_id=ANY($1::uuid[])', [organisations]);
    for (const table of ['requirement_revisions', 'requirements', 'idempotency_records', 'audit_events', 'outbox', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [organisations]);
  } finally { organisations.length = 0; users.length = 0; vi.unstubAllEnvs(); }
});

describe('Durable attributed clarification register', () => {
  it('creates an internal open question without inventing a deadline or client issue', async () => {
    const req = request(); const result = await service.create(project, question(), req);
    expect(result.data).toMatchObject({ status: 'open', rowVersion: 1, dueAt: null, source: 'internal_question', provenanceState: 'internal_record',
      deliveryState: 'not_issued', scopeApprovalState: 'not_approved', latestResponse: null, createdBy: manager.id, canRespond: true, canReopen: false });
    expect(result.data.history).toHaveLength(1); expect(result.data.responses).toEqual([]);
    expect(await new ClarificationRegisterService(database).create(project, question(), req)).toEqual(result);
    expect(await counts()).toEqual({ questions: 1, responses: 0, history: 1, audits: 1, events: 1, receipts: 1 });
    await expect(service.create(project, question({ question: 'Different question' }), req)).rejects.toMatchObject({ status: 409 });
  });

  it('records the authenticated recorder separately from source author and preserves answers on reopen', async () => {
    const created = (await service.create(project, question(), request())).data;
    const req = request(designer); const recorded = await service.respond(project, created.id, answer(), req);
    expect(recorded.data).toMatchObject({ status: 'answered', rowVersion: 2, canRespond: false, canReopen: true, scopeApprovalState: 'not_approved' });
    expect(recorded.data.latestResponse).toMatchObject({ recordedBy: designer.id, respondentAttribution: answer().respondentAttribution, verificationState: 'attributed_unverified' });
    expect(await service.respond(project, created.id, answer(), req)).toEqual(recorded);
    const reopened = await service.reopen(project, created.id, { expectedVersion: 2, reason: 'Source leaves a remaining ambiguity' }, request());
    expect(reopened.data).toMatchObject({ status: 'open', rowVersion: 3, latestResponse: null });
    expect(reopened.data.responses[0]).toMatchObject({ response: answer().response, recordedBy: designer.id });
    expect(reopened.data.history.map((entry: any) => entry.action)).toEqual(['reopened', 'responded', 'created']);
    const second = await service.respond(project, created.id, answer({ expectedVersion: 3, response: 'Second attributed answer after clarification.' }), request());
    expect(second.data.responses).toHaveLength(2); expect(second.data.rowVersion).toBe(4);
    const event = (await pool.query("SELECT payload FROM outbox WHERE organisation_id=$1 AND event_type='clarification.response_recorded.v1' LIMIT 1", [org])).rows[0].payload;
    expect(event).not.toHaveProperty('response'); expect(event).not.toHaveProperty('respondentAttribution');
  });

  it('denies forged identities, unassigned admins, wrong audiences, read-only grants and cross-project records', async () => {
    const created = (await service.create(project, question(), request())).data;
    await expect(service.list(project, { organisationId: org, headers: { 'x-user-role': 'super_admin' } } as any)).rejects.toMatchObject({ status: 401 });
    await expect(service.list(project, request(unassigned))).rejects.toMatchObject({ status: 404 });
    await expect(service.list(project, request(client))).rejects.toMatchObject({ status: 403 });
    expect((await service.list(project, request(viewer))).data[0].canRespond).toBe(false);
    await expect(service.respond(project, created.id, answer(), request(viewer))).rejects.toMatchObject({ status: 403 });
    await expect(service.get(otherProject, created.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.respond(otherProject, created.id, answer(), request())).rejects.toMatchObject({ status: 404 });
    const forgedScope = request(); forgedScope.organisationId = otherOrg;
    await expect(service.get(project, created.id, forgedScope)).rejects.toMatchObject({ status: 401 });
  });

  it('validates scoped owners/respondents and pins an exact requirement draft revision', async () => {
    await expect(service.create(project, question({ ownerId: unassigned.id }), request())).rejects.toMatchObject({ status: 404 });
    await expect(service.create(project, question({ respondentId: client.id }), request())).rejects.toMatchObject({ status: 404 });
    const requirements = new RequirementIntakeService(database);
    const input = { title: 'Access width', originalWording: 'Exact source wording requiring interpretation', sourceType: 'manual', reason: 'Record source claim' };
    const requirement = (await requirements.create(project, input, request())).data;
    const created = (await service.create(project, question({ requirementId: requirement.id }), request())).data;
    expect(created).toMatchObject({ requirementId: requirement.id, requirementVersion: 1, requirementRevisionId: requirement.currentRevisionId });
    await expect(service.create(otherProject, question({ respondentId: null, requirementId: requirement.id }), request())).rejects.toMatchObject({ status: 404 });
    await requirements.revise(project, requirement.id, { ...input, originalWording: 'Later wording', expectedVersion: 1 }, request());
    const retained = await service.get(project, created.id, request());
    expect(retained.data.requirementVersion).toBe(1); expect(retained.data.requirementRevisionId).toBe(requirement.currentRevisionId);
    const answered = await service.respond(project, created.id, answer(), request());
    expect(answered.data.scopeApprovalState).toBe('not_approved');
    expect((await pool.query('SELECT is_approved,status,row_version FROM requirements WHERE id=$1', [requirement.id])).rows[0]).toMatchObject({ is_approved: false, status: 'draft', row_version: 2 });
  });

  it('rejects missing attribution, impossible dates and caller-issued or approved state claims', async () => {
    for (const extra of [{ sourceAttribution: '' }, { dueAt: '2026-02-31T10:00:00Z' }, { dueAt: '2026-10-01T10:00:00' }, { status: 'submitted_to_client' }, { approved: true }]) {
      await expect(service.create(project, question(extra), request())).rejects.toMatchObject({ status: 400 });
    }
    const created = (await service.create(project, question({ dueAt: '2026-10-01T10:00:00+03:00' }), request())).data;
    expect(created.dueAt).toBe('2026-10-01T07:00:00.000Z');
    await expect(service.respond(project, created.id, answer({ respondentAttribution: '' }), request())).rejects.toMatchObject({ status: 400 });
    await expect(service.respond(project, created.id, answer({ respondedBy: unassigned.id }), request())).rejects.toMatchObject({ status: 400 });
    expect((await counts()).responses).toBe(0);
  });

  it('rechecks current membership/grant before historical response replay', async () => {
    const created = (await service.create(project, question(), request())).data; const req = request(designer);
    await service.respond(project, created.id, answer(), req);
    await pool.query(`UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=clock_timestamp()
      WHERE membership_id=$1 AND project_id=$3`, [designer.membership, manager.id, project]);
    await expect(service.respond(project, created.id, answer(), req)).rejects.toMatchObject({ status: 404 });
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [manager.membership]);
    await expect(service.reopen(project, created.id, { expectedVersion: 2, reason: 'Recheck authority' }, request())).rejects.toMatchObject({ status: 401 });
  });

  it('rejects stale versions and commits only one concurrent attributed response', async () => {
    const created = (await service.create(project, question(), request())).data;
    const outcomes = await Promise.allSettled([service.respond(project, created.id, answer(), request()), service.respond(project, created.id, answer({ response: 'Concurrent source answer' }), request(designer))]);
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(result => result.status === 'rejected')).toHaveLength(1);
    await expect(service.reopen(project, created.id, { expectedVersion: 1, reason: 'Stale reopen' }, request())).rejects.toMatchObject({ status: 409 });
    expect(await counts()).toEqual({ questions: 1, responses: 1, history: 2, audits: 2, events: 2, receipts: 2 });
  });

  it('keeps response/history immutable and rolls back all effects on event failure', async () => {
    const created = (await service.create(project, question(), request())).data;
    const failing = new ClarificationRegisterService({ getPool: () => ({ connect: async () => {
      const tx = await pool.connect(); return { query: (sql: string, values?: any[]) => {
        if (/INSERT\s+INTO\s+outbox\b/i.test(sql)) throw new Error('Synthetic event storage failure');
        return tx.query(sql, values);
      }, release: () => tx.release() };
    } }) } as any);
    const before = await counts();
    await expect(failing.respond(project, created.id, answer(), request())).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
    const recorded = await service.respond(project, created.id, answer(), request());
    await expect(pool.query('UPDATE clarification_responses SET response=$2 WHERE id=$1', [recorded.data.latestResponse.id, 'Overwritten'])).rejects.toThrow(/immutable/);
    await expect(pool.query('UPDATE clarification_history SET reason=$2 WHERE clarification_id=$1', [created.id, 'Overwritten'])).rejects.toThrow(/immutable/);
  });

  it('retains legacy questions without silently importing them into the new register', async () => {
    const id = randomUUID();
    await pool.query(`INSERT INTO clarifications(id,organisation_id,project_id,question,source,due_at,status)
      VALUES($1,$2,$3,'Legacy unverified source','legacy import',NULL,'submitted_to_client')`, [id, org, project]);
    expect((await service.list(project, request())).data).toEqual([]);
    await expect(service.get(project, id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.respond(project, id, answer(), request())).rejects.toMatchObject({ status: 404 });
    expect((await pool.query('SELECT provenance_state,status FROM clarifications WHERE id=$1', [id])).rows[0]).toEqual({ provenance_state: 'legacy_unverified', status: 'submitted_to_client' });
  });
});
