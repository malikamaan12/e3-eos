import { afterEach, describe, expect, it, vi } from 'vitest';
import { EosApiClient } from './api-client.js';
import { FIELD_SYNC_UNAVAILABLE, recoverOfflineCaptures } from './offline-sync.js';

afterEach(() => vi.unstubAllGlobals());

describe('Offline capture truthfulness', () => {
  it('does not send observations to the non-durable endpoint, even when a server could return applied', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { results: [{ clientOperationId: 'op-1', status: 'applied' }] } }),
    });
    vi.stubGlobal('fetch', fetch);
    const client = new EosApiClient({ organisationId: 'org-1', userId: 'user-1' });

    await expect(client.syncFieldBatch({ operations: [{ clientOperationId: 'op-1' }] }))
      .rejects.toMatchObject({ message: FIELD_SYNC_UNAVAILABLE, status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('recovers old simulated successes and interrupted sync without losing source identity or payload', () => {
    const persisted = [
      { id: 'a', projectId: 'project-a', actorId: 'worker-a', entityVersion: 3, payload: { note: 'Evidence A' }, status: 'synced' as const, syncedAt: '2026-09-01T10:00:00Z' },
      { id: 'b', projectId: 'project-b', payload: { note: 'Evidence B' }, status: 'syncing' as const },
    ];

    const recovered = recoverOfflineCaptures(persisted);
    expect(recovered).toHaveLength(2);
    expect(recovered[0]).toMatchObject({ id: 'a', projectId: 'project-a', actorId: 'worker-a', entityVersion: 3, payload: persisted[0].payload, status: 'failed', syncError: FIELD_SYNC_UNAVAILABLE });
    expect(recovered[1]).toMatchObject({ id: 'b', projectId: 'project-b', payload: persisted[1].payload, status: 'failed' });
    expect(recovered.every((capture) => capture.syncedAt === undefined)).toBe(true);
    expect(persisted[0].status).toBe('synced');
  });

  it('preserves pending captures and failure details across reload', () => {
    const persisted = [
      { id: 'a', status: 'pending' as const, payload: { note: 'unsent' } },
      { id: 'b', status: 'failed' as const, syncError: 'Access expired', payload: { note: 'retained' } },
    ];
    expect(recoverOfflineCaptures(persisted)).toEqual(persisted);
  });
});
