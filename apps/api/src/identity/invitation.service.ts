import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { createCipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { CANONICAL_ROLES, normalizeRole } from '@e3-eos/domain';
import { hashPassword, verifyPassword } from '@e3-eos/db';
import { DbService } from '../common/db.service.js';
import { readSessionToken } from '../auth/local-synthetic-auth.js';

export const ALLOWED_INVITATION_ROLES = CANONICAL_ROLES.filter((role) => !['super_admin', 'executive'].includes(role));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (code: string, detail: string, status: number): never => { throw new HttpException({ code, title: detail, detail }, status); };
const unavailable = (): never => fail('INVITATION_NOT_AVAILABLE', 'Invitation is unavailable, expired, cancelled, already used, or no longer authorised.', 410);
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const date = (value: any) => value ? new Date(value).toISOString() : null;
type Client = Awaited<ReturnType<ReturnType<typeof connection>>>;
function connection(db: DbService) { return () => db.getPool().connect(); }

function deliveryKey(): Buffer | undefined {
  const configured = process.env.EOS_INVITATION_DELIVERY_KEY || '';
  if (!/^[A-Za-z0-9+/]{43}=$/.test(configured)) return undefined;
  const key = Buffer.from(configured, 'base64');
  return key.length === 32 ? key : undefined;
}
function deliveryConfiguration() {
  const key=deliveryKey(),ttl=Number(process.env.EOS_INVITATION_TTL_HOURS||24);
  const local=['development','test'].includes(process.env.NODE_ENV||'development')
    && ['local','development','test'].includes(process.env.ENVIRONMENT||'local');
  const configured=process.env.APP_BASE_URL||(local?'http://localhost:3002':'');
  try {
    const url=new URL(configured);
    if(!key||!Number.isInteger(ttl)||ttl<1||ttl>168||url.username||url.password||url.pathname!=='/'||url.search||url.hash
      ||!['http:','https:'].includes(url.protocol)||(!local&&url.protocol!=='https:')) return undefined;
    return {key,ttl,origin:url.origin};
  } catch { return undefined; }
}
export function invitationDeliveryConfigured(): boolean { return Boolean(deliveryConfiguration()); }

export class InvitationService {
  constructor(private readonly db: DbService) {}

  private async transaction<T>(orgId: string, action: (client: Client) => Promise<T>): Promise<T> {
    let client: Client | undefined;
    try {
      client = await this.db.getPool().connect();
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
      const org = await client.query('SELECT id FROM organisations WHERE id=$1 FOR UPDATE', [orgId]);
      if (!org.rows.length) fail('UNAUTHENTICATED', 'Current organisation is not available.', 401);
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      if (error instanceof HttpException) throw error;
      return fail('INVITATION_STORAGE_UNAVAILABLE', 'Invitation operation could not be committed. Retry using the same command key.', 503);
    } finally { client?.release(); }
  }

  private scope(req: Request): string {
    const scope = (req as any)?.organisationId;
    if (!uuid.test(scope || '') || !readSessionToken(req)) fail('UNAUTHENTICATED', 'A current scoped session is required.', 401);
    return scope;
  }

  private async administrator(tx: Client, req: Request, orgId: string) {
    const result = await tx.query(`SELECT u.id, u.is_super_admin, m.id AS membership_id, m.role, m.audience
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id
      WHERE s.token=$1 AND s.expires_at>clock_timestamp() AND m.organisation_id=$2 AND NOT m.is_revoked
      FOR UPDATE OF s,m,u`, [readSessionToken(req), orgId]);
    const actor = result.rows[0];
    if (!actor) fail('UNAUTHENTICATED', 'The current session or membership is not active.', 401);
    if (actor.audience !== 'internal' || (!actor.is_super_admin && normalizeRole(actor.role) !== 'super_admin')) {
      fail('INVITATION_AUTHORITY_REQUIRED', 'Current internal Super Admin authority is required.', 403);
    }
    return actor;
  }

  private key(req: Request): string {
    const key = req?.headers?.['idempotency-key'];
    if (typeof key !== 'string' || !key.trim() || key.length>200) fail('MISSING_IDEMPOTENCY_KEY', 'A nonempty Idempotency-Key of at most 200 characters is required.', 400);
    return key as string;
  }
  private reason(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length>2000) fail('VALIDATION_ERROR', 'A reason of 1–2000 characters is required.', 400);
    return (value as string).trim();
  }
  private async replay(tx: Client, orgId: string, key: string, operation: string, hash: string, actorId?: string) {
    const record = (await tx.query('SELECT * FROM idempotency_records WHERE organisation_id=$1 AND key=$2', [orgId,key])).rows[0];
    if (record && (record.operation!==operation || record.request_hash!==hash || (actorId && record.actor_id!==actorId))) {
      fail('IDEMPOTENCY_CONFLICT', 'This command key belongs to a different request.', 409);
    }
    return record;
  }
  private async receipt(tx: Client, orgId: string, actorId: string, key: string, operation: string, hash: string, result: unknown) {
    await tx.query(`INSERT INTO idempotency_records (organisation_id,actor_id,key,operation,request_hash,status_code,response_body)
      VALUES ($1,$2,$3,$4,$5,201,$6::jsonb)`,[orgId,actorId,key,operation,hash,JSON.stringify(result)]);
  }
  private async event(tx: Client, orgId: string, actorId: string, invitationId: string, action: string, payload: any) {
    const auditEventId=randomUUID(), eventId=randomUUID();
    const previous=(await tx.query('SELECT payload_digest FROM audit_events WHERE organisation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[orgId])).rows[0];
    await tx.query(`INSERT INTO audit_events (id,organisation_id,actor_id,action,target_type,target_id,payload_digest,previous_digest,created_at)
      VALUES ($1,$2,$3,$4,'invitation',$5,$6,$7,clock_timestamp())`,[auditEventId,orgId,actorId,action,invitationId,digest(payload),previous?.payload_digest||null]);
    await tx.query(`INSERT INTO outbox(event_id,organisation_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb)`,
      [eventId,orgId,`${action}.v1`,JSON.stringify({...payload,invitationId,auditEventId})]);
    return {auditEventId,eventId};
  }
  private summary(inv: any) {
    const expired=inv.lifecycle_status==='pending' && new Date(inv.expires_at).getTime()<=Date.now();
    return {id:inv.id,organisationId:inv.organisation_id,email:inv.email,name:inv.name,role:inv.role,audience:inv.audience,
      status:expired?'expired':inv.lifecycle_status,expiresAt:date(inv.expires_at),createdAt:date(inv.created_at),invitedBy:inv.invited_by,
      deliveryStatus:inv.lifecycle_status==='cancelled'?'cancelled':inv.delivery_event_id?'queued':'not_queued',deliveryEventId:inv.delivery_event_id};
  }

  async create(body: any, req: Request) {
    const orgId=this.scope(req), key=this.key(req);
    const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
    const name=typeof body?.name==='string'?body.name.trim():'';
    const role=normalizeRole(typeof body?.role==='string'?body.role:'');
    const reason=this.reason(body?.reason);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>200) fail('VALIDATION_ERROR','Valid email and name (at most 200 characters) are required.',400);
    if (!ALLOWED_INVITATION_ROLES.includes(role as any)) fail('INVITATION_ROLE_NOT_ALLOWED','Privileged or unsupported role invitations require separate recent-MFA governance.',403);
    if (body.organisationId && body.organisationId!==orgId) fail('INVITATION_SCOPE_MISMATCH','The invitation must use the verified organisation.',403);
    const audience=role==='client_user'?'client':'internal';
    const hash=digest({email,name,role,reason}), operation='POST /invitations';
    return this.transaction(orgId,async(tx)=>{
      const actor=await this.administrator(tx,req,orgId);
      const previous=await this.replay(tx,orgId,key,operation,hash,actor.id);
      if(previous) return previous.response_body;
      const delivery=deliveryConfiguration();
      if(!delivery) fail('INVITATION_DELIVERY_UNAVAILABLE','Encrypted delivery key, application origin, or expiry configuration is unavailable.',503);
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`invitation-email:${email}`]);
      const existing=(await tx.query('SELECT id,is_super_admin FROM users WHERE LOWER(email)=$1 FOR UPDATE',[email])).rows[0];
      if(existing?.is_super_admin) fail('INVITATION_ROLE_NOT_ALLOWED','Inviting an existing platform administrator requires separate governance.',403);
      if(existing && (await tx.query('SELECT id FROM memberships WHERE organisation_id=$1 AND user_id=$2',[orgId,existing.id])).rows.length) {
        fail('MEMBERSHIP_ALREADY_EXISTS','Existing memberships cannot be changed or restored through invitations.',409);
      }
      if((await tx.query("SELECT id FROM user_invitations WHERE organisation_id=$1 AND LOWER(email)=$2 AND lifecycle_status='pending' AND expires_at>clock_timestamp()",[orgId,email])).rows.length) fail('INVITATION_ALREADY_PENDING','An active invitation already exists for this email.',409);
      const {key:encryptionKey,ttl,origin}=delivery!;
      const id=randomUUID(),rawToken=randomBytes(32).toString('base64url'),deliveryEventId=randomUUID();
      const tokenHash=createHash('sha256').update(rawToken).digest('hex');
      const row=(await tx.query(`INSERT INTO user_invitations(id,organisation_id,email,name,role,token,token_hash,expires_at,lifecycle_status,audience,invited_by,inviter_membership_id,delivery_event_id,reason)
        VALUES($1,$2,$3,$4,$5,NULL,$6,clock_timestamp()+($7 * INTERVAL '1 hour'),'pending',$8,$9,$10,$11,$12) RETURNING *`,
        [id,orgId,email,name,role,tokenHash,ttl,audience,actor.id,actor.membership_id,deliveryEventId,reason])).rows[0];
      const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey!,iv);
      cipher.setAAD(Buffer.from(`${orgId}:${id}`));
      const link=`${origin}/accept-invite#token=${rawToken}`;
      const ciphertext=Buffer.concat([cipher.update(JSON.stringify({token:rawToken,link,email,name,invitationId:id}),'utf8'),cipher.final()]);
      const encryptedDelivery={algorithm:'aes-256-gcm',keyId:process.env.EOS_INVITATION_DELIVERY_KEY_ID||'v1',iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
      await tx.query(`INSERT INTO outbox(event_id,organisation_id,event_type,payload) VALUES($1,$2,'invitation.delivery.queued.v1',$3::jsonb)`,
        [deliveryEventId,orgId,JSON.stringify({invitationId:id,encryptedDelivery})]);
      const event=await this.event(tx,orgId,actor.id,id,'invitation.created',{email,role,audience,reason,deliveryEventId});
      const result={data:{...this.summary(row),...event}};
      await this.receipt(tx,orgId,actor.id,key,operation,hash,result);
      return result;
    });
  }

  async list(req: Request) {
    const orgId=this.scope(req);
    return this.transaction(orgId,async(tx)=>{
      await this.administrator(tx,req,orgId);
      const rows=await tx.query('SELECT * FROM user_invitations WHERE organisation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',[orgId]);
      return {data:rows.rows.map((row)=>this.summary(row))};
    });
  }

  async cancel(id: string, body: any, req: Request) {
    const orgId=this.scope(req),key=this.key(req),reason=this.reason(body?.reason);
    if(!uuid.test(id)) fail('VALIDATION_ERROR','Valid invitation ID is required.',400);
    const operation=`POST /invitations/${id}/cancel`,hash=digest({id,reason});
    return this.transaction(orgId,async(tx)=>{
      const actor=await this.administrator(tx,req,orgId);
      const previous=await this.replay(tx,orgId,key,operation,hash,actor.id);
      if(previous) return previous.response_body;
      const inv=(await tx.query('SELECT * FROM user_invitations WHERE id=$1 AND organisation_id=$2 FOR UPDATE',[id,orgId])).rows[0];
      if(!inv) fail('INVITATION_NOT_FOUND','Invitation not found.',404);
      if(inv.lifecycle_status!=='pending') fail('INVITATION_NOT_PENDING','Only a pending controlled invitation can be cancelled.',409);
      const changed=(await tx.query("UPDATE user_invitations SET lifecycle_status='cancelled',cancelled_at=clock_timestamp(),cancelled_by=$2 WHERE id=$1 RETURNING cancelled_at",[id,actor.id])).rows[0];
      await tx.query("UPDATE outbox SET status='cancelled' WHERE event_id=$1 AND organisation_id=$2 AND status='pending'",[inv.delivery_event_id,orgId]);
      const event=await this.event(tx,orgId,actor.id,id,'invitation.cancelled',{reason});
      const result={data:{id,status:'cancelled',cancelledAt:date(changed.cancelled_at),cancelledBy:actor.id,...event}};
      await this.receipt(tx,orgId,actor.id,key,operation,hash,result);
      return result;
    });
  }

  private token(body: any): string {
    if(typeof body?.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.token)) return unavailable();
    return createHash('sha256').update(body.token).digest('hex');
  }
  private async locate(hash: string) {
    try {
      const inv=(await this.db.getPool().query("SELECT id,organisation_id FROM user_invitations WHERE token_hash=$1 AND lifecycle_status<>'legacy_unverified'",[hash])).rows[0];
      if(!inv) return unavailable();
      return inv;
    } catch(error) {
      if(error instanceof HttpException) throw error;
      return fail('INVITATION_STORAGE_UNAVAILABLE','Invitation could not be verified.',503);
    }
  }
  private async loadAuthorised(tx: Client, id: string, hash: string) {
    const inv=(await tx.query('SELECT * FROM user_invitations WHERE id=$1 AND token_hash=$2 FOR UPDATE',[id,hash])).rows[0];
    if(!inv||inv.lifecycle_status==='legacy_unverified'||inv.lifecycle_status==='cancelled'||!inv.invited_by||!inv.inviter_membership_id) return unavailable();
    if(!ALLOWED_INVITATION_ROLES.includes(inv.role)||inv.audience!==(inv.role==='client_user'?'client':'internal')) return unavailable();
    const issuer=(await tx.query(`SELECT m.role,m.audience,u.is_super_admin FROM memberships m JOIN users u ON u.id=m.user_id
      WHERE m.id=$1 AND m.organisation_id=$2 AND m.user_id=$3 AND NOT m.is_revoked FOR UPDATE OF m,u`,[inv.inviter_membership_id,inv.organisation_id,inv.invited_by])).rows[0];
    if(!issuer||issuer.audience!=='internal'||(!issuer.is_super_admin&&normalizeRole(issuer.role)!=='super_admin')) return unavailable();
    return inv;
  }

  async inspect(body: any) {
    const hash=this.token(body),located=await this.locate(hash);
    return this.transaction(located.organisation_id,async(tx)=>{
      const inv=await this.loadAuthorised(tx,located.id,hash);
      if(inv.lifecycle_status!=='pending'||new Date(inv.expires_at).getTime()<=Date.now()) return unavailable();
      const org=(await tx.query('SELECT name FROM organisations WHERE id=$1',[inv.organisation_id])).rows[0];
      const existing=(await tx.query('SELECT id FROM users WHERE LOWER(email)=$1',[inv.email.toLowerCase()])).rows.length>0;
      return {data:{id:inv.id,email:inv.email,name:inv.name,organisationName:org.name,role:inv.role,audience:inv.audience,
        expiresAt:date(inv.expires_at),requiresExistingSignIn:existing}};
    });
  }

  async accept(body: any, req: Request) {
    const hash=this.token(body),key=this.key(req),located=await this.locate(hash);
    const operation=`POST /auth/accept-invite/${located.id}`;
    return this.transaction(located.organisation_id,async(tx)=>{
      const inv=await this.loadAuthorised(tx,located.id,hash);
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`invitation-email:${inv.email.toLowerCase()}`]);
      let user=(await tx.query('SELECT * FROM users WHERE LOWER(email)=$1 FOR UPDATE',[inv.email.toLowerCase()])).rows[0];
      const newAccount=inv.acceptance_mode==='new'||(inv.lifecycle_status!=='accepted'&&!user);
      const requestedName=newAccount?(typeof body.name==='string'?body.name.trim():inv.name):null;
      const requestHash=digest({invitationId:located.id,tokenHash:hash,name:requestedName});
      const previous=await this.replay(tx,inv.organisation_id,key,operation,requestHash);
      if(inv.lifecycle_status==='accepted'&&!previous) return unavailable();
      if(inv.lifecycle_status!=='accepted'&&new Date(inv.expires_at).getTime()<=Date.now()) return unavailable();
      const existingMode=inv.acceptance_mode==='existing'||(inv.lifecycle_status!=='accepted'&&Boolean(user));
      if(user?.is_super_admin) fail('INVITATION_ROLE_NOT_ALLOWED','Existing platform administrators require separate governance.',403);
      if(existingMode) {
        const session=readSessionToken(req);
        const auth=session?(await tx.query(`SELECT s.user_id FROM sessions s WHERE s.token=$1 AND s.user_id=$2
          AND s.expires_at>clock_timestamp() AND EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=s.user_id AND NOT m.is_revoked) FOR UPDATE`,[session,user?.id])).rows[0]:null;
        if(!auth) fail('INVITATION_SIGN_IN_REQUIRED','Sign in to the existing invited account before accepting. Existing credentials are never replaced.',401);
      } else {
        if(typeof body.password!=='string'||body.password.length<8||Buffer.byteLength(body.password,'utf8')>72) fail('VALIDATION_ERROR','Password must contain at least 8 characters and at most 72 UTF-8 bytes.',400);
        if(previous) {
          const credential=(await tx.query("SELECT password FROM accounts WHERE user_id=$1 AND provider_id='credential'",[user?.id])).rows[0];
          if(!credential?.password||!verifyPassword(body.password,credential.password)) fail('INVITATION_SIGN_IN_REQUIRED','The original account credential is required to replay acceptance.',401);
        }
      }
      if(previous) {
        if(inv.lifecycle_status!=='accepted'||previous.actor_id!==inv.accepted_by) fail('IDEMPOTENCY_CONFLICT','Invitation receipt does not match the accepted account.',409);
        return previous.response_body;
      }
      if(user&&(await tx.query('SELECT id FROM memberships WHERE organisation_id=$1 AND user_id=$2',[inv.organisation_id,user.id])).rows.length) fail('MEMBERSHIP_ALREADY_EXISTS','Existing memberships cannot be changed or restored through invitations.',409);
      if(!user) {
        const name=requestedName;
        if(!name||name.length>200) fail('VALIDATION_ERROR','Name must contain 1–200 characters.',400);
        user=(await tx.query(`INSERT INTO users(email,name,email_verified,is_super_admin) VALUES($1,$2,true,false) RETURNING *`,[inv.email.toLowerCase(),name])).rows[0];
        await tx.query(`INSERT INTO accounts(user_id,account_id,provider_id,password) VALUES($1,$2,'credential',$3)`,[user.id,inv.email.toLowerCase(),hashPassword(body.password)]);
      }
      const membershipId=randomUUID();
      await tx.query('INSERT INTO memberships(id,organisation_id,user_id,role,audience,is_revoked) VALUES($1,$2,$3,$4,$5,false)',[membershipId,inv.organisation_id,user.id,inv.role,inv.audience]);
      await tx.query("UPDATE user_invitations SET lifecycle_status='accepted',accepted_at=clock_timestamp(),accepted_by=$2,acceptance_mode=$3 WHERE id=$1",[inv.id,user.id,existingMode?'existing':'new']);
      const event=await this.event(tx,inv.organisation_id,user.id,inv.id,'invitation.accepted',{membershipId,role:inv.role,audience:inv.audience,invitedBy:inv.invited_by});
      const result={success:true,message:'Invitation accepted. Organisation membership is now active.',membershipId,organisationId:inv.organisation_id,...event};
      await this.receipt(tx,inv.organisation_id,user.id,key,operation,requestHash,result);
      return result;
    });
  }
}
