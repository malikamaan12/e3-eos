# E3 EOS — Integration Foundation Correction and Acceptance Prompt

## 1. Assignment and scope

Continue in the existing E3 EOS repository. Inspect and correct the recently reported E3 Rentals / PurchaseTracker adapter foundation and Portfolio Resource and Capacity Planning implementation. Complete the applicable code fixes, user interface work and focused verification. Do not stop after proposing another implementation plan.

This is the **EOS foundation and disconnected workflow phase**. Live E3 Rentals and PurchaseTracker connections remain deferred. Do not activate production credentials, create external bookings/vendors/PRs/POs, send real notifications or change source-system business records during this task.

Treat the latest developer handoff as a report requiring verification. It claims adapter engines, API routes, Settings changes, 17 integration tests, 721 total tests and successful typechecking. Those counts do not establish durable state, correct authority, complete screens or a deployed release. The review concerns below are hypotheses: inspect the code and preserve correct implementations rather than rewriting them unnecessarily.

Read repository instructions and the current versions of:

- `docs/E3_EOS_Rentals_PurchaseTracker_API_Integration_Plan.md`.
- The Portfolio Resource and Capacity plan, reported as `docs/E3_EOS_Portfolio_Resource_Capacity_Planning.md`; another supplied filename is `E3_EOS_Portfolio_Resource_Capacity_Integration_Plan.md`. Locate and reconcile the actual files rather than creating competing specifications.
- The Functional Integration and Lifecycle Validation brief and its 19 September architecture amendment.
- `E3_EOS_GLOBAL_UI_COMPONENT_RULES.md`, where supplied, and the existing design-system implementation.
- Existing integration inventory, UAT scenario, audit matrix, lifecycle validation and release handoff.

Preserve unrelated user changes, accepted modules and legitimate historical data. Use additive, reversible migrations where needed. Routine reversible fixes and isolated testing should proceed without repeatedly asking for confirmation. Report an exact dependency only when unavailable access or a material business decision genuinely prevents completion.

## 2. Inspect the actual implementation first

Start with the reported files, adapting paths to the repository:

- `packages/contracts/src/integrations-adapters.ts`, `capacity-planning.ts` and their exports.
- `packages/domain/src/rentals-adapter.ts`, `purchasetracker-adapter.ts`, `portfolio-capacity.ts` and any duplicate implementations.
- `apps/api/src/integrations/external-integrations.controller.ts`, module registration and existing inventory/procurement routes.
- `apps/api/src/settings/settings.repositories.ts`, Settings contracts and configuration persistence.
- `apps/web/src/views/SettingsAiIntegrationsView.tsx` and actual portfolio/project resource screens.
- `tests/rentals-purchasetracker-integration.test.ts` and relevant lifecycle tests.

Trace a request from browser to controller, authorization, adapter binding, persistence and response. Identify which code is a contract, production adapter, local draft service, projection or test simulator. Check whether older inventory/vendor routes can still create competing authoritative records.

Record the checked-out commit, working-tree changes, affected routes and actual storage mechanism. Do not expose secret values in investigation output. A command appearing in a transcript is not its result, and an earlier commit mentioned by the handoff is not automatically the commit containing these changes.

## 3. Preserve source-system ownership

| Responsibility | Owner | Permitted EOS behaviour now |
|---|---|---|
| Equipment catalog, asset identities, stock, condition, availability, reservations and custody | E3 Rentals | Typed references/projections, demand planning, explicit disconnected states and isolated contract simulations |
| Procurement vendor identities, onboarding, compliance, banking review, PR authorization and purchasing | PurchaseTracker | Local preparation, typed source contracts and isolated contract simulations |
| Projects, requirements, zone allocations, sourcing scenarios, internal approvals and readiness | EOS | Durable project workflows using available evidence and clear assumptions |

If the current domain engines act as local authorities for real stock, confirmed reservations or approved vendors, separate that behaviour from production bindings. A deterministic simulator is acceptable for tests when explicitly named and isolated. Do not delete useful contract tests because their simulated source implements business rules.

