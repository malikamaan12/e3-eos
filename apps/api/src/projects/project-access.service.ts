import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createHash, randomUUID } from 'crypto';
import { CANONICAL_ROLES, hasRolePermission, normalizeRole, calculateOnboardingCompleteness } from '@e3-eos/domain';
import { ProjectCreateSchema } from '@e3-eos/contracts';
import { DbService } from '../common/db.service.js';
import { readSessionToken } from '../auth/local-synthetic-auth.js';

export type ProjectAccessLevel = 'viewer' | 'editor';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (code: string, detail: string, status: number): never => { throw new HttpException({ code, title: detail, detail }, status); };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const timestamp = (value: unknown) => value ? new Date(value as string).toISOString() : null;
function connection(db: DbService) { return () => db.getPool().connect(); }
type Client = Awaited<ReturnType<ReturnType<typeof connection>>>;
export type ProjectAccessTransaction = Client;
export interface ProjectAccessContext {
  organisationId: string; userId: string; membershipId: string; role: string;
  audience: string; project: any; accessLevel: ProjectAccessLevel; isSuperAdmin: boolean;
}
export interface ProjectAccessOptions {
  level: ProjectAccessLevel;
  /** Any one of these action permissions is required in addition to the grant. */
  permissions?: string[];
  audiences?: Array<'internal' | 'client'>;
}
export type MembershipAccessContext = Omit<ProjectAccessContext, 'project' | 'accessLevel'>;
const summarySelect = `SELECT g.*,p.project_code,p.title AS project_title,m.user_id,m.role,m.is_revoked AS membership_revoked,m.audience,
  u.name AS user_name,u.email FROM project_access_grants g
  JOIN projects p ON p.id=g.project_id AND p.organisation_id=g.organisation_id
  JOIN memberships m ON m.id=g.membership_id AND m.organisation_id=g.organisation_id
  JOIN users u ON u.id=m.user_id`;

export class ProjectAccessService {
  constructor(private readonly db: DbService) {}

  async withVisibleProjects<T>(req: Request, options: { permissions?: string[]; audiences?: Array<'internal' | 'client'> },
    operation: (tx: ProjectAccessTransaction, access: MembershipAccessContext, projects: any[]) => Promise<T>): Promise<T> {
    const organisationId = this.scope(req);
    return this.transaction(organisationId, async (tx) => {
      const member = await this.member(tx, req, organisationId);
      const role = normalizeRole(member.role);
      if (!(options.audiences || ['internal']).includes(member.audience) || !CANONICAL_ROLES.includes(role as any)
        || (member.audience === 'internal' && role === 'client_user') || (member.audience === 'client' && role !== 'client_user')) {
        fail('PROJECT_AUDIENCE_FORBIDDEN', 'This project summary is unavailable to the current audience or role.', 403);
      }
      if (options.permissions?.length && !options.permissions.some((permission) => hasRolePermission(role, permission, member.is_super_admin))) {
        fail('PROJECT_ROLE_PERMISSION_REQUIRED', 'The current role does not permit this summary.', 403);
      }
      const rows = (await tx.query(`SELECT p.*,g.access_level FROM projects p
        JOIN project_access_grants g ON g.project_id=p.id AND g.organisation_id=p.organisation_id
        WHERE p.organisation_id=$1 AND g.membership_id=$2 AND NOT g.is_revoked
          AND ($3::text='internal' OR g.access_level='viewer') ORDER BY p.created_at DESC,p.id FOR UPDATE OF p,g`,
        [organisationId, member.membership_id, member.audience])).rows;
      return operation(tx, { organisationId, userId: member.user_id, membershipId: member.membership_id,
        role, audience: member.audience, isSuperAdmin: member.is_super_admin === true }, rows);
    });
  }

