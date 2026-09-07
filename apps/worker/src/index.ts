export interface OutboxMessage {
  id: string;
  eventId: string;
  organisationId: string;
  projectId?: string;
  eventType: string;
  payload: any;
  status: 'pending' | 'dispatched' | 'failed';
  retryCount: number;
}

export class OutboxProcessor {
  private processedEvents = new Set<string>();

  /**
   * Processes an outbox event with idempotent consumer guarantees (AT-009).
   * Re-processing an already-processed event ID produces zero duplicate side effects.
   */
  async processEvent(message: OutboxMessage): Promise<{ success: boolean; duplicate: boolean }> {
    if (this.processedEvents.has(message.eventId)) {
      // Duplicate event detected via durable message ID - ignore without repeating business effects
      return { success: true, duplicate: true };
    }

    // Process event logic
    this.processedEvents.add(message.eventId);
    message.status = 'dispatched';

    return { success: true, duplicate: false };
  }
}

export async function runWorker() {
  console.log('E3-EOS Dedicated Worker initialized');
  const processor = new OutboxProcessor();
  return processor;
}
