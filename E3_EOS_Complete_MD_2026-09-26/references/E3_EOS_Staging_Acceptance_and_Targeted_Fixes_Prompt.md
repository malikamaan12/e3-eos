# E3 EOS — Staging Acceptance and Targeted Fixes

## 1. Assignment and current baseline

Continue in the existing E3 EOS repository. Verify the reported foundation and UI corrections in the actual staging application, fix demonstrated failures, and produce an evidence-backed acceptance report.

The latest developer handoff reports commit `b656493`, PostgreSQL persistence, optimistic concurrency, a JSON-to-PostgreSQL migrator, configurable interval buffers, a connected Project Resource Plan, and corrections to the cockpit, resource planner, post-event dossier and live command centre. It reports 60 passing suites / 759 tests, clean typechecks across eight packages, and a successful web build.

**These are reported results, not proof of deployment or staging acceptance.** Confirm what is present in the current checkout and running deployment. Do not assume that PostgreSQL is still missing or repeat the earlier foundation rewrite. Preserve working implementations and legitimate data.

Your deliverable is a verified workflow and a clear acceptance decision. Fix only failures established by inspection or reproduction within this scope. Record unrelated discoveries separately without expanding this task.

**External E3 Rentals and PurchaseTracker integration remains deferred.** Both live connectors must remain disabled. Do not activate credentials, create external reservations/vendors/PRs/POs, move stock, or send client/vendor notifications.

## 2. Establish the exact environment

Read applicable `AGENTS.md` instructions and the existing durable-storage correction prompt, integration correction report, source-system ownership plan and shared UI rules. Reuse their terminology and existing implementation patterns.

Inspect the current versions of:

- Database configuration, repositories and migration history, including the reported `0014_enterprise_integration_operations_and_capacity_store.sql` or its current equivalent.
- `integration-operations.store.ts`, `external-integrations.controller.ts` and `JsonToPostgresMigrator` or their equivalents.
- Capacity calculations, interval policy handling, connector mode resolution and production/test adapter bindings.
- Project cockpit, resource planner, report builder, live command centre, API client and affected routes.
- Existing integration, database and browser acceptance tests.

Record the starting commit, unrelated working-tree changes, frontend URL, actual API target, deployment/build identity and database environment. Confirm whether the running build contains `b656493` or a later revision carrying the same fixes. A push to `main` does not establish deployment.

Treat `https://e3-eos-api.vercel.app/` as a supplied application address to investigate, not proof of where its API or database runs. Establish the real request path through the application's configuration and observed browser traffic. Do not expose secrets or connection strings in the report.

Use the existing authorized staging/preview release process. If it permits staging deployment, deploy the verified revision and apply reviewed migrations through that process. Do not deploy to production under this task. If staging access or deployment authorization is unavailable, complete local and isolated verification, prepare the exact release steps, and mark the affected staging checks blocked with the specific dependency.

## 3. Verify schema, storage and migration

Confirm that the workflow reads and writes the configured PostgreSQL database, including the reported tables:

- `project_resource_demands`
- `project_sourcing_scenarios`
- `capacity_conflict_decisions`
- `integration_operations`

These names are inspection pointers. Preserve equivalent existing schemas instead of introducing duplicate tables. Trace associated draft/history records that the tested workflow actually uses. Database failure must not trigger operational JSON, in-memory, browser-storage or fixture fallback.

Distinguish schema migration from historical JSON import:

1. Verify the staging migration ledger and actual schema/constraints, not just the existence of a migration file. Apply pending migrations only through the established staging process.
2. Determine whether legitimate historical JSON records exist and need importing. If none exist, record “Historical import not applicable” with the inspected scope; do not manufacture operational history.
3. When an import is needed, retain a backup/checksum, inspect the dry run, preserve valid IDs and ownership, and quarantine ambiguous records. Verify committed counts and relationships and rerun safely without duplicates.
4. Demonstrate importer behaviour on isolated synthetic fixtures if no real import is needed. Keep this evidence separate from any actual staging import.
5. Confirm that retired JSON writers cannot continue accepting writes after cutover. Recovery must preserve database writes already made; do not reactivate a stale file as the source of truth.

