# Operational Runbook RB01: Database / API Outage

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** Zero data loss (`RPO < 15 min`, `RTO < 4h`), outbox replay idempotency (`AT-009`, `AT-087`)

---

## 1. Immediate Triage & Containment
1. **Detect Outage**: Health probe `/api/v1/health` fails or Cloud SQL instance becomes unreachable.
2. **Degraded State Mode**:
   - Web application switches to `degraded_readonly` mode.
   - User notification: *"Database maintenance or failover in progress. Data is preserved. New transactions temporarily queued."*
3. **Inhibit Consequential Writes**: Stop payment releases, PO commitments, or site opening releases while database connectivity is impaired.

---

## 2. Recovery Procedure
1. **Regional Failover**:
   - If Cloud SQL primary zone experiences hardware fault, trigger automated failover to standby replica:
     ```bash
     gcloud sql instances failover e3-eos-pg-production
     ```
2. **Point-in-Time Recovery (PITR)** (if data corruption or cold recovery needed):
   - Restore database to the last verified transaction timestamp:
     ```bash
     gcloud sql instances clone e3-eos-pg-production e3-eos-pg-recovery --point-in-time "2026-09-07T04:00:00Z"
     ```
3. **Manifest Parity Verification**:
   - Run restore parity verification drill (`AT-087`):
     ```bash
     pnpm --filter @e3-eos/api run test:restore-parity
     ```
4. **Replay Outbox Queue**:
   - Background worker reconnects and scans `outbox_events` table for unconfirmed records.
   - Processes pending messages with deduplication guarantees (`AT-009`).
