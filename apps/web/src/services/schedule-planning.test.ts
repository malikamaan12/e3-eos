import {afterEach,describe,expect,it,vi} from 'vitest';
import {EosApiClient} from './api-client.js';
const client=new EosApiClient({baseUrl:'http://localhost/api/v1',organisationId:'org',userId:'actor'});
const reply=(data:unknown,status=200)=>({ok:status<400,status,json:async()=>data});
afterEach(()=>vi.unstubAllGlobals());
describe('Schedule planning client',()=>{
  it('preserves capture identity and the reviewed fingerprint after a lost response',async()=>{
    const fetch=vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockResolvedValue(reply({data:{id:'candidate',auditEventId:'a',eventId:'e'}},201));vi.stubGlobal('fetch',fetch);
    const input={title:'Review',reason:'Freeze reviewed dates',expectedFingerprint:'a'.repeat(64)};
    await expect(client.captureBaselineCandidate('project',input,'stable')).rejects.toThrow('Lost response');await client.captureBaselineCandidate('project',input,'stable');
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(input);
  });
  it('does not turn forbidden or malformed planning reads into empty success',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({detail:'Forbidden'},403)));await expect(client.getSchedulePlanning('p')).rejects.toMatchObject({status:403});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({data:{}})));await expect(client.previewBaselineCandidate('p')).rejects.toThrow('Invalid baseline preview');await expect(client.compareBaselineCandidate('p','b')).rejects.toThrow('Invalid baseline comparison');
  });
  it('sends milestone unknowns without approved fields and requires durable receipts',async()=>{
    const fetch=vi.fn().mockResolvedValue(reply({data:{id:'m'}},201));vi.stubGlobal('fetch',fetch);
    const input={kind:'milestone' as const,title:'Opening',payload:{targetAt:null,timezone:null,notes:''},reason:'Awaiting date'};
    await expect(client.createSchedulePlan('p',input,'key')).rejects.toMatchObject({status:502});expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(input);
  });
});