Record migration/import results and recovery instructions. Do not reset shared environments, delete historical records, or run fault injection against production.

## 4. Prove persistence and concurrent behaviour

Use independent API processes or containers with the real repositories and a shared persistent test database. Their application filesystems must be separate. Reuse existing test infrastructure where possible.

| Check | Required observation |
|---|---|
| Instance replacement | Save demand, scenario and decision through instance A. Replace A with a fresh instance using the same database. Original IDs, values, versions and history remain readable. |
| Shared state | A committed write through instance A is visible through independent instance B according to the application's declared refresh/consistency behaviour. |
| Duplicate request | Concurrent identical requests with the same supported idempotency key produce one business result and a consistent operation identity. Verify persisted counts. |
| Key reused with different input | Reusing the key with a different project or payload returns a conflict and leaves the original result unchanged. Authorization runs before any stored result is returned. |
| Concurrent edits | Two authorized users load one version. One update succeeds; the stale update is rejected without overwriting it. The UI offers refresh/review while retaining recoverable input. |
| Commit followed by lost response | A controlled test drops the response after commit. Retrying the same request recovers the saved outcome without duplicate records or history. |
| Database unavailable | The API reports the expected service failure; the UI shows that saving failed and retains input. Recovery/retry does not create duplicates or use fallback storage. |
| Scope protection | A restricted identity cannot read or mutate another project's records or retrieve its operation result by guessing an ID/key. |

Use existing supported operations for these tests; do not build an unused command subsystem. Verify uniqueness/version protections at the database boundary, not only in one JavaScript process.

Perform fault injection in a disposable isolated environment. On shared staging, verify normal cross-session persistence and an authorized instance replacement/redeployment without disrupting other users. Label isolated and staging evidence separately; an isolated pass is not a staging pass.

## 5. Complete the browser journey with fresh data

Create two clearly named acceptance projects using supported application flows in the test environment. Use two distinct authorized test identities with appropriate planning/review permissions and a separate restricted identity. Do not send invitations or notifications to real people. Record roles and IDs, never credentials.

Use these synthetic inputs:

| Project | Planning demand | Purpose |
|---|---|---|
| Acceptance A | 20 counters, allocated 12 to Zone A and 8 to Zone B | Check saved demand, grouping, sourcing and revisions. |
| Acceptance B | 6 counters with an overlapping proposed use window | Check project separation and cross-project planning visibility. |

These are EOS planning demands. They do not establish actual inventory availability. With Rentals disconnected, an overlap can be flagged as a potential issue or assumption, but it cannot prove a stock shortage.

Perform the following through the actual browser UI:

1. Open Acceptance A from the project cockpit and enter its Resource Plan. Verify correct project identity on navigation, direct link and refresh.
2. Create the 20-counter demand and its zone allocations. Save, reload, then inspect it as the second authorized user.
3. Switch between zone, department and package grouping. The total stays 20; allocations stay 12/8; changing the view creates no records. Show unallocated quantity if any exists.
4. Save a sourcing scenario with 8 proposed owned units, 8 proposed external-hire units and 4 proposed fabrication units. Record dependencies through existing fields. All 20 are planned; none become source-confirmed merely because the scenario was saved or approved. Availability remains unknown while disconnected.
5. Create or surface a supported planning issue, such as a missing dependency or an assumption-based overlap. Assign its owner/due date, propose a resolution, and record a decision using the authorized reviewer. Retain the evidence/assumption basis. Do not invent a confirmed inventory conflict to fill the queue.
6. Open the portfolio table, timeline and decision queue. Verify the same persisted records and state. Open Acceptance B and confirm that its six units are separate from Acceptance A.
7. Increase Acceptance A demand from 20 to 22 while retaining the existing 12/8 allocation. Show 2 unallocated units and identify the existing 20-unit scenario as needing review according to current workflow rules. Preserve the prior decision/history; do not silently approve the changed scope.
8. Exercise the concurrent-edit and failed-save UI states from the previous section. Switching projects while a request is pending must not retarget the saved record or display the response under the wrong project.
9. Reopen both projects in separate authenticated sessions and after the verified API instance replacement. Confirm the saved demand, scenario, decision and revision state.
10. Confirm that restricted users see only permitted records/actions, with matching server-side enforcement. Use existing role/project rules; do not introduce a new permission model.