Production EOS adapters must eventually call the owning source service and preserve its result. While disconnected they must not quietly substitute a simulator, seed catalog or in-memory vendor/stock database.

An EOS mutex or database transaction cannot prevent a simultaneous booking made through Rentals. Describe local race tests accurately as simulator/contract tests. The future Rentals API must validate and reserve atomically across its channels; verification of that guarantee stays deferred.

EOS may perform input validation, show potential vendor duplicates and reject actions lacking local authority. PurchaseTracker retains final procurement eligibility, identity reconciliation and approval. Do not reduce its workflow to a local `suspended` flag or treat a Rentals marketplace partner approval as procurement approval.

Inspect existing overlapping EOS records/routes. Preserve historic data and prepare reviewed identity mapping where needed. Prevent new competing source-owned writes without destroying valid EOS planning drafts or unrelated functionality.

## 4. Enforce disconnected and test modes on the server

Keep `e3_rentals` and `e3_purchasetracker` disabled by default. Explicitly distinguish local draft saving from submission to an external system.

- A disabled connector may expose authorized historic snapshots, with their source and check time, or return Not connected/Unknown. It must not label them Live.
- Saving an EOS demand, vendor-intake draft or PR preparation draft is allowed. The result must identify it as an EOS draft with no external approval or source reference fabricated.
- Firm reservation, source vendor creation, PR submission, order creation/issue, stock posting and similar external commands must fail clearly when their required capability is unavailable.
- Direct API calls must enforce these rules even if the UI button is hidden or an old browser session is used.
- Keep direct PO creation deferred. Do not return a synthetic PO number or successful source record from an unavailable action.
- Production requests cannot select a fixture adapter through a query parameter, header, project name, arbitrary connection ID or client-supplied mode.
- Test bindings use a dedicated isolated environment/data scope. Include their test provenance in test results and any sandbox UI; never use them as ordinary-project fallback data.
- Separate supported, verified and enabled capabilities. Changing a display badge does not establish source verification.
- A queued/saved request is not confirmed stock, an approved vendor, an issued order or installed equipment. Saving a draft must not schedule an automatic purchase when a connector is enabled later.

Reuse the existing server error format and mode configuration. Do not introduce a second connector registry or frontend-only permission system.

## 5. Correct buffer and availability assumptions

The handoff describes 24-hour preparation/return buffers. Determine whether these are fixture values, configurable defaults or fixed production logic.

Remove any unapproved fixed operational assumption. Future source-backed equipment availability uses the effective Rentals policy. An EOS-only planning assumption is allowed while disconnected if clearly labelled, versioned and excluded from claims of confirmed availability.

The contract must state whether it receives an event-use interval or an occupied interval already including buffers. Apply buffers once. Retain the timezone, interval boundary convention, effective policy reference and missing-input state. A fixture may deliberately use 24 hours but must also exercise other buffer values and already-buffered input.

Preserve the distinction between:

- Total compatible serviceable stock.
- Availability for new requests in the queried interval.
- This project's existing source-confirmed reservations.
- Tentative plans and external/fabricated future supply.
- Physically received, installed and ready quantities.

Do not subtract a reservation twice. After a project reserves eight units, a subsequent response showing zero available for new demand must still show the project's eight units as confirmed coverage. Source-unavailable data remains unknown rather than defaulting to zero stock or full availability.

## 6. Make portfolio calculations general

The twenty-counter example and the `8 owned + 8 external hire + 4 fabrication` allocation are test cases, not production routing rules. Find and remove any project-ID, product-name or scenario-specific branches from operational logic.

Demand must originate from stable project, requirement, allocation and revision records. Grouping by zone, location, department or work package must not duplicate demand. Repeated RFP evidence does not create another demand line; an approved quantity/date revision produces a reviewed change to the existing plan.

Use explicit quantities, compatible units, locations, occupied intervals and availability evidence. Keep person-hours, vehicle measures, equipment units and workshop effort separate. A free workshop slot does not prove an approved drawing, material supply or completed fabrication.

