# API restart database preservation evidence

Result: **PASS**. Restarting the rebuilt EOS API preserved every compared row. This is local verification of the seed import boundary, not production acceptance.

- Baseline: 2026-09-26 09:16:46.026 UTC, after the explicit `pnpm seed` completed.
- Rebuilt API restart: PID 29940, 2026-09-26 12:17:25 Asia/Qatar (09:17:25 UTC).
- Comparison: 2026-09-26 09:17:52.191 UTC.
- Compared: **189 public tables, 629 rows**.
- Changed tables: **0**.

| Protected table | Before rows | After rows | Complete-row SHA-256 unchanged |
|---|---:|---:|---|
| `users` | 73 | 73 | Yes |
| `accounts` | 63 | 63 | Yes |
| `memberships` | 73 | 73 | Yes |

The account fingerprint includes credential columns without displaying their values. Matching counts alone would not detect password resets; matching complete-row fingerprints do.

Combined before and after SHA-256:

```text
87f871ddac8067964bce20749e57dd5b296e224b8c67fd1718693a24f76d2159
```

## Method and scope

The local helper loads `pg` directly, without importing the EOS database barrel. Each snapshot uses a PostgreSQL repeatable-read, read-only transaction. Rows are serialized as PostgreSQL JSONB in canonical text order; the helper hashes length-prefixed serialized rows with SHA-256. Saved output contains only table names, counts and aggregate hashes. Raw row content, passwords and credential hashes are not printed or saved by the helper.

All public tables were included except these explicitly excluded operational tables: `audit_events`, `idempotency_records`, `inbox`, `outbox`, `po_receipts`, and `sessions`. Their contents are not covered by this result. The check compares retained database state; it does not claim to trace every SQL statement during startup.

The restarted API log contained zero occurrences of the seed startup or seed success markers. Fresh non-test process regression tests separately verify that importing the database barrel or seed module constructs no PostgreSQL pool, opens no connection and executes no query.

## Local evidence files

- `.local/check-startup-db.mjs` — read-only snapshot/comparison helper.
- `.local/startup-db-before.json` — baseline counts and fingerprints.
- `.local/startup-db-comparison.json` — complete comparison and post-restart snapshot.
- `.local/md-next-api-runtime.log` — restarted API log.
- `packages/db/src/seed-startup.test.ts` — fresh-process import and explicit CLI regression checks.

The `.local` evidence is intentionally excluded from version control. The helper and evidence capture performed no database writes or reseeding.
