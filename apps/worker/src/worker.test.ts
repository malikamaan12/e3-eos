import { describe, it, expect } from 'vitest';
import { OutboxProcessor, OutboxMessage } from './index.js';

describe('AT-009: Dedicated Worker & Outbox Idempotency', () => {
  it('prevents duplicate processing when a queue job is retried after a process crash', async () => {
    const processor = new OutboxProcessor();

    const message: OutboxMessage = {
      id: 'outbox-1',
      eventId: 'evt-po-released-100',
      organisationId: 'org-01',
      projectId: 'prj-01',
      eventType: 'purchase_order.released.v1',
      payload: { poId: 'po-100', amount: '50000.00' },
      status: 'pending',
      retryCount: 0,
    };

    // First processing attempt
    const res1 = await processor.processEvent(message);
    expect(res1.success).toBe(true);
    expect(res1.duplicate).toBe(false);
    expect(message.status).toBe('dispatched');

    // Simulate worker crash / retry delivery of the same message
    const res2 = await processor.processEvent(message);
    expect(res2.success).toBe(true);
    expect(res2.duplicate).toBe(true); // Flagged as duplicate; NO duplicate side effect!
  });
});
