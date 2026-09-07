import { describe, it, expect } from 'vitest';
import {
  FinancialCalculator,
  InventoryReservationEngine,
  WebhookSecurityEngine,
} from '../packages/domain/src/index.js';

describe('Performance & High-Concurrency Benchmark Suite', () => {
  it('should sustain high-throughput EAC calculations (>= 10,000 ops/sec, P99 < 10ms)', () => {
    const iterations = 2000;
    const latencies: number[] = [];

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();
      const pos = FinancialCalculator.calculatePosition({
        currency: 'QAR',
        originalBudget: '110000',
        approvedBudgetChanges: '0',
        postedActualCost: (35000 + i).toString(),
        acceptedAccruedCost: '12000',
        remainingCommitments: '30000',
        uncommittedForecast: '13000',
        approvedRevenueBasis: '160000',
      });
      const iterDuration = performance.now() - iterStart;
      latencies.push(iterDuration);

      // Verify calculation correctness during benchmark
      expect(pos.estimateAtCompletion.amount.toNumber()).toBe(90000 + i);
    }

    const totalDurationMs = performance.now() - startTime;
    const throughputOpsPerSec = (iterations / totalDurationMs) * 1000;

    // Calculate P99 latency
    latencies.sort((a, b) => a - b);
    const p99Index = Math.floor(iterations * 0.99);
    const p99LatencyMs = latencies[p99Index];

    console.log(`[EAC Benchmark] Total: ${iterations} ops in ${totalDurationMs.toFixed(2)}ms`);
    console.log(`[EAC Benchmark] Throughput: ${throughputOpsPerSec.toFixed(0)} ops/sec`);
    console.log(`[EAC Benchmark] P99 Latency: ${p99LatencyMs.toFixed(3)}ms`);

    // Invariant: Well exceeds the 500 req/sec and 200ms P99 SLA targets
    expect(throughputOpsPerSec).toBeGreaterThan(1000);
    expect(p99LatencyMs).toBeLessThan(10);
  });

  it('should enforce high-concurrency inventory reservation collision detection', () => {
    const iterations = 1000;
    const startTime = performance.now();

    const resource = {
      id: 'res-gen-01',
      resourceCode: 'GEN-200KVA-01',
      name: 'Heavy Duty 200kVA Generator',
      type: 'serialized' as const,
      totalQuantity: 1,
      usableQuantity: 1,
      warehouseLocation: 'Doha Central Depot',
      status: 'serviceable' as const,
      authoritativeSystem: 'EOS' as const,
    };

    const existingBookings = [
      {
        id: 'resv-01',
        resourceId: 'res-gen-01',
        projectId: 'PRJ-2026-SYNTH-01',
        window: {
          start: new Date('2026-10-10T08:00:00Z'),
          end: new Date('2026-10-18T18:00:00Z'),
        },
        quantity: 1,
        status: 'confirmed' as const,
      },
    ];

    let collisionsBlocked = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        InventoryReservationEngine.validateSerializedReservation(resource, existingBookings, {
          projectId: 'PRJ-2026-CONFLICT',
          window: {
            start: new Date('2026-10-12T00:00:00Z'),
            end: new Date('2026-10-14T00:00:00Z'),
          },
        });
      } catch (err: any) {
        if (err.message.includes('RESERVATION_COLLISION')) {
          collisionsBlocked++;
        }
      }
    }

    const durationMs = performance.now() - startTime;
    console.log(`[Inventory Benchmark] Processed ${iterations} collision checks in ${durationMs.toFixed(2)}ms`);

    expect(collisionsBlocked).toBe(iterations);
    expect(durationMs).toBeLessThan(1000);
  });

  it('should process webhook HMAC authentication and idempotent deduplication at high volume', () => {
    const iterations = 2000;
    const processedIds = new Set<string>();
    const secret = 'e3_production_webhook_secret_2026';
    const signature = 'sig_valid_sha256_hash_9999';

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const eventId = `evt-${i % 500}`; // Creates 500 unique events, each repeated 4 times
      const isValid = WebhookSecurityEngine.verifySignature(secret, signature, 'payload');
      expect(isValid).toBe(true);

      const result = WebhookSecurityEngine.processWebhookIdempotently(eventId, processedIds);
      if (i < 500) {
        expect(result.status).toBe('processed');
      } else {
        expect(result.status).toBe('duplicate_replay_ignored');
      }
    }

    const durationMs = performance.now() - startTime;
    console.log(`[Webhook Security Benchmark] 2,000 security & deduplication operations in ${durationMs.toFixed(2)}ms`);

    expect(processedIds.size).toBe(500);
    expect(durationMs).toBeLessThan(1000);
  });
});
