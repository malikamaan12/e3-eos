import {afterEach,describe,expect,it,vi} from 'vitest';
import {EosApiClient} from './api-client.js';
const client=new EosApiClient({baseUrl:'http://localhost/api/v1',organisationId:'org',userId:'actor'});
const reply=(data:unknown,status=200)=>({ok:status<400,status,json:async()=>data});
afterEach(()=>vi.unstubAllGlobals());
describe('Schedule client',()=>{
  it.each([401,403,404,503])('keeps unavailable schedule and calendar requests visible (%s)',async status=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({detail:'Unavailable'},status)));
    await expect(client.getTimeline('PRJ-2026-DEMO')).rejects.toMatchObject({status});await expect(client.getForecastCalendar('from','until')).rejects.toMatchObject({status});
  });
  it('retains exact forecast instants, null clearing and command identity after response loss',async()=>{
    const fetch=vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockResolvedValue(reply({data:{auditEventId:'a',eventId:'e'}},201));vi.stubGlobal('fetch',fetch);
    const input={expectedTaskVersion:2,expectedForecastVersion:1,startAt:null,finishAt:null,timezone:null,reason:'Clear forecast'};
    await expect(client.changeForecast('p','t',input,'stable')).rejects.toThrow('Lost response');await client.changeForecast('p','t',input,'stable');
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(input);expect(fetch.mock.calls[1][1].method).toBe('POST');
  });
  it('sends reviewed dependency versions and refuses missing audit receipts',async()=>{
    const fetch=vi.fn().mockResolvedValue(reply({data:{id:'edge'}},201));vi.stubGlobal('fetch',fetch);
    const input={predecessorId:'a',successorId:'b',expectedPredecessorVersion:2,expectedSuccessorVersion:3,dependencyType:'FS' as const,reason:'Sequence work'};
    await expect(client.addScheduleDependency('p',input,'key')).rejects.toMatchObject({status:502});expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(input);
  });
  it('does not turn malformed timeline or calendar records into an empty success',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(reply({data:{}})));await expect(client.getTimeline('p')).rejects.toThrow('Invalid schedule');await expect(client.getForecastCalendar('from','until')).rejects.toThrow('Invalid calendar');
  });
});
