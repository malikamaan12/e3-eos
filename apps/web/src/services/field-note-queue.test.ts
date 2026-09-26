import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {readFieldNotes,saveFieldNote,clearReceivedFieldNotes,confirmsFieldNote,type QueuedFieldNote} from './field-note-queue.js';
import type {FieldNoteReceipt} from './project-control.js';
class LocalStore implements Storage {
  data=new Map<string,string>();get length(){return this.data.size;}clear(){this.data.clear();}getItem(key:string){return this.data.get(key)??null;}key(i:number){return [...this.data.keys()][i]??null;}removeItem(key:string){this.data.delete(key);}setItem(key:string,value:string){this.data.set(key,value);}
}
function capture():QueuedFieldNote {return{organisationId:randomUUID(),actorId:randomUUID(),projectId:randomUUID(),input:{clientOperationId:randomUUID(),deviceId:randomUUID(),capturedAt:new Date().toISOString(),note:'Panel position observed',reason:'Record installation progress'}};}
function receipt(item:QueuedFieldNote):FieldNoteReceipt {return{...item.input,id:randomUUID(),organisationId:item.organisationId,actorId:item.actorId,projectId:item.projectId,receivedAt:new Date().toISOString(),clientTimestampClaimed:true,deviceIdClaimed:true,contractVersion:'field-observation.v1',taskId:item.input.taskId ?? null,baseVersion:item.input.baseVersion ?? null,currentTaskVersion:null,status:'accepted',payloadHash:'a'.repeat(64),auditEventId:randomUUID(),eventId:randomUUID(),authorityEffect:'observation_only'};}
describe('Field note queue custody',()=>{
  it('keeps failed notes after reload and separates organizations and users',()=>{
    const store=new LocalStore(),item=capture();saveFieldNote(store,{...item,lastError:'Connection lost'});
    expect(readFieldNotes(store,item.organisationId,item.actorId)).toHaveLength(1);
    expect(readFieldNotes(store,randomUUID(),item.actorId)).toEqual([]);
    expect(readFieldNotes(store,item.organisationId,randomUUID())).toEqual([]);
    clearReceivedFieldNotes(store,item.organisationId,item.actorId,item.projectId);
    expect(readFieldNotes(store,item.organisationId,item.actorId)[0].lastError).toBe('Connection lost');
  });
  it('rejects an acknowledgement belonging to another project, actor, operation or payload',()=>{
    const item=capture(),valid=receipt(item);
    for(const patch of [{projectId:randomUUID()},{actorId:randomUUID()},{clientOperationId:randomUUID()},{note:'Different note'},{auditEventId:''},{authorityEffect:'task_completed'}])expect(confirmsFieldNote(item,{...valid,...patch} as FieldNoteReceipt)).toBe(false);
    const store=new LocalStore();saveFieldNote(store,item);
    expect(()=>saveFieldNote(store,{...item,receipt:{...valid,projectId:randomUUID()}})).toThrow('does not match');
    expect(readFieldNotes(store,item.organisationId,item.actorId)[0].receipt).toBeUndefined();
  });
  it('retains conflict acknowledgements and clears only matching received copies from the selected project',()=>{
    const store=new LocalStore(),first=capture(),second={...capture(),organisationId:first.organisationId,actorId:first.actorId};
    saveFieldNote(store,{...first,receipt:{...receipt(first),status:'accepted_as_observation_with_conflict'}});saveFieldNote(store,second);
    clearReceivedFieldNotes(store,first.organisationId,first.actorId,second.projectId);expect(store.length).toBe(2);
    clearReceivedFieldNotes(store,first.organisationId,first.actorId,first.projectId);
    expect(readFieldNotes(store,first.organisationId,first.actorId).map(item=>item.projectId)).toEqual([second.projectId]);
  });
  it('never edits an immutable capture or downgrades a receipt after a late network error',()=>{
    const store=new LocalStore(),item=capture(),confirmed=receipt(item);saveFieldNote(store,item);
    expect(()=>saveFieldNote(store,{...item,input:{...item.input,note:'Rewritten'}})).toThrow('cannot be edited');
    saveFieldNote(store,{...item,receipt:confirmed});saveFieldNote(store,{...item,lastError:'Late error'});
    expect(readFieldNotes(store,item.organisationId,item.actorId)[0].receipt).toEqual(confirmed);
  });
  it('preserves malformed storage for recovery and refuses to dispatch or clear it',()=>{
    const store=new LocalStore(),item=capture();saveFieldNote(store,item);store.setItem(store.key(0)!,'{broken');
    expect(()=>readFieldNotes(store,item.organisationId,item.actorId)).toThrow();
    expect(()=>clearReceivedFieldNotes(store,item.organisationId,item.actorId,item.projectId)).toThrow();expect(store.length).toBe(1);
  });
});
