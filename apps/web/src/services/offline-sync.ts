/**
 * The current field-sync API acknowledges validation in memory only. Captures
 * must stay on the device until a durable, scoped receipt contract is shipped.
 */
export const FIELD_SYNC_UNAVAILABLE =
  'Server sync is unavailable. These captures remain provisional on this device until durable server storage is available.';

export interface RecoverableOfflineCapture {
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  syncedAt?: string;
  syncError?: string;
}

export function recoverOfflineCaptures<T extends RecoverableOfflineCapture>(captures: T[]): T[] {
  return captures.map((capture) => {
    // Earlier clients marked captures synced without any server request. A
    // persisted legacy status is not evidence that a server received the data.
    if (capture.status === 'synced' || capture.status === 'syncing') {
      return { ...capture, status: 'failed', syncedAt: undefined, syncError: FIELD_SYNC_UNAVAILABLE };
    }
    return capture;
  });
}
