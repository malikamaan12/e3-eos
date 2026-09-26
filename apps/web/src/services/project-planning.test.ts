import {afterEach,describe,expect,it,vi} from 'vitest';
import {EosApiClient} from './api-client.js';
const client=new EosApiClient({baseUrl:'http://localhost/api/v1',organisationId:'org',userId:'actor'});
const response=(data:unknown,status=200)=>({ok:status<400,status,json:async()=>data});
afterEach(()=>vi.unstubAllGlobals());
describe('Planning register client',()=>{
  it.each([401,403,404,503])('preserves unavailable state rather than fixture success (%s)',async status=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({detail:'Scope unavailable'},status)));
    for(const read of [()=>client.getAllocations('PRJ-2026-DEMO'),()=>client.getDesignBriefs('PRJ-2026-DEMO'),()=>client.getImpactRegister('PRJ-2026-DEMO')])await expect(read()).rejects.toMatchObject({status});
  });
  it('retains reviewed source versions, unknown quantity and stable allocation retry key',async()=>{
    const input={requirementId:'req',expectedRequirementVersion:2,quantity:null,zone:null,department:'Production',reason:'Plan revised source'},fetch=vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce(response({data:{id:'allocation',auditEventId:'audit',eventId:'event'}},201));vi.stubGlobal('fetch',fetch);
    await expect(client.createAllocation('project',input,'key')).rejects.toThrow('Lost response');await client.createAllocation('project',input,'key');
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(input);
  });
  it('keeps exact design source pins and target version in revision requests',async()=>{
    const fetch=vi.fn().mockResolvedValue(response({data:{auditEventId:'audit',eventId:'event'}},201));vi.stubGlobal('fetch',fetch);
    const input={title:'Brief',brief:'Review source versions',requirementRefs:[{requirementId:'req',expectedVersion:3}],allocationRefs:[{allocationId:'allocation',expectedVersion:2}],expectedVersion:1,reason:'Update brief'};
    await client.reviseDesignBrief('project','design',input,'reviewed-key');
    expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/v1/projects/project/design-register/design/revisions');expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(input);
  });
  it('does not confirm an assessment without its command receipt',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({data:{id:'assessment'}},201)));
    await expect(client.createImpactAssessment('project',{targetType:'design',targetId:'design',expectedTargetVersion:1,impactFingerprint:'a'.repeat(64),assessment:'Quantity changed',proposedAction:'Revise',reason:'Review source'},'key')).rejects.toMatchObject({status:502});
  });
  it('propagates stale fingerprints and refuses malformed lists',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({detail:'Source changed'},409)));
    await expect(client.createImpactAssessment('project',{targetType:'allocation',targetId:'a',expectedTargetVersion:1,impactFingerprint:'a'.repeat(64),assessment:'Changed',proposedAction:'Revise',reason:'Review'},'key')).rejects.toMatchObject({status:409});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({data:{}})));
    await expect(client.getAllocations('project')).rejects.toMatchObject({status:502});await expect(client.getImpactRegister('project')).rejects.toMatchObject({status:502});
  });
});