  /** Keep current authority, grant and domain writes within one transaction. */
  async withAccess<T>(req: Request, reference: string, options: ProjectAccessOptions,
    operation: (tx: ProjectAccessTransaction, access: ProjectAccessContext) => Promise<T>): Promise<T> {
    const organisationId = this.scope(req);
    if (typeof reference !== 'string' || !reference.trim() || reference.length > 200) fail('VALIDATION_ERROR', 'A single project reference is required.', 400);
    return this.transaction(organisationId, async (tx) => {
      const member = await this.member(tx, req, organisationId);
      const role = normalizeRole(member.role);
      const allowedAudiences = options.audiences || ['internal'];
      if (!allowedAudiences.includes(member.audience) || !CANONICAL_ROLES.includes(role as any)
        || (member.audience === 'internal' && role === 'client_user')
        || (member.audience === 'client' && role !== 'client_user')) {
        fail('PROJECT_AUDIENCE_FORBIDDEN', 'This project module is unavailable to the current membership audience or role.', 403);
      }
      const project = (await tx.query(`SELECT p.*,g.access_level FROM projects p
        JOIN project_access_grants g ON g.project_id=p.id AND g.organisation_id=p.organisation_id
        WHERE p.organisation_id=$1 AND (p.id::text=$2 OR p.project_code=$2)
          AND g.membership_id=$3 AND NOT g.is_revoked FOR UPDATE OF p,g`,
        [organisationId, reference, member.membership_id])).rows[0];
      if (!project) fail('PROJECT_NOT_FOUND', 'Project does not exist or is not available in the current scope.', 404);
      if ((options.level === 'editor' && project.access_level !== 'editor')
        || (member.audience === 'client' && (project.access_level !== 'viewer' || options.level !== 'viewer'))) {
        fail('PROJECT_ACCESS_LEVEL_REQUIRED', 'The project grant does not permit this action.', 403);
      }
      const permissions = options.permissions || (options.level === 'editor' ? ['projects.manage'] : []);
      if (permissions.length && !permissions.some((permission) => hasRolePermission(role, permission, member.is_super_admin))) {
        fail('PROJECT_ROLE_PERMISSION_REQUIRED', 'The current role does not permit this project action.', 403);
      }
      return operation(tx, { organisationId, userId: member.user_id, membershipId: member.membership_id,
        role, audience: member.audience, project, accessLevel: project.access_level, isSuperAdmin: member.is_super_admin === true });
    });
  }

  private scope(req: Request): string {
    const orgId = (req as any)?.organisationId;
    if (!UUID.test(orgId || '') || !readSessionToken(req)) fail('UNAUTHENTICATED', 'A current scoped session is required.', 401);
    return orgId;
  }

  private async transaction<T>(orgId: string, operation: (tx: Client) => Promise<T>): Promise<T> {
    let tx: Client | undefined;
    try {
      tx = await this.db.getPool().connect();
      await tx.query('BEGIN');
      await tx.query("SELECT set_config('app.current_org_id',$1,true)", [orgId]);
      // Shared with membership and invitation commands: scope and authority
      // cannot change between their current-state check and the committed write.
      const org = await tx.query('SELECT id FROM organisations WHERE id=$1 FOR UPDATE', [orgId]);
      if (!org.rows.length) fail('UNAUTHENTICATED', 'Current organisation is not available.', 401);
      const result = await operation(tx);
      await tx.query('COMMIT');
      return result;
    } catch (error) {
      if (tx) await tx.query('ROLLBACK').catch(() => {});
      if (error instanceof HttpException) throw error;
      return fail('PROJECT_ACCESS_STORAGE_UNAVAILABLE', 'Project access could not be verified or committed. Retry commands using the same key.', 503);
    } finally { tx?.release(); }
  }

  private async member(tx: Client, req: Request, orgId: string, admin = false) {
    const row = (await tx.query(`SELECT u.id AS user_id,u.is_super_admin,m.id AS membership_id,m.role,m.audience
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id
      WHERE s.token=$1 AND s.expires_at>clock_timestamp() AND m.organisation_id=$2 AND NOT m.is_revoked
      FOR UPDATE OF m,u,s`, [readSessionToken(req), orgId])).rows[0];
    if (!row) fail('UNAUTHENTICATED', 'Current session or organisation membership is no longer active.', 401);
    if (admin && (row.audience !== 'internal' || (!row.is_super_admin && normalizeRole(row.role) !== 'super_admin'))) {
      fail('PROJECT_ACCESS_ADMIN_REQUIRED', 'Current internal Super Admin authority is required to manage project access.', 403);
    }
    return row;
  }