If current business rules support a different valid route for one step, use it and explain the mapping. A decorative button or local-only state is not completion. If an action fails, capture its reproduction, apply a focused fix and rerun the affected journey.

Automated browsers may use distinct test accounts to demonstrate multi-user behaviour. Describe this accurately as automated engineering acceptance. Human business UAT remains pending until an actual business reviewer performs and records it.

## 6. Verify buffer policies and disconnected integrations

Retain the generalized capacity cases A–F already implemented. Do not hardcode the acceptance project IDs or sourcing split in production logic.

Verify the following synthetic policy inputs through the production calculation path:

| Input basis and policy | Expected occupied interval, Asia/Qatar |
|---|---|
| Event use: 10 Nov 2026, 10:00–18:00; zero buffers | 10 Nov, 10:00–18:00 |
| Same event use; 2-hour preparation and 6-hour return | 10 Nov, 08:00 to 11 Nov, 00:00 |
| Already occupied/buffered interval: 10 Nov, 08:00 to 11 Nov, 00:00 | Unchanged; no second expansion |

These are test policies, not E3 operational defaults. Confirm policy provenance, missing-policy behaviour, timezone handling and the existing boundary rule for adjacent intervals. Missing policy must expose the assumption/uncertainty instead of silently reinstating the old 24-hour constant.

With both connectors disabled, verify:

- Settings and affected screens show truthful connection state; source availability is unknown rather than an invented zero or positive balance.
- EOS can save its local demand, scenarios and supported preparation drafts.
- Direct API attempts to perform implemented external submissions/firm commitments are rejected by the server before dispatch. Disabled buttons alone are insufficient evidence.
- Saving/approving a local plan does not create a reservation, issued order or physical readiness confirmation.
- Client-supplied modes, headers or query parameters cannot activate a simulator in production bindings.
- Deferred local drafts do not become automatically dispatchable merely because a connector is enabled in the future; inspect this invariant without enabling a live connector.

Keep ownership unchanged: Rentals owns inventory/availability/reservations/custody; PurchaseTracker owns procurement vendors/purchasing; EOS owns project planning and decisions. Source API verification remains Deferred / Not tested.

## 7. Visually inspect the reported UI fixes

Inspect the running application in a real browser. Capture the affected states with deployment identity, route, project, role, viewport, language and theme. Reuse evidence across checks where appropriate.

| Screen | Verify |
|---|---|
| Project cockpit | Tab labels remain usable, all configured workstreams are reachable, scroll/Jump controls work with keyboard and touch, and Resource Plan opens the selected project. Scrolling the tabs must not trap normal page navigation. |
| Resource planner | Table/timeline, filters, grouped totals, scenario editor and decision queue work. Inputs remain readable in both themes. Loading, empty, failed-save and read-only states are truthful. |
| Post-event dossier/report | Title, client, venue and available figures belong to the current project. Empty data stays empty/unknown. Project switching and any existing export use the correct record. Sign-off states reflect actual records. |
| Live command centre | Project code/title, feed and countdown belong to the current project and remain readable in both themes. |