Let authorized users prepare and compare sourcing combinations. Hired equipment and fabrication remain proposed/expected supply until appropriate evidence confirms them. Approval of the plan does not manufacture inventory or bypass source procurement approval.

Use these independent fixtures to check arithmetic and state:

| Case | Source evidence / demand | Expected result |
|---|---|---|
| A | 12 serviceable, 4 reserved elsewhere, demand 20 | 8 available for new demand; 12 uncovered before new fulfilment commitments |
| B | 15 serviceable, 5 reserved elsewhere, demand 18 | 10 available; 8 uncovered |
| C | 5 serviceable, all 5 reserved elsewhere, demand 6 | 0 available; 6 uncovered |
| D | Source unavailable, demand 9 | Availability unknown; no invented numeric assurance or confirmed reservation |
| E | Project already has 8 confirmed; source now reports 0 available for new demand; project demand 20 | Confirmed coverage remains 8; 12 still require confirmation |
| F | 8 confirmed owned, 8 proposed external hire, 4 proposed fabrication against demand 20 | Proposed allocation totals 20; confirmed coverage is 8; physical readiness is evaluated separately |

Also vary dates, warehouses, quantities and product identities. Verify non-overlapping bookings, unavailable alternatives and zone allocations whose sum equals their requirement. These are test inputs, not new commercial policies.

## 7. Persist EOS-owned state and make retries safe

Use the existing durable datastore and job infrastructure for local drafts, demand, scenario versions, approval history, external mappings and any operation records implemented in this phase. In-memory maps may support isolated tests, not operational persistence.

For commands that the foundation already records, retain tenant, original project, connection/environment, action, stable operation ID, approved payload/hash, actor, applicable version/approval reference, delivery state and source result reference when one genuinely exists.

Where asynchronous command infrastructure exists, persist the intent and outbound work together. Keep external dispatch disabled in this phase. Do not construct a full new integration platform merely to demonstrate an unused future capability.

Verify these behaviours at the implemented boundary:

1. Repeating the same idempotency key with the same payload returns the same operation/result.
2. Reusing the key with different input returns a conflict.
3. A restart retains drafts, settings, mappings, history and operation outcomes.
4. Switching projects does not retarget previously saved or queued work.
5. Stale edits and superseded approvals fail or require renewed review.
6. A simulated lost response after source acceptance becomes Outcome unknown until correlated/reconciled; it does not blindly create another source record.
7. Unsupported source idempotency/correlation is a declared future limitation, not a claimed automatic retry guarantee.

Keep EOS approval, source business status and operation delivery state separate in storage and UI. A successful local request or completed transport operation does not by itself establish business approval.

## 8. Complete the usable EOS planning workflow

Inspect whether these views already exist. Reuse and repair them; provide a functional current-phase view where absent. Avoid creating duplicate navigation or an unneeded new UI framework.

| View | Minimum current-phase behaviour |
|---|---|
| Project Resource Plan | Create/edit persistent demand and sourcing drafts; group by zone/department; show quantities, dates, assumptions, proposed coverage and unknown source availability |
| Portfolio Resource Planner | Compare authorized projects and dated demand; identify conflicts supported by available data; provide a table/list alternative to the timeline |
| Conflict and Decision Queue | Explain affected demand, constraints and missing evidence; assign an owner and record a proposed resolution/decision |
| Source-backed equipment/vendor detail | Show permitted snapshot/reference data, source, check time and unavailable actions; do not invent a connected directory |
| Settings → Integrations | Show both connections, disabled mode, capability status, configuration permissions and useful unconfigured/error explanations |

EOS-owned planning functions must work while source connections are deferred. Where source data is absent, show the missing dependency rather than synthetic stock or a blank page with an unexplained disabled button. Demo fixtures belong only to an explicitly isolated demonstration/test context.

