import { afterEach, describe, expect, it, vi } from 'vitest';
import { EosApiClient } from './api-client.js';
const client = new EosApiClient({baseUrl:'http://localhost/api/v1',organisationId:'org',userId:'actor'});
const response = (data:unknown,status=200) => ({ok:status<400,status,json:async()=>data});
afterEach(()=>vi.unstubAllGlobals());
describe('Project control client boundary',()=>{
  it.each([401,403,404,503])('keeps inaccessible registers unavailable (%s)',async status=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({detail:'Current scope unavailable'},status)));
    for(const read of [()=>client.getIntakeRequirements('PRJ-2026-DEMO'),()=>client.getRecordedClarifications('PRJ-2026-DEMO'),()=>client.getFieldObservations('PRJ-2026-DEMO')])await expect(read()).rejects.toMatchObject({status});
  });
  it('keeps original wording and unknown quantity through a lost response and stable retry',async()=>{
    const input={title:'Source requirement',originalWording:'  Original source text\n',sourceType:'manual' as const,quantity:null,reason:'Record source'};
    const fetch=vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(response({data:{id:'id',auditEventId:'audit',eventId:'event'}},201));vi.stubGlobal('fetch',fetch);
    await expect(client.createIntakeRequirement('project',input,'stable-key')).rejects.toThrow('Connection lost');
    await client.createIntakeRequirement('project',input,'stable-key');
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(input);
  });
  it('sends clarification answer attribution and reviewed version in the project scope',async()=>{
    const fetch=vi.fn().mockResolvedValue(response({data:{auditEventId:'audit',eventId:'event'}},201));vi.stubGlobal('fetch',fetch);
    const input={expectedVersion:3,response:'Source answer',respondentAttribution:'Meeting participant',sourceAttribution:'Meeting notes',reason:'Record response'};
    await client.respondRecordedClarification('project','question',input,'answer-key');
    expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/v1/projects/project/scope-register/clarifications/question/respond');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(input);
    expect(fetch.mock.calls[0][1].headers['idempotency-key']).toBe('answer-key');
  });
  it('refuses incomplete history, missing receipt and a command without a stable key',async()=>{
    const fetch=vi.fn().mockResolvedValue(response({data:{}}));vi.stubGlobal('fetch',fetch);
    await expect(client.getIntakeRevisions('project','requirement')).rejects.toMatchObject({status:502});
    await expect(client.reopenRecordedClarification('project','question',{expectedVersion:2,reason:'Recheck'},'key')).rejects.toMatchObject({status:502});
    fetch.mockClear();
    await expect(client.reopenRecordedClarification('project','question',{expectedVersion:2,reason:'Recheck'},'')).rejects.toMatchObject({status:400});
    expect(fetch).not.toHaveBeenCalled();
  });
  it('invalidates the dispatcher scope when the organization or actor changes',()=>{
    const scoped=new EosApiClient({organisationId:'org',userId:'actor'});
    expect(scoped.isCurrentScope('org','actor')).toBe(true);
    scoped.setContext('other','actor');expect(scoped.isCurrentScope('org','actor')).toBe(false);
    scoped.setContext('org','other');expect(scoped.isCurrentScope('org','actor')).toBe(false);
  });
});
