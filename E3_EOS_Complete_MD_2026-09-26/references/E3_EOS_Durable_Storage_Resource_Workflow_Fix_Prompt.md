# E3 EOS — Durable Storage and Resource Planning Workflow Fix

## 1. Assignment

Continue in the existing E3 EOS repository. Complete two remaining foundation items:

1. Persist EOS-owned resource planning and integration preparation records in the application's configured durable datastore.
2. Complete the connected project resource-planning workflow, including saved demand, sourcing scenarios, conflicts, decisions and portfolio visibility.

Implement the corrections and provide verification evidence. Preserve the reported separation of production adapters and test simulators, generalized capacity calculations, disabled connector behaviour and existing planner UI where they are correct. Inspect first; do not rebuild functioning components.

**Live E3 Rentals and PurchaseTracker integration remains deferred.** Keep both connectors disabled. This task must not create external reservations, vendors, purchase requests or orders, issue stock movements, activate production credentials or send real client/vendor notifications.

Do not expand this task into the wider RFP, Design, Vault, Finance or global UI repair backlog. Follow the shared UI rules for the screens touched here.

The latest handoff reports JSON-backed persistence at `apps/api/data/integration-operations.json`, a Portfolio Resource Planner, 31 integration tests, 19 lifecycle tests, 735 total tests and eight clean workspace typechecks. Treat those as reported results. Establish the current source, deployment and test state independently.

## 2. Inspect the real persistence and deployment architecture

Read applicable `AGENTS.md` instructions, the existing foundation correction prompt, source-system integration plan, portfolio plan, global UI component rules and current correction report. Locate equivalent filenames rather than creating another duplicate specification.

Inspect at least:

- `apps/api/src/integrations/integration-operations.store.ts`.
- `apps/api/src/integrations/external-integrations.controller.ts`.
- `DbService`, existing repositories, schema definitions, migrations and connection configuration.
- Settings persistence and connector-mode resolution.
- `packages/domain/src/portfolio-capacity.ts` and the Rentals/PurchaseTracker adapters and simulators.
- `apps/web/src/views/PortfolioResourcePlannerView.tsx`, project cockpit integration, routes and client API calls.
- Relevant integration, lifecycle and browser tests.

Trace the frontend request to the actual API runtime and datastore. Do not infer API hosting from the frontend hostname. Determine whether the deployed persistence uses a shared database, application-local files, a mounted volume or another configured service. Confirm actual read/write behaviour in an isolated environment without displaying credentials.

