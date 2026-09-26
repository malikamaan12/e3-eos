import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GovernanceController, approvalRequestRepository, type StoredApprovalRequest } from '../apps/api/src/governance/governance.controller.js';
import { projectRepository } from '../apps/api/src/projects/projects.controller.js';
import { EosApiClient } from '../apps/web/src/services/api-client.js';

const projectId = '91000000-0000-4000-8000-000000000001';
const orgId = '91000000-0000-4000-8000-000000000002';
const versionId = '91000000-0000-4000-8000-000000000003';
const approvalId = '91000000-0000-4000-8000-000000000004';
const hash = 'a'.repeat(64);
const controller = new GovernanceController();
const request = { organisationId: orgId, userId: 'reviewer', userRole: 'executive', headers: {} } as any;
const decision = { targetVersionId: versionId, targetHash: hash, outcome: 'approved' as const };
let baseline: StoredApprovalRequest;

beforeEach(() => {
  projectRepository.set(projectId, { id: projectId, organisationId: orgId } as any);
  baseline = { id: approvalId, projectId, organisationId: orgId, targetType: 'proposal', targetId: 'proposal', targetVersionId: versionId, targetHash: hash, requiredRole: 'executive', requesterId: 'requester', status: 'pending' };
  approvalRequestRepository.set(approvalId, { ...baseline });
});
afterEach(() => { vi.unstubAllGlobals(); approvalRequestRepository.delete(approvalId); projectRepository.delete(projectId); });

function rejected(action: () => unknown, status: number) {
  try { action(); throw new Error('Expected rejection'); } catch (error: any) { expect(error.getStatus()).toBe(status); }
  expect(approvalRequestRepository.get(approvalId)).toEqual(baseline);
}

describe('P01-ST06 exact approval decision boundaries', () => {
  it('does not create a request while deciding an unknown ID', () => {
    expect(() => controller.decideApproval(projectId, 'missing', decision, request)).toThrow();
    expect(approvalRequestRepository.has('missing')).toBe(false);
  });
  it('rejects cross-project requests without changing them', () => {
    baseline.projectId = 'another-project'; approvalRequestRepository.set(approvalId, { ...baseline });
    rejected(() => controller.decideApproval(projectId, approvalId, decision, request), 404);
  });
  it('rejects a stale reviewed version', () => {
    rejected(() => controller.decideApproval(projectId, approvalId, { ...decision, targetVersionId: orgId }, request), 412);
  });
  it('does not substitute a placeholder hash for reviewed content', () => {
    rejected(() => controller.decideApproval(projectId, approvalId, { ...decision, targetHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }, request), 412);
  });
  it('does not accept identity or authority from headers', () => {
    rejected(() => controller.decideApproval(projectId, approvalId, decision, { organisationId: orgId, headers: { 'x-user-id': 'reviewer', 'x-user-role': 'executive', 'x-is-super-admin': 'true' } } as any), 401);
  });
  it('requires the assigned role even when the actor administers the system', () => {
    rejected(() => controller.decideApproval(projectId, approvalId, decision, { ...request, userRole: 'super_admin', isSuperAdmin: true }), 403);
  });
  it('retains independence when the requester is the reviewer', () => {
    rejected(() => controller.decideApproval(projectId, approvalId, decision, { ...request, userId: 'requester' }), 403);
  });
  it('blocks approval when the original requester is unknown', () => {
    delete baseline.requesterId; approvalRequestRepository.set(approvalId, { ...baseline });
    rejected(() => controller.decideApproval(projectId, approvalId, decision, request), 412);
  });
  it('records the exact decision and will not overwrite a decided request', () => {
    const result = controller.decideApproval(projectId, approvalId, decision, request);
    expect(result.data.status).toBe('approved');
    expect(result.data.payload.targetHash).toBe(hash);
    const approved = { ...approvalRequestRepository.get(approvalId) };
    expect(() => controller.decideApproval(projectId, approvalId, { ...decision, outcome: 'rejected' }, request)).toThrow();
    expect(approvalRequestRepository.get(approvalId)).toEqual(approved);
  });
  it('preserves returned-for-revision as a distinct decision', () => {
    expect(controller.decideApproval(projectId, approvalId, { ...decision, outcome: 'changes_requested' }, request).data.status).toBe('changes_requested');
  });
});

describe('Approval client never invents evidence', () => {
  const client = new EosApiClient({ organisationId: orgId, userId: 'reviewer', baseUrl: 'http://localhost/api/v1' });
  it('does not transmit a decision without the reviewed identity', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(client.decideApproval(projectId, approvalId, { outcome: 'approved' } as any)).rejects.toThrow('reviewed version');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not upgrade conditional intent into unconditional approval', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(client.decideApproval(projectId, approvalId, { ...decision, outcome: 'conditional' } as any)).rejects.toThrow('Conditional');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('sends the exact reviewed target and keeps stale-write failures visible', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 412, json: async () => ({ detail: 'Reviewed version changed' }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(client.decideApproval(projectId, approvalId, decision)).rejects.toThrow('Reviewed version changed');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject(decision);
  });
  it('does not report an unavailable queue as empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ detail: 'Store unavailable' }) }));
    await expect(client.getApprovalRequests(projectId)).rejects.toThrow('Store unavailable');
  });
});
