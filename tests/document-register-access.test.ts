import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbPool } from '../packages/db/src/client.js';
import { DocumentRegisterService } from '../apps/api/src/documents/document-register.service.js';
import { DocumentsController } from '../apps/api/src/documents/documents.controller.js';
import { SubmissionPacksController } from '../apps/api/src/documents/submission-packs.controller.js';
import { CompanyVaultController } from '../apps/api/src/documents/company-vault.controller.js';
import { DocumentsAccessGuard, CompanyVaultAvailabilityGuard, assertDocumentFixture } from '../apps/api/src/documents/documents-access.guard.js';

// Run with the batch's consolidated verification, after migration 0019.
const pool = getDbPool();
const database = { getPool: () => pool } as any;
type Actor = { id: string; membership: string; token: string; org: string; role: string };
const organisations: string[] = [], users: string[] = [];
let org: string, project: string, otherProject: string, secondOrg: string;
let manager: Actor, designer: Actor, field: Actor, client: Actor, unassigned: Actor;
let service: DocumentRegisterService;
async function organisation() {
  const id = randomUUID(); organisations.push(id);
  await pool.query('INSERT INTO organisations(id,name,code) VALUES($1,$2,$3)', [id, 'Synthetic document regression', `DOC-${id}`]);
  return id;
}
async function actor(role: string, organisationId = org, audience = 'internal') {
  const person = { id: randomUUID(), membership: randomUUID(), token: randomUUID(), org: organisationId, role };
  users.push(person.id);
  await pool.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [person.id, `${person.id}@example.test`, 'Synthetic document actor']);
  await pool.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience) VALUES($1,$2,$3,$4,$5)', [person.membership, person.org, person.id, role, audience]);
  await pool.query("INSERT INTO sessions(user_id,token,expires_at) VALUES($1,$2,clock_timestamp()+INTERVAL '1 hour')", [person.id, person.token]);
  return person;
}
async function makeProject(organisationId = org) {
  const id = randomUUID();
  await pool.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,created_by,updated_by)
    VALUES($1,$2,$3,'Synthetic document scope','Test-only document access','INTERNAL_IDEA',$4,$4,$4)`, [id, organisationId, `DOC-${id}`, manager.id]);
  return id;
}
async function grant(person: Actor, level = 'editor', projectId = project) {
  await pool.query(`INSERT INTO project_access_grants(id,organisation_id,project_id,membership_id,access_level,granted_by,reason)
    VALUES($1,$2,$3,$4,$5,$6,'Synthetic regression grant')`, [randomUUID(), person.org, projectId, person.membership, level, manager.id]);
}
function request(person = manager, key = randomUUID()) {
  return { method: 'POST', organisationId: person.org, headers: { authorization: `Bearer ${person.token}`, 'idempotency-key': key } } as any;
}
const draft = (extra = {}) => ({ title: 'Synthetic draft drawing', discipline: 'staging', documentType: 'drawing', confidentialityLevel: 'internal', reason: 'Regression draft registration', ...extra });
const revision = (extra = {}) => ({ revisionCode: 'Rev 01', originalFilename: 'draft.pdf', mimeType: 'application/pdf', changeSummary: 'Initial metadata awaiting an actual file', reason: 'Regression revision registration', expectedVersion: 1, ...extra });
async function counts() {
  return (await pool.query(`SELECT
    (SELECT count(*)::int FROM controlled_documents WHERE organisation_id=$1) documents,
    (SELECT count(*)::int FROM controlled_document_revisions WHERE organisation_id=$1) revisions,
    (SELECT count(*)::int FROM audit_events WHERE organisation_id=$1) audits,
    (SELECT count(*)::int FROM outbox WHERE organisation_id=$1) events,
    (SELECT count(*)::int FROM idempotency_records WHERE organisation_id=$1) receipts`, [org])).rows[0];
}
beforeEach(async () => {
  vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
  org = await organisation(); secondOrg = await organisation();
  manager = await actor('project_manager'); designer = await actor('design_production'); field = await actor('field_supervisor');
  client = await actor('client_user', org, 'client'); unassigned = await actor('super_admin');
  project = await makeProject(); otherProject = await makeProject();
  await grant(manager); await grant(designer); await grant(field, 'viewer'); await grant(client, 'viewer');
  await grant(manager, 'editor', otherProject);
  service = new DocumentRegisterService(database);
});
afterEach(async () => {
  try {
    for (const table of ['controlled_document_revisions', 'controlled_documents', 'idempotency_records', 'audit_events', 'outbox', 'project_access_grants', 'projects', 'memberships']) {
      await pool.query(`DELETE FROM ${table} WHERE organisation_id=ANY($1::uuid[])`, [organisations]);
    }
    await pool.query('DELETE FROM sessions WHERE user_id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
    await pool.query('DELETE FROM organisations WHERE id=ANY($1::uuid[])', [organisations]);
  } finally { organisations.length = 0; users.length = 0; vi.unstubAllEnvs(); }
});

describe('Scoped durable document metadata register', () => {
  it('commits metadata, audit, event and receipt once and recovers the same result in a fresh service', async () => {
    const req = request(designer); const first = await service.create(project, draft(), req);
    expect(first.data).toMatchObject({ revisionsCount: 0, rowVersion: 1, fileState: 'missing', currentRevisionCode: null, status: 'draft', canDownload: false });
    const before = await counts();
    expect(await new DocumentRegisterService(database).create(project, draft(), req)).toEqual(first);
    expect(await counts()).toEqual(before);
    expect(before).toEqual({ documents: 1, revisions: 0, audits: 1, events: 1, receipts: 1 });
    await expect(service.create(project, draft({ title: 'Different payload' }), req)).rejects.toMatchObject({ status: 409 });
  });

  it('requires a current session, explicit grant, internal audience and a write permission', async () => {
    await expect(service.list(project, { organisationId: org, headers: { 'x-user-role': 'super_admin' } } as any)).rejects.toMatchObject({ status: 401 });
    await expect(service.list(project, request(unassigned))).rejects.toMatchObject({ status: 404 });
    await expect(service.list(project, request(client))).rejects.toMatchObject({ status: 403 });
    await expect(service.create(project, draft(), request(field))).rejects.toMatchObject({ status: 403 });
    await pool.query("UPDATE project_access_grants SET access_level='editor' WHERE membership_id=$1", [field.membership]);
    await expect(service.create(project, draft(), request(field))).rejects.toMatchObject({ status: 403 });
    await pool.query('UPDATE memberships SET is_revoked=true WHERE id=$1', [designer.membership]);
    await expect(service.create(project, draft(), request(designer))).rejects.toMatchObject({ status: 401 });
  });

  it('filters classification for lists and fails scoped detail/revisions without disclosing existence', async () => {
    const visible = (await service.create(project, draft(), request())).data;
    const sensitive = (await service.create(project, draft({ title: 'Private commercial cost' }), request())).data;
    await pool.query("UPDATE controlled_documents SET confidentiality_level='commercial_sensitive' WHERE id=$1", [sensitive.id]);
    expect((await service.list(project, request(field))).data.map(row => row.id)).toEqual([visible.id]);
    await expect(service.get(project, sensitive.id, request(field))).rejects.toMatchObject({ status: 404 });
    await expect(service.revisions(project, sensitive.id, request(field))).rejects.toMatchObject({ status: 404 });
    await expect(service.get(otherProject, visible.id, request())).rejects.toMatchObject({ status: 404 });
    await expect(service.revisions(otherProject, visible.id, request())).rejects.toMatchObject({ status: 404 });
    const forged = request(); forged.organisationId = secondOrg;
    await expect(service.get(project, visible.id, forged)).rejects.toMatchObject({ status: 401 });
    await expect(service.create(project, draft({ confidentialityLevel: 'personnel_sensitive' }), request())).rejects.toMatchObject({ status: 400 });
  });

  it('stores revision metadata without file claims, preserves the approved-current pointer and rejects stale versions', async () => {
    const doc = (await service.create(project, draft(), request())).data;
    const req = request(designer); const result = await service.addRevision(project, doc.id, revision(), req);
    expect(result.data).toMatchObject({ fileState: 'missing', quarantineScanState: 'not_scanned', approvalState: 'draft', rowVersion: 2, canDownload: false });
    expect(result.data).not.toHaveProperty('storageKey'); expect(result.data).not.toHaveProperty('contentHash');
    const row = (await pool.query('SELECT * FROM controlled_document_revisions WHERE id=$1', [result.data.id])).rows[0];
    expect(row).toMatchObject({ storage_object_path: null, calculated_sha256: null, size: null, quarantine_scan_state: 'not_scanned', approval_state: 'draft' });
    expect((await service.get(project, doc.id, request())).data).toMatchObject({ currentRevisionCode: null, revisionsCount: 1, rowVersion: 2 });
    expect(await service.addRevision(project, doc.id, revision(), req)).toEqual(result);
    await expect(service.addRevision(project, doc.id, revision({ revisionCode: 'Rev 02' }), request())).rejects.toMatchObject({ status: 409 });
    await expect(service.addRevision(project, doc.id, revision({ expectedVersion: 2 }), request())).rejects.toMatchObject({ status: 409 });
    await expect(service.addRevision(otherProject, doc.id, revision(), request())).rejects.toMatchObject({ status: 404 });
  });

  it('rechecks current classification and grant before disclosing stored retry receipts', async () => {
    const doc = (await service.create(project, draft(), request())).data; const req = request(designer);
    await service.addRevision(project, doc.id, revision(), req);
    await pool.query("UPDATE controlled_documents SET confidentiality_level='personnel_sensitive' WHERE id=$1", [doc.id]);
    await expect(service.addRevision(project, doc.id, revision(), req)).rejects.toMatchObject({ status: 404 });
    await pool.query("UPDATE controlled_documents SET confidentiality_level='internal' WHERE id=$1", [doc.id]);
    await pool.query(`UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=clock_timestamp(),
      row_version=row_version+1,updated_at=clock_timestamp() WHERE membership_id=$1`, [designer.membership, manager.id]);
    await expect(service.addRevision(project, doc.id, revision(), req)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects supplied file bytes, storage paths, scan outcomes and client-manufactured approvals', async () => {
    const doc = (await service.create(project, draft(), request())).data;
    for (const addition of [{ fileContent: 'not-a-file' }, { storageKey: 'https://private.test/file.pdf' }, { contentHash: 'a'.repeat(64) }, { approvalState: 'approved' }, { quarantineScanState: 'passed' }]) {
      await expect(service.addRevision(project, doc.id, revision(addition), request())).rejects.toMatchObject({ status: 400 });
    }
    await expect(service.create(project, draft({ projectCode: 'FORGED' }), request())).rejects.toMatchObject({ status: 400 });
    await expect(service.addRevision(project, doc.id, revision({ originalFilename: '../private.pdf' }), request())).rejects.toMatchObject({ status: 400 });
    expect((await counts()).revisions).toBe(0);
  });

  it('does not expose legacy file paths or present legacy scan and approval strings as verified', async () => {
    const doc = (await service.create(project, draft(), request())).data;
    await pool.query("UPDATE controlled_documents SET provenance_state='legacy_unverified',current_revision_code='Rev Approved' WHERE id=$1", [doc.id]);
    await pool.query(`INSERT INTO controlled_document_revisions(id,organisation_id,document_id,revision,storage_object_path,original_filename,mime_type,size,calculated_sha256,quarantine_scan_state,approval_state,uploaded_by)
      VALUES($1,$2,$3,'Legacy','secret/path','legacy.pdf','application/pdf',20,$4,'passed','approved',$5)`, [randomUUID(), org, doc.id, 'a'.repeat(64), manager.id]);
    const revisions = await service.revisions(project, doc.id, request());
    expect(revisions.data[0]).toMatchObject({ provenanceState: 'legacy_unverified', fileState: 'unverified', quarantineScanState: 'unverified', approvalState: 'unverified', canDownload: false });
    expect(JSON.stringify(revisions)).not.toContain('secret/path'); expect(JSON.stringify(revisions)).not.toContain('a'.repeat(64));
    expect((await service.get(project, doc.id, request())).data.currentRevisionCode).toBeNull();
  });

  it('rolls back the document when an outbox failure interrupts the command', async () => {
    const failing = new DocumentRegisterService({ getPool: () => ({ connect: async () => {
      const tx = await pool.connect(); return { query: (sql: string, values?: any[]) => {
        if (/INSERT\s+INTO\s+outbox\b/i.test(sql)) throw new Error('Synthetic outbox outage');
        return tx.query(sql, values);
      }, release: () => tx.release() };
    } }) } as any);
    const before = await counts();
    await expect(failing.create(project, draft(), request())).rejects.toMatchObject({ status: 503 });
    expect(await counts()).toEqual(before);
  });

  it('allows one concurrent revision per expected version and has no partial second receipt', async () => {
    const doc = (await service.create(project, draft(), request())).data;
    const results = await Promise.allSettled([service.addRevision(project, doc.id, revision(), request()), service.addRevision(project, doc.id, revision({ revisionCode: 'Rev 02' }), request(designer))]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(await counts()).toEqual({ documents: 1, revisions: 1, audits: 2, events: 2, receipts: 2 });
  });

  it('blocks all legacy HTTP paths even when synthetic fixtures are enabled', async () => {
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true');
    const req = request(); req.params = { projectId: project };
    for (const [controller, handler] of [[DocumentsController, DocumentsController.prototype.createTransmittal], [DocumentsController, DocumentsController.prototype.resolveDocumentComment], [SubmissionPacksController, SubmissionPacksController.prototype.listPacks]] as const) {
      await expect(new DocumentsAccessGuard(database).canActivate({ switchToHttp: () => ({ getRequest: () => req }), getClass: () => controller, getHandler: () => handler } as any)).rejects.toMatchObject({ status: 503 });
    }
    expect(() => new CompanyVaultAvailabilityGuard().canActivate()).toThrow();
    expect(() => assertDocumentFixture(req)).toThrow();
    expect(() => new CompanyVaultController(database).listVaultItems()).not.toThrow();
    vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'false');
    expect(() => new DocumentsController(database).listRequiredDocumentSlots(project)).toThrow();
  });
});
