# P00 foundation — real HTTP and PostgreSQL smoke

Executed: 2026-09-26T08:53:20.492Z

Target: local rebuilt API at `http://localhost:4000/api/v1`, process 39612. Root reported synthetic authentication disabled. This run confirmed forged header-only identities are denied.

The final smoke used an existing synthetic seeded account and imported the DB client directly. Credential values and tokens are intentionally omitted. It issued read requests and rejected logout attempts, then removed its own temporary login session. This final pass executed no business commands, membership changes, migrations or schema writes.

**Verification caveat:** the preliminary helper imported `packages/db/dist/index.js`; that existing barrel imports the seed module, which automatically refreshed local synthetic fixtures. Its output reported persistent role/project/stage/document/lifecycle/constraint seeding. The helper was corrected to import `packages/db/dist/client.js`, and this recorded pass was rerun without seeding. No schema reset or migration was run, and no speculative rollback of fixture data was attempted. The root agent was notified immediately.

| Check | HTTP status | Result |
|---|---:|---|
| Seeded credential login; synthetic authentication disabled | 201 | PASS |
| Forged identity and role headers without session rejected | 401 | PASS |
| Invalid opaque bearer session rejected | 401 | PASS |
| Verified bearer session protected identity read | 200 | PASS |
| Unassigned organisation selector rejected | 401 | PASS |
| Cookie-authenticated safe identity read | 200 | PASS |
| Hostile browser Origin cookie logout rejected before dispatch | 403 | PASS |
| Missing Origin cookie logout rejected before dispatch | 403 | PASS |
| Session remains valid after both rejected unsafe requests | 200 | PASS |
| Configured local CORS origin receives exact allow-origin and credentials headers | 204 | PASS |
| Untrusted origin does not receive a credentialed CORS grant | 200 | PASS |
| Bearer logout removes only the temporary smoke-test session | 201 | PASS |

The untrusted-origin safe GET returns 200 to a raw non-browser HTTP client, but has no `Access-Control-Allow-Origin` grant; browser access is denied by CORS. Unsafe requests are rejected server-side with 403.

## Read-only migration ledger

PostgreSQL server version: 17.11. Read `_migrations` inside `BEGIN READ ONLY`; 16 existing entries, no migrations applied by this slice.

| Applied migration | Recorded timestamp (UTC) |
|---|---|
| `0000_flashy_mastermind.sql` | 2026-09-26T07:30:00.724Z |
| `0001_dear_genesis.sql` | 2026-09-26T07:30:00.756Z |
| `0001_enable_row_level_security.sql` | 2026-09-26T07:30:00.764Z |
| `0002_operational_constraints_and_documents.sql` | 2026-09-26T07:30:00.784Z |
| `0003_sprint_03_physical_delivery.sql` | 2026-09-26T07:30:00.844Z |
| `0004_sprint_04_live_operations.sql` | 2026-09-26T07:30:00.881Z |
| `0005_sprint_05_finance_commercial_reconciliation.sql` | 2026-09-26T07:30:00.942Z |
| `0006_sprint_06_enterprise_intelligence.sql` | 2026-09-26T07:30:00.958Z |
| `0007_project_metadata.sql` | 2026-09-26T07:30:00.959Z |
| `0008_progressive_scope_management.sql` | 2026-09-26T07:30:00.986Z |
| `0009_scope_allocations_and_fulfilment.sql` | 2026-09-26T07:30:01.024Z |
| `0010_intelligent_document_parser.sql` | 2026-09-26T07:30:01.033Z |
| `0011_design_and_creative_module.sql` | 2026-09-26T07:30:01.235Z |
| `0012_rfp_document_intelligence_integration.sql` | 2026-09-26T07:30:01.251Z |
| `0013_controlled_documents_vault_and_submission_packs.sql` | 2026-09-26T07:30:01.310Z |
| `0014_enterprise_integration_operations_and_capacity_store.sql` | 2026-09-26T07:30:01.319Z |

This confirms the local session/origin boundary and existing migration ledger. It does not certify production deployment, per-project grants, recent MFA, witnessed recovery, or the remaining P00 controls documented in `docs/P00_AUTH_BOUNDARY.md`.