  private summary(row: any) {
    return { id: row.id, organisationId: row.organisation_id, projectId: row.project_id,
      projectCode: row.project_code, projectTitle: row.project_title, membershipId: row.membership_id,
      userId: row.user_id, userName: row.user_name, email: row.email, accessLevel: row.access_level,
      isRevoked: row.is_revoked, membershipRevoked: row.membership_revoked,
      effectiveAccess: !row.is_revoked && !row.membership_revoked && CANONICAL_ROLES.includes(normalizeRole(row.role) as any)
        && ((row.audience === 'internal' && normalizeRole(row.role) !== 'client_user')
          || (row.audience === 'client' && row.access_level === 'viewer' && normalizeRole(row.role) === 'client_user' && hasRolePermission(row.role, 'portal.read'))),
      rowVersion: row.row_version, grantedBy: row.granted_by, grantedAt: timestamp(row.granted_at),
      updatedAt: timestamp(row.updated_at), revokedBy: row.revoked_by, revokedAt: timestamp(row.revoked_at) };
  }

  private key(req: Request): string {
    const key = req?.headers?.['idempotency-key'];
    if (typeof key !== 'string' || !key.trim() || key.length > 200) fail('MISSING_IDEMPOTENCY_KEY', 'Idempotency-Key must contain 1–200 characters.', 400);
    return key as string;
  }
  private reason(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 2000) fail('VALIDATION_ERROR', 'Reason must contain 1–2000 characters.', 400);
    return (value as string).trim();
  }
  private level(value: unknown): ProjectAccessLevel {
    if (value !== 'viewer' && value !== 'editor') fail('VALIDATION_ERROR', 'Access level must be viewer or editor.', 400);
    return value as ProjectAccessLevel;
  }
  private id(value: unknown): string {
    if (typeof value !== 'string' || !UUID.test(value)) fail('VALIDATION_ERROR', 'A valid UUID is required.', 400);
    return value as string;
  }
  private version(value: unknown): number {
    if (!Number.isSafeInteger(value) || Number(value) < 1) fail('VALIDATION_ERROR', 'A positive expectedVersion is required.', 400);
    return value as number;
  }
  private allowTarget(member: any, level: ProjectAccessLevel) {
    if (!member || member.is_revoked) fail('PROJECT_ACCESS_TARGET_NOT_FOUND', 'An active membership in the current organisation is required.', 404);
    if (!CANONICAL_ROLES.includes(normalizeRole(member.role) as any)
      || (member.audience === 'internal' && normalizeRole(member.role) === 'client_user')
      || (member.audience !== 'internal' && !(member.audience === 'client' && level === 'viewer' && normalizeRole(member.role) === 'client_user' && hasRolePermission(member.role, 'portal.read')))) {
      fail('PROJECT_ACCESS_AUDIENCE_UNSUPPORTED', 'Internal memberships support viewer/editor; clients support viewer only. Supplier project access is not supported.', 403);
    }
  }
  private async replay(tx: Client, org: string, actor: string, key: string, operation: string, hash: string) {
    const row = (await tx.query('SELECT * FROM idempotency_records WHERE organisation_id=$1 AND key=$2', [org, key])).rows[0];
    if (row && (row.actor_id !== actor || row.operation !== operation || row.request_hash !== hash)) fail('IDEMPOTENCY_CONFLICT', 'This command key belongs to a different request.', 409);
    return row;
  }
  private async complete(tx: Client, org: string, actor: string, key: string, operation: string, hash: string, id: string, action: string, payload: any) {
    const row = (await tx.query(`${summarySelect} WHERE g.id=$1 AND g.organisation_id=$2`, [id, org])).rows[0];
    const auditEventId = randomUUID(), eventId = randomUUID();
    const previous = (await tx.query('SELECT payload_digest FROM audit_events WHERE organisation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [org])).rows[0];
    const event = { ...payload, grantId: id, projectId: row.project_id, membershipId: row.membership_id, rowVersion: row.row_version };
    await tx.query(`INSERT INTO audit_events(id,organisation_id,actor_id,action,target_type,target_id,payload_digest,previous_digest,created_at)
      VALUES($1,$2,$3,$4,'project_access_grant',$5,$6,$7,clock_timestamp())`, [auditEventId, org, actor, action, id, digest(event), previous?.payload_digest || null]);
    await tx.query('INSERT INTO outbox(event_id,organisation_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb)', [eventId, org, `${action}.v1`, JSON.stringify({ ...event, auditEventId })]);
    const result = { data: { ...this.summary(row), auditEventId, eventId } };
    await tx.query(`INSERT INTO idempotency_records(organisation_id,actor_id,key,operation,request_hash,status_code,response_body)
      VALUES($1,$2,$3,$4,$5,201,$6::jsonb)`, [org, actor, key, operation, hash, JSON.stringify(result)]);
    return result;
  }

  async list(req: Request, projectId?: string) {
    const org = this.scope(req); if (projectId) this.id(projectId);
    return this.transaction(org, async (tx) => {
      await this.member(tx, req, org, true);
      if (projectId && !(await tx.query('SELECT id FROM projects WHERE id=$1 AND organisation_id=$2', [projectId, org])).rows.length) fail('PROJECT_NOT_FOUND', 'Project not found in current scope.', 404);
      const rows = await tx.query(`${summarySelect} WHERE g.organisation_id=$1 AND ($2::uuid IS NULL OR g.project_id=$2::uuid) ORDER BY g.granted_at DESC,g.id`, [org, projectId || null]);
      return { data: rows.rows.map((row) => this.summary(row)) };
    });
  }

  async projects(req: Request) {
    const org = this.scope(req);
    return this.transaction(org, async (tx) => {
      await this.member(tx, req, org, true);
      const rows = await tx.query('SELECT id,project_code,title FROM projects WHERE organisation_id=$1 ORDER BY project_code,id', [org]);
      return { data: rows.rows.map((row) => ({ id: row.id, projectCode: row.project_code, title: row.title })) };
    });
  }

  async create(body: any, req: Request) {
    const org = this.scope(req), key = this.key(req), projectId = this.id(body?.projectId), membershipId = this.id(body?.membershipId);
    const accessLevel = this.level(body?.accessLevel), reason = this.reason(body?.reason);
    const operation = 'POST /project-access', hash = digest({ projectId, membershipId, accessLevel, reason });
    return this.transaction(org, async (tx) => {
      const actor = await this.member(tx, req, org, true);
      const previous = await this.replay(tx, org, actor.user_id, key, operation, hash); if (previous) return previous.response_body;
      if (!(await tx.query('SELECT id FROM projects WHERE id=$1 AND organisation_id=$2 FOR UPDATE', [projectId, org])).rows.length) fail('PROJECT_NOT_FOUND', 'Project not found in current scope.', 404);
      const target = (await tx.query('SELECT * FROM memberships WHERE id=$1 AND organisation_id=$2 FOR UPDATE', [membershipId, org])).rows[0];
      this.allowTarget(target, accessLevel);
      if ((await tx.query('SELECT id FROM project_access_grants WHERE organisation_id=$1 AND project_id=$2 AND membership_id=$3 AND NOT is_revoked', [org, projectId, membershipId])).rows.length) fail('PROJECT_ACCESS_ALREADY_EXISTS', 'An active grant already exists. Change or revoke that grant using its current version.', 409);
      const id = randomUUID();
      await tx.query(`INSERT INTO project_access_grants(id,organisation_id,project_id,membership_id,access_level,granted_by,reason)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [id, org, projectId, membershipId, accessLevel, actor.user_id, reason]);
      return this.complete(tx, org, actor.user_id, key, operation, hash, id, 'project_access.created', { accessLevel, reason });
    });
  }

  async change(id: string, body: any, req: Request, revoke = false) {
    const org = this.scope(req), key = this.key(req); this.id(id);
    const expectedVersion = this.version(body?.expectedVersion), reason = this.reason(body?.reason), accessLevel = revoke ? undefined : this.level(body?.accessLevel);
    const action = revoke ? 'revoke' : 'change', operation = `POST /project-access/${id}/${action}`;
    const hash = digest({ id, expectedVersion, reason, ...(accessLevel ? { accessLevel } : {}) });
    return this.transaction(org, async (tx) => {
      const actor = await this.member(tx, req, org, true);
      const previous = await this.replay(tx, org, actor.user_id, key, operation, hash); if (previous) return previous.response_body;
      const grant = (await tx.query('SELECT * FROM project_access_grants WHERE id=$1 AND organisation_id=$2 FOR UPDATE', [id, org])).rows[0];
      if (!grant) fail('PROJECT_ACCESS_NOT_FOUND', 'Project access grant not found.', 404);
      if (grant.row_version !== expectedVersion) fail('PROJECT_ACCESS_VERSION_CONFLICT', 'Project access changed. Refresh and retry with its current version and a new command key.', 409);
      if (grant.is_revoked) fail('PROJECT_ACCESS_REVOKED', 'This grant is revoked. A new explicit grant is required to restore project access.', 409);
      const target = (await tx.query('SELECT * FROM memberships WHERE id=$1 AND organisation_id=$2 FOR UPDATE', [grant.membership_id, org])).rows[0];
      if (!revoke) this.allowTarget(target, accessLevel!);
      if (revoke) {
        await tx.query(`UPDATE project_access_grants SET is_revoked=true,revoked_by=$2,revoked_at=clock_timestamp(),
          row_version=row_version+1,updated_at=clock_timestamp(),reason=$3 WHERE id=$1`, [id, actor.user_id, reason]);
      } else {
        await tx.query('UPDATE project_access_grants SET access_level=$2,row_version=row_version+1,updated_at=clock_timestamp(),reason=$3 WHERE id=$1', [id, accessLevel, reason]);
      }
      return this.complete(tx, org, actor.user_id, key, operation, hash, id, revoke ? 'project_access.revoked' : 'project_access.changed',
        { previousAccessLevel: grant.access_level, accessLevel: accessLevel || grant.access_level, reason });
    });
  }

  /** Business access never follows ownership, Super Admin status or client org. */
  async authorise(req: Request, projectReference: string, requiredLevel: ProjectAccessLevel = 'viewer') {
    const org = this.scope(req);
    return this.transaction(org, async (tx) => {
      const member = await this.member(tx, req, org);
      if (!CANONICAL_ROLES.includes(normalizeRole(member.role) as any) || (member.audience === 'internal' && normalizeRole(member.role) === 'client_user') || (member.audience === 'client' && (normalizeRole(member.role) !== 'client_user' || !hasRolePermission(member.role, 'portal.read')))) fail('PROJECT_ROLE_PERMISSION_REQUIRED', 'Current role does not permit project reads.', 403);
      const row = (await tx.query(`SELECT p.*,g.access_level FROM projects p
        JOIN project_access_grants g ON g.project_id=p.id AND g.organisation_id=p.organisation_id
        WHERE p.organisation_id=$1 AND (p.id::text=$2 OR p.project_code=$2)
          AND g.membership_id=$3 AND NOT g.is_revoked FOR UPDATE OF p,g`, [org, projectReference, member.membership_id])).rows[0];
      if (!row) fail('PROJECT_NOT_FOUND', 'Project does not exist or is not available in the current scope.', 404);
      if (member.audience !== 'internal' && !(member.audience === 'client' && row.access_level === 'viewer' && requiredLevel === 'viewer')) fail('PROJECT_ACCESS_AUDIENCE_UNSUPPORTED', 'This project action is not available to the current audience.', 403);
      if (requiredLevel === 'editor' && row.access_level !== 'editor') fail('PROJECT_ACCESS_LEVEL_REQUIRED', 'An editor project grant is required for this action.', 403);
      if (requiredLevel === 'editor' && !hasRolePermission(member.role, 'projects.manage', member.is_super_admin)) fail('PROJECT_ROLE_PERMISSION_REQUIRED', 'An editor grant does not replace the current role projects.manage permission.', 403);
      return { project: row, accessLevel: row.access_level, audience: member.audience, membershipId: member.membership_id,
        role: member.role, isSuperAdmin: member.is_super_admin };
    });
  }

  async visibleProjects(req: Request) {
    const org = this.scope(req);
    return this.transaction(org, async (tx) => {
      const member = await this.member(tx, req, org);
      if (!['internal', 'client'].includes(member.audience)) fail('PROJECT_ACCESS_AUDIENCE_UNSUPPORTED', 'Project directory is unavailable to this audience.', 403);
      if (!CANONICAL_ROLES.includes(normalizeRole(member.role) as any) || (member.audience === 'internal' && normalizeRole(member.role) === 'client_user') || (member.audience === 'client' && (normalizeRole(member.role) !== 'client_user' || !hasRolePermission(member.role, 'portal.read')))) fail('PROJECT_ROLE_PERMISSION_REQUIRED', 'Current role does not permit project reads.', 403);
      const rows = await tx.query(`SELECT p.*,g.access_level,u.name AS owner_name,o.name AS client_name FROM projects p
        JOIN project_access_grants g ON g.project_id=p.id AND g.organisation_id=p.organisation_id AND g.membership_id=$2 AND NOT g.is_revoked
        LEFT JOIN users u ON u.id=p.owner_id LEFT JOIN organisations o ON o.id=p.client_organisation_id
        WHERE p.organisation_id=$1 AND ($3::text='internal' OR g.access_level='viewer') ORDER BY p.created_at DESC,p.id`, [org, member.membership_id, member.audience]);
      return { rows: rows.rows, audience: member.audience };
    });
  }

  async createProject(body: any, req: Request) {
    const org = this.scope(req), key = this.key(req);
    if (body?.organisationId && body.organisationId !== org) fail('PROJECT_SCOPE_MISMATCH', 'Project must use the current verified organisation.', 403);
    const wizard = Boolean(body?.projectIdentity);
    // Accept the established wizard shape, but validate its canonical identity.
    // Caller IDs are not an upsert key: every successful creation gets a new UUID.
    const input = wizard ? {
      title: body.projectIdentity.title, projectCode: body.projectIdentity.code,
      description: body.projectIdentity.description || 'Project draft awaiting full scope definition.',
      originCode: body.originRoute || 'INTERNAL_IDEA', ownerId: body.team?.projectManagerId || (req as any).userId || (req as any).actorId,
      clientOrganisationId: body.clientStakeholders?.clientOrganisationId,
    } : body;
    const parsed = ProjectCreateSchema.safeParse(input);
    if (!parsed.success) fail('VALIDATION_ERROR', 'Project requires a valid title, description, origin, owner UUID, and optional project code/client UUID.', 400);
    const data = parsed.data!;
    const metadata = wizard ? {
      clientStakeholders: body.clientStakeholders, team: body.team, workflowConfig: body.workflowConfig,
      dateRegister: body.dates, venueContext: body.venue, financialAssumptions: body.commercialStartingPoint,
    } : { classification: data.classification, financialAssumptions: data.financialAssumptions, dateRegister: data.dateRegister };
    if (JSON.stringify(metadata).length > 100_000) fail('VALIDATION_ERROR', 'Project draft metadata exceeds the supported size.', 400);
    const operation = 'POST /projects', hash = digest({ ...data, metadata });
    return this.transaction(org, async (tx) => {
      const actor = await this.member(tx, req, org);
      if (actor.audience !== 'internal' || !hasRolePermission(actor.role, 'projects.create', actor.is_super_admin)) fail('PROJECT_CREATE_FORBIDDEN', 'Current internal projects.create permission is required.', 403);
      const previous = await this.replay(tx, org, actor.user_id, key, operation, hash); if (previous) return previous.response_body;
      const owner = (await tx.query("SELECT id FROM memberships WHERE organisation_id=$1 AND user_id=$2 AND audience='internal' AND NOT is_revoked FOR UPDATE", [org, data.ownerId])).rows[0];
      if (!owner) fail('PROJECT_OWNER_NOT_FOUND', 'Project owner must be an active internal member of the current organisation.', 404);
      // A client organisation reference is not a sharing grant. Do not create or
      // infer a client organisation from an untrusted identifier or free text.
      if (data.clientOrganisationId && !(await tx.query('SELECT id FROM organisations WHERE id=$1', [data.clientOrganisationId])).rows.length) fail('PROJECT_CLIENT_NOT_FOUND', 'Referenced client organisation is unavailable.', 404);
      const id = randomUUID(), projectCode = data.projectCode || `PRJ-${id.slice(0, 8).toUpperCase()}`;
      if ((await tx.query('SELECT id FROM projects WHERE organisation_id=$1 AND project_code=$2', [org, projectCode])).rows.length) fail('PROJECT_CODE_ALREADY_EXISTS', 'Project code already exists in this organisation.', 409);
      const completeness = calculateOnboardingCompleteness({ title: data.title, code: projectCode, businessRoute: data.originCode,
        ownerId: data.ownerId, clientOrganisationId: data.clientOrganisationId, workflowConfirmed: false });
      const storedMetadata = { ...metadata, isOnboardingComplete: false, onboardingCompletionPct: completeness.completionPct,
        missingSections: completeness.missingSections };
      const row = (await tx.query(`INSERT INTO projects(id,organisation_id,project_code,title,description,origin_code,owner_id,client_organisation_id,
        programme_id,template_id,maturity,outcome,created_by,updated_by,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','undetermined',$11,$11,$12::jsonb) RETURNING created_at`,
        [id, org, projectCode, data.title, data.description, data.originCode, data.ownerId, data.clientOrganisationId || null,
          data.programmeId || null, data.templateId || null, actor.user_id, JSON.stringify(storedMetadata)])).rows[0];
      const auditEventId = randomUUID(), eventId = randomUUID();
      const event = { projectId: id, projectCode, title: data.title, ownerId: data.ownerId, createdBy: actor.user_id, projectAccessGranted: false };
      const previousAudit = (await tx.query('SELECT payload_digest FROM audit_events WHERE organisation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [org])).rows[0];
      await tx.query(`INSERT INTO audit_events(id,organisation_id,actor_id,action,target_type,target_id,payload_digest,previous_digest,created_at)
        VALUES($1,$2,$3,'project.created','project',$4,$5,$6,clock_timestamp())`, [auditEventId, org, actor.user_id, id, digest(event), previousAudit?.payload_digest || null]);
      await tx.query("INSERT INTO outbox(event_id,organisation_id,event_type,payload) VALUES($1,$2,'project.created.v1',$3::jsonb)", [eventId, org, JSON.stringify({ ...event, auditEventId })]);
      const result = { data: { id, status: 'draft_created', recordVersion: 1, externalDeliveryStatus: 'not_applicable' as const,
        auditEventId, eventId, projectAccessGranted: false, payload: { projectCode, title: data.title, maturity: 'draft', outcome: 'undetermined',
          clientOrganisationId: data.clientOrganisationId || null, isOnboardingComplete: false, onboardingCompletionPct: completeness.completionPct,
          missingSections: completeness.missingSections } },
        meta: { requestId: auditEventId, recordVersion: 1, dataAsOf: new Date(row.created_at).toISOString() } };
      await tx.query(`INSERT INTO idempotency_records(organisation_id,actor_id,key,operation,request_hash,status_code,response_body)
        VALUES($1,$2,$3,$4,$5,201,$6::jsonb)`, [org, actor.user_id, key, operation, hash, JSON.stringify(result)]);
      return result;
    });
  }
}
