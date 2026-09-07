# E3-EOS Release Evidence: Operational Readiness & Support Runbooks

**Release:** `v1.0.0`  
**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md`

---

## 1. Platform Infrastructure & Environment

- **Core API**: NestJS 10 running on Node.js 22 LTS with cluster mode / container scaling.
- **Database**: Managed PostgreSQL 16 with write-ahead logging (WAL), automated snapshot backups every 6 hours, and continuous point-in-time recovery (PITR).
- **Object Storage**: S3-compatible cloud object store for drawings, photos, and report manifests.
- **Worker & Queue**: Dedicated background worker (`apps/worker`) reading outbox events with idempotent message processing.

---

## 2. Standard Operational Runbooks

### Runbook 1: Production Deployment & Smoke Verification
1. Verify pre-flight production deployment gate (`AT-089`):
   ```bash
   pnpm test
   pnpm typecheck
   ```
2. Apply database migrations:
   ```bash
   pnpm db:migrate
   ```
3. Deploy new API container instances; health check `/api/health` returns 200 OK.
4. Verify authoritative writer cutover status (`AT-052`).

### Runbook 2: Background Worker Crash Recovery (`AT-092`)
1. In the event of worker crash or container ungraceful termination:
2. Restart container or launch standby worker instance.
3. Worker connects to Postgres outbox table and message broker.
4. Processes pending events with deduplication guarantees; duplicate event IDs are logged as `duplicate_replay_ignored` with zero double execution.

### Runbook 3: Cold-Site Restore Drill (`AT-087`)
1. Download latest encrypted Postgres backup snapshot and object store manifest.
2. Spin up isolated staging database instance and restore database dump.
3. Execute `RolloutService.verifyRestoreParity(manifest)`:
   - Validates all table schemas, row counts, and binary asset SHA-256 digests.
   - Reports `restore_parity_passed`.
