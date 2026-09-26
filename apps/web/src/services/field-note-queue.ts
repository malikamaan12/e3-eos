import type { FieldNoteInput, FieldNoteReceipt } from './project-control.js';

export interface QueuedFieldNote {organisationId:string;actorId:string;projectId:string;input:FieldNoteInput;receipt?:FieldNoteReceipt;lastError?:string}
const prefix = 'e3:field-note:v1:';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function scope(org:string,actor:string) {
  if (!uuid.test(org) || !uuid.test(actor)) throw new Error('A verified organization and user are required for local capture.');
  return `${prefix}${org}:${actor}:`;
}
function key(item:QueuedFieldNote) { if (!uuid.test(item.input.clientOperationId)) throw new Error('Invalid capture identity.'); return scope(item.organisationId,item.actorId)+item.input.clientOperationId; }
export function confirmsFieldNote(item:QueuedFieldNote, receipt:FieldNoteReceipt): boolean {
  return !!receipt && receipt.organisationId===item.organisationId && receipt.actorId===item.actorId && receipt.projectId===item.projectId
    && receipt.clientOperationId===item.input.clientOperationId && receipt.deviceId===item.input.deviceId
    && receipt.note===item.input.note && receipt.reason===item.input.reason
    && Date.parse(receipt.capturedAt)===Date.parse(item.input.capturedAt)
    && (receipt.taskId || null)===(item.input.taskId || null) && (receipt.baseVersion ?? null)===(item.input.baseVersion ?? null)
    && receipt.clientTimestampClaimed===true && receipt.deviceIdClaimed===true && receipt.contractVersion==='field-observation.v1' && receipt.authorityEffect==='observation_only'
    && ['accepted','accepted_as_observation_with_conflict'].includes(receipt.status)
    && uuid.test(receipt.id) && uuid.test(receipt.auditEventId) && uuid.test(receipt.eventId)
    && /^[0-9a-f]{64}$/.test(receipt.payloadHash) && Number.isFinite(Date.parse(receipt.receivedAt));
}
export function readFieldNotes(storage:Storage,org:string,actor:string): QueuedFieldNote[] {
  const scopedPrefix=scope(org,actor), result:QueuedFieldNote[]=[];
  for(let i=0;i<storage.length;i++) {
    const storedKey=storage.key(i); if(!storedKey?.startsWith(scopedPrefix))continue;
    const item=JSON.parse(storage.getItem(storedKey) || 'null') as QueuedFieldNote;
    if(!item || item.organisationId!==org || item.actorId!==actor || !uuid.test(item.projectId) || !item.input || key(item)!==storedKey
      || typeof item.input.note!=='string' || typeof item.input.reason!=='string' || !uuid.test(item.input.deviceId)
      || !Number.isFinite(Date.parse(item.input.capturedAt))) throw new Error('A stored field note is damaged. No local records were removed.');
    if(item.receipt && !confirmsFieldNote(item,item.receipt))throw new Error('A stored acknowledgement could not be verified. The note is retained.');
    result.push(item);
  }
  return result.sort((a,b)=>b.input.capturedAt.localeCompare(a.input.capturedAt));
}
/** One storage key per immutable capture avoids replacing other tabs' queues. */
export function saveFieldNote(storage:Storage,item:QueuedFieldNote):void {
  const storageKey=key(item), previous=storage.getItem(storageKey);
  if(previous) {
    const prior=JSON.parse(previous) as QueuedFieldNote;
    if(JSON.stringify(prior.input)!==JSON.stringify(item.input) || prior.projectId!==item.projectId)throw new Error('A captured note cannot be edited. Create a separate observation.');
    if(prior.receipt && confirmsFieldNote(prior,prior.receipt) && !item.receipt)return;
  }
  if(item.receipt && !confirmsFieldNote(item,item.receipt))throw new Error('The server receipt does not match this capture. The note remains on this device.');
  storage.setItem(storageKey,JSON.stringify(item));
}
export function clearReceivedFieldNotes(storage:Storage,org:string,actor:string,projectId:string) {
  const items=readFieldNotes(storage,org,actor);
  for(const item of items)if(item.projectId===projectId && item.receipt && confirmsFieldNote(item,item.receipt))storage.removeItem(key(item));
}
export function fieldDeviceId(storage:Storage):string {
  const deviceKey=prefix+'device', existing=storage.getItem(deviceKey);
  if(existing && uuid.test(existing))return existing;
  const id=crypto.randomUUID(); storage.setItem(deviceKey,id); return id;
}
