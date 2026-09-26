import { afterEach, describe, expect, it, vi } from 'vitest';
import { EosApiClient } from './api-client.js';
const client = new EosApiClient({ baseUrl: 'http://localhost/api/v1', organisationId: 'org', userId: 'person' });
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
afterEach(() => vi.unstubAllGlobals());
describe('Recorded module client boundary', () => {
  it.each([401,403,404,503])('preserves module unavailability instead of returning fixture data (%s)', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Current project access unavailable' },status)));
    await expect(client.getTasks('PRJ-2026-DEMO')).rejects.toMatchObject({status});
    await expect(client.getControlledDocuments('PRJ-2026-DEMO')).rejects.toMatchObject({status});
    await expect(client.getTransmittals('PRJ-2026-DEMO')).rejects.toMatchObject({status});
    await expect(client.getReportSnapshots('PRJ-2026-DEMO')).rejects.toMatchObject({status});
    await expect(client.getPortfolioSummary()).rejects.toMatchObject({status});
  });
  it('rejects an incomplete list and an unconfirmed command receipt', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({data:{}})));
    await expect(client.getDocumentRegister('project')).rejects.toThrow('incomplete');
    await expect(client.createRecordedPackage('project',{name:'Package',ownerId:'user',reason:'Assigned delivery'},'key')).rejects.toThrow('receipt');
  });
  it('retries a lost completion response with the reviewed version, reason, evidence and same key', async () => {
    const payload = { expectedVersion:3, reason:'Task finished', completionEvidence:'Inspection note 13' };
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(response({data:{id:'task',recordVersion:4,auditEventId:'audit',eventId:'event'}},201));
    vi.stubGlobal('fetch',fetch);
    await expect(client.completeRecordedTask('project','task',payload,'stable-key')).rejects.toThrow('Connection lost');
    await client.completeRecordedTask('project','task',payload,'stable-key');
    expect(fetch.mock.calls[0]).toEqual(fetch.mock.calls[1]);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(payload);
  });
  it.each([409,412,428])('keeps a stale or missing version decision unconfirmed (%s)', async status => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({detail:'Refresh the record and review the version'},status)));
    await expect(client.registerDocumentRevision('project','document',{revisionCode:'R1',changeSummary:'New draft',expectedVersion:1,reason:'Record revision'},'key')).rejects.toMatchObject({status});
  });
  it('does not dispatch a command without a stable key', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch',fetch);
    await expect(client.createReportSnapshot('project',{reportCode:'R1',periodStart:'2026-09-01',periodEnd:'2026-09-26',reason:'Capture current state'},'')).rejects.toMatchObject({status:400});
    expect(fetch).not.toHaveBeenCalled();
  });
});