The ordinary Vercel Functions filesystem is read-only except for temporary scratch space; Cloud Run's container filesystem does not retain writes after the instance stops. Confirm the relevant deployment configuration against [Vercel's filesystem documentation](https://vercel.com/docs/functions/runtimes#file-system-support) and [Cloud Run's runtime contract](https://docs.cloud.google.com/run/docs/container-contract#file_system_access). A JSON file surviving a local process restart is insufficient evidence of deployment-safe storage.

Record the starting commit, working-tree changes, actual storage binding and affected routes. Preserve unrelated changes. If persistence is already correctly implemented beyond the reported JSON file, retain it and demonstrate that fact.

## 3. Implement durable EOS storage

Use the existing configured production datastore, ORM/repository patterns and migration tooling. Add or extend entities only where necessary. Do not introduce another database provider, standalone persistence service or competing domain model merely to complete this task.

| EOS-owned record | Information to preserve |
|---|---|
| Resource demand | Tenant, project, requirement/BOQ/work-package lineage where applicable, allocation, revision, quantity/unit, dates, timezone, owner and assumptions |
| Sourcing scenario | Demand version, stock/hire/purchase/fabrication proposals, quantities, estimates, dependencies and scenario revision |
| Conflict and decision | Affected records/projects, evidence or assumption basis, owner, due date, proposed resolution, decision, actor and history |
| Local vendor/PR preparation draft | Original tenant/project, input, revision, attachments/references, explicit EOS draft status and author |
| External mapping/projection | Connection/environment, source entity type/ID, permitted snapshot data, source version/check time and freshness |
| Implemented operation record | Stable operation ID, scope, action, idempotency key, payload hash, status, actor, applicable approval/version and genuine source reference if any |
| Connection configuration | Durable mode, capability flags and mappings; secrets remain in the existing secret mechanism |

These are responsibilities, not a requirement for seven new tables. Reuse existing entities and preserve relationships. Store audit history through the application's normal audit mechanism.

Source-system ownership remains unchanged: Rentals owns physical inventory, availability, reservations and custody; PurchaseTracker owns procurement vendors and purchasing. EOS database rows for those external entities are references/projections, not another authoritative stock or procurement ledger.

Production code must not fall back to JSON, in-memory maps, browser storage or seeded records when the database is missing or unavailable. Return an actionable error, retain unsaved form input where appropriate and show Could not save. JSON fixtures may remain in isolated tests. Temporary files are acceptable for processing, not as the only copy of operational state.

If the existing datastore is unconfigured, implement the repository/migration integration and fail clearly. Complete all available checks and identify the exact missing environment dependency. Do not silently choose a new provider or claim deployed durability without a working datastore.

## 4. Preserve existing JSON data safely

Determine whether the JSON file contains legitimate records, only fixtures, or no records. Do not manufacture data to demonstrate a migration.

For legitimate records, provide a controlled, repeatable import using the existing migration conventions:

1. Retain a backup and identify the source file/version or checksum.
2. Offer a dry run reporting valid records, duplicates, conflicting IDs, missing parents and unknown tenant/project ownership.
3. Preserve stable IDs, source references and real timestamps/actors where available. Missing historical information stays explicitly unknown; do not fabricate approvals or source confirmations.
4. Quarantine or report ambiguous records. Never assign them to the currently selected project or a default tenant to make the import pass.
5. Use transactions and stable import keys so rerunning the import does not duplicate records. Reconcile record counts and relationships.
6. Prevent concurrent writes through the old JSON path during cutover. Switch the relevant service bindings to the durable repository and retire operational JSON writes.

Use additive migrations and document recovery. Preserve backups and historical evidence; do not automatically delete them. If writes have continued in the database, rolling back application code must not silently reactivate a stale JSON writer.

Exercise the migration in an isolated environment. Apply production migration/deployment only through the project's existing authorized release process.

## 5. Make concurrent writes and retries safe

Use datastore-enforced uniqueness and transactions for implemented write operations. A per-process lock cannot coordinate two independent API instances.

- Define the idempotency scope using tenant, action and connection/environment where applicable. Bind the original project and relevant request fields to the payload hash.
- Authorize the caller before returning a stored operation/result. Knowing an idempotency key or operation ID cannot expose another user's project data.
- Same key and same payload returns the original persisted operation/result across instances and retries.
- Same key and different payload returns a conflict without mutating the original record.
- Concurrent create requests must be resolved by an atomic database constraint/transaction, not a separate lookup-then-insert check.
- Use expected versions for edits and decisions. Two users editing the same scenario cannot silently overwrite each other; the stale editor receives a recoverable conflict.
- Persist related demand/scenario/decision/audit updates consistently. Where an existing asynchronous operation requires an outbox, save intent and outbound work together. Keep external dispatch disabled.
- Preserve accepted results if an HTTP response is lost after database commit. A retry recovers the original outcome.

Reuse any existing worker claim/recovery mechanism for operations that already need asynchronous processing. Do not build an unused external command engine in this phase.

Keep EOS review status, external business status and operation delivery status separate. A saved or approved local plan cannot become a source-confirmed reservation or issued purchase order.

## 6. Complete the project-to-portfolio workflow

Use the project cockpit as a normal entry point. The portfolio screen and project screen must read and update the same persisted records.

Implement or repair this journey:

1. **Open a project and its Resource Plan.** Show the correct project identity and authorized records on navigation, refresh and direct links.
2. **Create or derive demand.** Link approved requirement/BOQ allocations where available; allow explicit planning drafts when scope is still developing. Capture quantity, unit, location/zone, department, owner and dated need.
3. **Group without duplication.** Switching between zone, department and package views does not create copies. Prevent over-allocation; show any quantity still unallocated.
4. **Prepare sourcing scenarios.** Save stock, external hire, purchase and fabrication proposals against the demand revision. Preserve quantities, estimates, currencies and dependencies where supplied. Do not assume unavailable prices are zero.
5. **Review planning conflicts.** Show relevant overlaps, missing information and dependency issues. Distinguish an evidenced conflict from a possible conflict inferred from planning assumptions.
6. **Assign and decide.** Save a conflict owner, due date, proposed resolution and an authorized decision with history. An EOS decision selects a plan; it does not authorize an external transaction by itself.
7. **See the result in the portfolio.** Project detail, portfolio table/timeline and conflict queue show the same latest authorized state.
8. **Revise the requirement or dates.** Identify affected scenarios/decisions and mark them for review as required. Preserve earlier versions; do not silently rewrite approved plans.
9. **Reopen as another authorized user.** Show saved records and their original actor/history. Changes must not depend on one browser's local state.

Keep accepted navigation and shared component styles. Connect the existing planner instead of replacing it with a standalone calculator. Users must be able to distinguish Saving, Saved and Could not save. A failed request must not leave a false success state.

## 7. Keep disconnected availability truthful

Ordinary projects remain useful for local planning while the connectors are disabled:

- Show Not connected or Unknown where source availability has not been obtained.
- Label imported historical snapshots with their source and check time.
- Allow users to record explicit planning assumptions, without making them live stock or confirmed coverage.
- Keep proposed, source-confirmed, received, installed and ready quantities distinct.
- An approved scenario never turns proposed hire or unfinished fabrication into confirmed stock.
- Preserve an existing genuine source reservation as coverage when a snapshot reports zero availability for additional bookings, while showing its current verification/freshness status.
- Reject external submissions and firm commitments on the server. Disabled UI controls alone are insufficient.
- Local drafts do not automatically enter a dispatch queue when a connector is enabled later.

Test fixtures stay behind isolated test bindings. Query parameters, headers, project names, arbitrary connection IDs and client-supplied modes cannot enable a simulator in a production request.

## 8. Verify buffer configuration explicitly

Check the previously reported 24-hour buffer behaviour. Remove any unapproved operational constant. In disconnected planning, retain explicitly labelled and versioned assumptions; future connected inventory queries must respect the effective Rentals policy.

Use an explicit interval basis: event use versus occupied interval already including buffers. Apply preparation and return/inspection buffers once and preserve timezone/boundary semantics.

Include deterministic fixture checks for:

| Input | Expected occupied interval |
|---|---|
| Use window 10 Nov 2026, 10:00–18:00 Asia/Qatar; zero buffers | Same interval |
| Same use window; 2-hour preparation and 6-hour return buffer | 10 Nov 08:00 to 11 Nov 00:00 Asia/Qatar |
| Already-buffered interval 10 Nov 08:00 to 11 Nov 00:00 | Unchanged; buffers are not applied again |

These are synthetic policy inputs, not E3 operating defaults. Also exercise adjacent/non-overlapping intervals and an absent policy where the result must expose its assumption or uncertainty.

Retain the existing generalized capacity cases A–F and add focused checks only where these changes create a concrete risk. Do not hardcode a sourcing split or project identifier to satisfy an example.

## 9. Acceptance run on fresh records

Use an isolated environment with the real repository implementation and a persistent datastore separate from the API instance. Keep both external connectors disabled.

Create two fresh projects through the supported application flow. For example, Project A has a twenty-counter demand split 12/8 between two zones; Project B has a separate six-counter demand with an overlapping proposed use window. These are local demand fixtures. Do not seed authoritative live inventory into their ordinary screens.

Use two authorized users with appropriate planning/review permissions and a separate restricted user for denial checks. Record their roles without exposing credentials.

| Check | Required observed result |
|---|---|
| Connected UI journey | Create demand, save a scenario, assign a conflict owner, record an authorized decision and reopen all records from project and portfolio views |
| Grouping and revisions | Zone totals reconcile, alternate grouping does not duplicate demand, and changed demand marks affected plans for review |
| Fresh instance persistence | Create records through instance A, replace it with a fresh filesystem/process instance using the same datastore, then read the original records and history |
| Shared state | Independent instances A and B use the same datastore; a committed write through one is visible through the other according to the declared consistency behaviour |
| Concurrent duplicate create | Simultaneous identical keyed requests through A/B produce one persisted business record and the same operation identity |
| Conflicting edit | Two users edit the same version; stale input is rejected without losing the accepted update |
| Lost response | Simulate a dropped response after database commit; retry returns the existing result without duplication |
| Datastore unavailable | Save returns a truthful error; no JSON/map/mock fallback or false Saved badge occurs; retry after recovery follows idempotency rules |
| Permissions and identity | Restricted users cannot read/update the project, edit connector settings or obtain another scope's operation results; project switching cannot retarget a pending write |
| Deferred connectors | Direct API attempts cannot submit external PRs, issue orders, confirm reservations or post stock while disabled |
| Buffers | Zero, asymmetric and already-buffered cases return the expected intervals with visible policy provenance |
| Migration, if applicable | Dry run, import and rerun preserve valid records without duplicates and report ambiguous records |

Two repository objects inside one process or a reload of the same JSON file do not demonstrate independent-instance persistence. Exercise independent API processes/containers with no shared application data directory. In an authorized staging environment, verify replacement/redeployment there; otherwise label the isolated test accurately and retain the staging gap.

Capture representative screenshots of the project plan, portfolio, conflict/decision detail and disabled Settings state. Check desktop and a narrow viewport, English/Arabic and the existing themes on affected screens. Verify loading, empty, failed-save and read-only states without opening a new global UI workstream.

Run the repository-required build/typecheck/regression gates and focused tests for these changes. Record actual results. Test counts alone cannot close an acceptance item.

## 10. Delivery and completion

Deliver the implementation, applicable migrations/import tooling and an update to the existing correction report. Preserve earlier findings and their evidence.

The handoff must identify:

- Starting and final commit, or exact working-tree state if uncommitted.
- Confirmed API runtime and datastore binding, without secrets.
- Files/entities changed and how legitimate existing data was preserved.
- Each acceptance check: expected result, observed result, relevant record IDs and evidence.
- Screenshots and the environment/deployment identity they show.
- Recovery/rollback steps and any unresolved environment dependency.

Keep separate columns for **Implementation**, **Local verification**, **Staging verification** and **External verification**. External verification remains **Deferred / Not tested**. Retain appropriate Contract verified labels for simulations; do not relabel them as live source tests.

Complete routine reversible work and isolated verification without asking again for approval of this scope. Production activation and destructive data changes remain outside this task. If credentials or an environment prevent a check, finish the remaining work and report that specific blocked check rather than inventing a successful result.

This batch is accepted when the complete EOS planning journey persists through independent instance replacement, handles concurrent users correctly, respects project permissions and keeps unavailable external actions disabled. Finish these two foundation items before starting the next module backlog.
