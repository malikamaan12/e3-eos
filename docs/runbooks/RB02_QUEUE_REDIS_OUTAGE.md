# Operational Runbook RB02: Queue / Redis Outage

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** At-least-once delivery, zero loss of business intent, consumer idempotency (`AT-009`, `AT-092`)

---

## 1. Immediate Triage & Containment
1. **Detect Outage**: BullMQ alerts `ECONNREFUSED` or Memorystore Redis instance is unavailable.
2. **Durable Persistence Invariant**:
   - The primary API continues recording transactional business events into PostgreSQL table `outbox_events` (`status: 'pending'`).
   - Synchronous user requests (e.g. creating projects, submitting approvals) succeed without failing on queue drops.
3. **Display Notification Hint**:
   - Web clients are informed that background notifications, report generation, and external syncs are queued and delayed.

---

## 2. Recovery Procedure
1. **Restore Redis Instance**:
   - If Memorystore failover did not resolve, reboot instance:
     ```bash
     gcloud redis instances failover e3-eos-redis-production --region me-central1
     ```
2. **Re-Enqueue Durable Outbox Messages**:
   - Run worker synchronization job to read all un-dispatched events from PostgreSQL:
     ```bash
     pnpm --filter @e3-eos/worker run sync:outbox
     ```
3. **Consumer Idempotency Protection**:
   - Consumers verify message IDs against the `processed_events` log.
   - Any replayed or duplicate messages are safely marked `duplicate_replay_ignored` without re-executing side effects (`AT-009`).