Use representative desktop (1440 px) and narrow mobile (390 px) widths, light/dark themes, and English/Arabic RTL. Cover all four affected screens at both widths, and cover each theme and language across this focused set. Check the editable planner and cockpit specifically in narrow RTL. Keep the matrix small and record exactly what was inspected; do not claim every combination was tested if it was not.

Look for clipping, unintended page overflow, inaccessible actions, broken focus, stale project data and client-visible internal information. Table scrolling can remain inside its container. Use existing design-system components and tokens for fixes.

Do not start a new global redesign. A visible hash/seal must not be presented as evidence that a person approved or signed the document unless the application has the corresponding approval/signature record.

## 8. Fix demonstrated defects and verify the final revision

For each failure, record the route/environment, reproduction, expected and actual behaviour, severity, cause, fix and retest evidence. Link the affected acceptance check. Classify unavailable access as Blocked, not Failed, unless an actual defect has been observed.

Prioritize data loss/duplication, project or role leakage, false external confirmation, migration errors and blocked core actions. Preserve working architecture, existing data and unrelated changes. Do not waive a blocker by changing the expected result to match faulty behaviour.

Run repository-required typecheck/build/regression gates for the final change set and focused checks for meaningful risks introduced by fixes. Reuse existing tests; do not inflate the suite with assertions that merely mirror the implementation. Report actual commands, results and failures without targeting the historical count of 759 tests.

After a fix changes the deployed code, update staging through the authorized process and repeat the affected browser checks on that revision. Evidence from an earlier build cannot close a failure in the final build. Avoid repeating unaffected suites beyond required gates.

## 9. Deliver the acceptance decision

Update the existing correction report and maintain one focused staging acceptance report, reusing it if already present. Include a linked evidence directory with relevant screenshots and sanitized results. Do not replace evidence with a list of files viewed or commands attempted.

Use this status format:

| Acceptance area | Implementation | Local/isolated verification | Staging verification | External verification | Evidence / remaining action |
|---|---|---|---|---|---|
| Schema and migration | Verified / Issue / Not inspected | Pass / Fail / Blocked / N/A | Pass / Fail / Blocked / N/A | N/A | Actual result and reference |
| Persistence and concurrency | Same statuses | Same statuses | Same statuses | N/A | Actual result and reference |
| Project-to-portfolio workflow | Same statuses | Same statuses | Same statuses | N/A | Actual result and reference |
| Buffers and connector guards | Same statuses | Same statuses | Same statuses | Deferred / Not tested | Actual result and reference |
| Affected UI and access | Same statuses | Same statuses | Same statuses | N/A | Actual result and reference |

The handoff must state:

- Starting/final commit or exact uncommitted state, and the revision actually deployed.
- Actual frontend/API/database environment and applied migration identifiers, without secrets.
- Acceptance project/record IDs, roles used, expected versus observed results and evidence references.
- Defects fixed, unresolved blockers, and any small non-blocking follow-ups.
- Migration/import outcome or justified N/A, and practical recovery steps.
- Engineering staging acceptance: **Pass, Fail or Blocked**, with the reason.
- Human business UAT: **Completed with reviewer evidence, or Pending**.
- Live Rentals/PurchaseTracker verification: **Deferred / Not tested**.

Mark engineering staging acceptance Pass only when the deployed workflow persists across instance replacement, concurrent users cannot corrupt it, permissions hold, the reported UI fixes work, and external actions remain disabled. Do not treat unavailable evidence as success or require deferred live integration to pass this internal acceptance.

Once this batch passes, identify **RFP → requirements → scope** as the next implementation batch: source-linked extraction, repeated-requirement handling, conflicts/addenda, scope allocations and AI/OCR configured through Settings. Reference the existing RFP prompt and record any known dependencies; do not start that implementation or the wider Design/Vault backlog in this acceptance task.

Complete the work supported by the available access. If a check is blocked, finish all independent checks and report the exact missing dependency and the next executable step. Avoid another broad “foundation complete” claim without the environment and evidence supporting it.