Follow the shared EOS components and semantic tokens. Preserve light/dark/system themes, English/Arabic and RTL behaviour, keyboard navigation and reduced-motion handling. Use existing tables, tabs, forms, drawers and status components. No one-off design system or module-specific hardcoded theme colours.

Inspect representative desktop and narrow layouts. Check loading, empty, populated, disconnected, stale, permission-denied and failed-save states. Verify that refresh, another authorized user and project switching show the correct persistent records. Settings badges alone are not evidence of the planning workflow.

## 9. Permissions and source boundaries

Apply existing backend authorization to routes, reads, edits, operations, configuration and evidence. Resolve actor, tenant and allowed connection from trusted server context; validate project/source references within it.

Test at least a project planner, an authorized integration administrator and a user without access to the project. An ordinary planner cannot change connection credentials or enable capabilities. EOS Super Admin access does not silently grant external procurement approval rights.

Do not expose credentials in API responses, logs, screenshots or exports. Keep restricted supplier data and internal costs out of client responses, including direct API access. Use existing secret references and Settings persistence rather than adding plaintext credentials to a connector object.

## 10. Focused acceptance and evidence

Use two newly created synthetic projects with distinct users, requirements and dates. Keep fixture identifiers unrelated to existing demonstration project codes. Run failure injection and application/worker restart only in isolated instances.

| Acceptance area | Evidence needed now |
|---|---|
| Authority | Production bindings and route/service trace demonstrate no simulator fallback or competing stock/vendor authority |
| Deferred operation | Direct API attempts cannot confirm source-owned actions through disabled connectors |
| Buffers | Different configured fixture policies and already-buffered input produce correct intervals without double application |
| General calculations | Cases A–F and additional date/location variation pass without scenario branches |
| Durability | Drafts, changes, settings and implemented operation records survive refresh, another session and isolated restart |
| Isolation | Cross-project/tenant references and unauthorized configuration changes are rejected |
| Retry/state | Duplicate requests, changed payloads, stale revisions and simulated unknown outcomes have explicit results |
| UI | Actual screenshots and recorded interaction outcomes for the implemented planning and Settings views |
| Regression | Relevant existing lifecycle checks continue to pass; run repository-required typecheck/build/test gates |
| Release identity | Exact tested commit or working-tree state, environment, migration version and actual command results |

Write meaningful assertions around business outcomes and failure cases. Test totals are supporting information, not a target. Do not add superficial tests that merely restate implementation constants or expand testing beyond a concrete risk or repository gate.

Live authentication, true cross-channel reservation concurrency, source webhooks, source receiving and production procurement remain **Deferred / Not tested**. Their absence is expected for this phase. Simulator tests must not turn those future gates green.

If an authorized staging deployment is available, record the actual deployment identity and verify the affected screens there. Otherwise report local verification accurately and leave deployment unverified. Do not deploy to production or claim a rollout solely from a successful build.

## 11. Delivery and completion criteria

Implement corrections in reviewable increments: authority and binding isolation; mode/policy/calculation fixes; persistence and permissions; usable screens and focused acceptance. Keep the external connections disabled throughout.

Update the existing documentation rather than replacing the audit history with a new success summary. Deliver a concise foundation correction report containing:

- Each concern, whether confirmed or disproved, relevant code location and resulting change.
- Production versus test binding ownership, plus remaining source API gaps.
- Tests with actual expected/observed outcomes and UI evidence.
- Exact commit/working-tree and deployment identities applicable to the evidence.
- Migrations/backfills, preserved historical records and rollback considerations.
- Remaining deferred work, without presenting it as a current-phase defect or completed live capability.

Use separate status columns for **Implementation**, **Local verification**, **Staging verification** and **External verification**. Label simulator results **Contract verified**. Do not collapse all of these into “complete.”

This task is complete when EOS provides a durable, authorized planning workflow, its disconnected behaviour is enforced by the server, source-system responsibilities remain intact, and the evidence demonstrates those outcomes on fresh data. Return the completed changes and remaining limitations, not another request to approve the same routine correction work.
