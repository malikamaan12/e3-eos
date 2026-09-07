# Quality, acceptance and requirement traceability

**Version:** 1.0 | **Test status:** specifications only; this document does not claim the EOS implementation has passed them

## 1. Quality approach

Every module is delivered as a vertical slice: database migration, API/schema, access policy, UI/RTL/error states, audit/events, unit/integration/browser tests, monitoring and runbook. Use real PostgreSQL for transactional/RLS/reservation tests; SQLite mocks cannot validate these invariants. Provider sandboxes/contract fixtures are separate from core tests.

Test layers: pure domain and property tests; policy compile/evaluate fixtures; database concurrency and isolation; API schema/permission/idempotency; browser workflows and accessibility; actual mobile offline devices; connector signature/replay/outage; load; recovery; independent security assessment.

Use synthetic organisations, projects, staff and vendor accounts in fixtures. Label them unmistakably; never seed invented approvals, people, purchases or financial entries into production. Sanitised migration rehearsal data needs explicit permission and classification.

## 2. Mandatory scenario register

Each implementation test must link its ID to a test path, run/commit ID, environment, result and reviewer. These cases incorporate and extend the seventeen clarification-addendum scenarios. A UI screenshot is not execution evidence for concurrency or authorisation.

| ID | First phase | Scenario | Expected result |
|---|---|---|---|
| AT-001 | P00 | Unauthorised organisation/project ID supplied | API, exports, file access, search and job status deny cross-scope data; no existence leakage. |
| AT-002 | P00 | Client calls internal costing API | Request denied server-side; response and logs contain no buying rates or payroll. |
| AT-003 | P00 | Approver role revoked after policy publication | Next decision/release denied despite old snapshot or active browser session. |
| AT-004 | P00 | One identity assigned two approval roles | Cannot satisfy a required independent two-person decision. |
| AT-005 | P00 | Requester weakens own pending approval route | Protected change flow detects effect; no silent self-authorisation under weaker policy. |
| AT-006 | P00 | Bootstrap/recovery account used | No demo backdoor; witnessed setup/recovery evidence, expiry, MFA and immediate audit alert. |
| AT-007 | P00 | Pooled database connection changes organisation | Transaction-local scope cannot leak into next request; app DB role cannot bypass RLS. |
| AT-008 | P00 | Invalid/oversized/malicious upload | Quarantined; never publicly readable, executed or accepted as evidence. |
| AT-009 | P00 | Queue job retried after process crash | Exactly one business effect through durable idempotency, not an exactly-once delivery assumption. |
| AT-010 | P00 | Session CSRF/origin/header manipulation | Forged browser command blocked; raw webhook body remains correctly verifiable. |
| AT-011 | P00 | Node/Nest/Better Auth/Drizzle integration spike | Exact stable version lock successfully runs auth, MFA, migration, RLS, transaction and queue tests. |
| AT-012 | P00 | Audit store privileged tamper simulation | Application edits denied; controlled privileged change detectable against external manifest; no untamperability claim. |
| AT-013 | P01 | Five-stage and thirteen-stage projects compared | Shared procurement metrics use canonical events and definition versions, not stage names. |
| AT-014 | P01 | Idea saved without client/venue/budget | Unknowns preserved; no fake zero/date/client inserted. |
| AT-015 | P01 | Lost tender is closed | Maturity closed and outcome lost, not delivered or won. |
| AT-016 | P01 | Task completed without required acceptance | Completion visible while acceptance remains pending. |
| AT-017 | P01 | Inspection stage removed | Applicable inspection obligation persists until authorised disposition; scope coverage does not falsely improve. |
| AT-018 | P01 | Stage split/merge/repeat/reopen | Stable records/history survive; dependencies mapped; cycles rejected or explicit new instances created. |
| AT-019 | P01 | Custom field type/requiredness changed | Migration previews old values, conversions and gaps; no silent historic corruption. |
| AT-020 | P01 | Policy compilation fails | Prior valid snapshot remains active; no partial activation. |
| AT-021 | P01 | Country source changes with active pinned project | Affected open work reviewed with effective dates; source change not hidden by pinning. |
| AT-022 | P01 | Current fact unknown/stale | Three-valued evaluation applies relevant restriction/verification; never interprets unknown as passed. |
| AT-023 | P01 | Exception reviewed and closed | Historical unmet condition remains; active review closes without permanent false unresolved status. |
| AT-024 | P01 | Single-use exception reused/replayed | Only authorised target executes once; second different use rejected. |
| AT-025 | P01 | Exception expires before review deadline | No new authorisation possible; review status remains independent. |
| AT-026 | P01 | Permanent business change requested | Uses new policy version, not endless emergency renewal. |
| AT-027 | P01 | High-consequence preapproval replaced by later task | Release still blocked until required current prior authority exists. |
| AT-028 | P01 | Immediate stop-work action needed | Protective action and incident capture available without ordinary release approval delay. |
| AT-029 | P01 | Overdue exception follow-up | Only configured risk-related actions restricted; unrelated invoicing/reporting/protective action available. |
| AT-030 | P01 | Clone event with costs/signatures/reservations | Only permitted templates/structure copied; historical proof and personal data reset. |
| AT-031 | P01 | Tender deadline across timezone/DST boundary | UTC/source IANA zone preserved; local view and elapsed/business duration calculation correct. |
| AT-032 | P02 | PO/proposal significant amount/supplier/design changed after approval | Prior relevant approval superseded or re-evaluated; execution cannot reuse stale content hash. |
| AT-033 | P02 | Certificate issued after activity | Actual dates shown; cannot be presented as existing before release. |
| AT-034 | P02 | New internal drawing revision uploaded | Client sees only published revision; production release purpose/version explicit. |
| AT-035 | P02 | Client approval attempts different publication ID | Scope/version/purpose check fails without revealing internal content. |
| AT-036 | P02 | Publication withdrawn while link exists | Future access denied; UI does not promise recall of previous downloads. |
| AT-037 | P02 | Estimate contains hourly/shift units and lump-sum breakdown | Explicit conversions and allocations; no multiplication of full lump sum across children. |
| AT-038 | P02 | BOQ fee/tax/discount/rounding scenarios | Deterministic Decimal calculation and versioned basis match expected totals. |
| AT-039 | P02 | Margin confused with markup or zero revenue | Correct formula; zero/unknown denominator clearly not available. |
| AT-040 | P02 | Proposed change not client authorised | Shown as pending exposure, excluded from approved contract/budget. |
| AT-041 | P02 | Client click recorded as acceptance | Labelled native decision, not invented government/legal signature certification. |
| AT-042 | P02 | Arabic/English report and portal with long text | RTL layout, wrapping, keyboard focus and non-colour status indicators usable. |
| AT-043 | P03 | Concurrent release requests for one PO | One commitment and one external delivery intent; same idempotent result returned. |
| AT-044 | P03 | Two call-offs concurrently consume parent ceiling | Atomic allocation prevents unapproved ceiling overrun. |
| AT-045 | P03 | Supplier order times out remotely | Outcome ambiguous; reconciliation before resend prevents duplicate external order. |
| AT-046 | P03 | Supplier bank details changed | Protected review/verification occurs; ordinary vendor editor cannot silently redirect authorised payment details. |
| AT-047 | P03 | Sole-source/cash/freelance supplier route | Configured fields/grace/source rationale supported without fabricated documents or comparisons. |
| AT-048 | P03 | Drawing changes after fabrication release | Affected work orders/POs flagged; already built item retains actual source version. |
| AT-049 | P03 | Two projects confirm same exclusive asset | Database reservation invariant permits only non-overlapping authoritative claims. |
| AT-050 | P03 | Bulk stock concurrent demand exceeds pool | Locked capacity check rejects excess; no oversell from two prechecks. |
| AT-051 | P03 | Asset returns damaged or under maintenance | Not available until serviceability release; custody and reservation states remain separate. |
| AT-052 | P03 | Current rentals inventory cutover | Opening balances/bookings/conditions reconcile; only one writer controls each pool after cutover. |
| AT-053 | P03 | PO split across packages and partial receipts | Allocations equal source once; rejected/unreceived portions remain explicit. |
| AT-054 | P03 | Subrental shortage detected | Creates request/forecast exposure, not automatic unauthorised supplier commitment. |
| AT-055 | P04 | Worker qualification revoked while device offline | Attendance observation retained for review; no new authoritative qualified release from stale bundle. |
| AT-056 | P04 | Offline operations repeat/out of order | Per-operation results/deduplication; current accepted record not overwritten by stale fact. |
| AT-057 | P04 | Photo queued but binary upload incomplete | Record pending evidence; not accepted as fully verified completion. |
| AT-058 | P04 | Device storage evicted or session revoked | Local recovery/contingency disclosed; no claim of guaranteed background sync or remote offline wipe. |
| AT-059 | P04 | Readiness 99 percent but one critical inspection unresolved | Affected zone/package not ready; percentage cannot override condition. |
| AT-060 | P04 | Permit upload absent but actual verification exists | Alternative verification follows policy; not assumed absent nor falsely uploaded. |
| AT-061 | P04 | Required external approval actually absent | No generic administrative grace period authorises the prohibited activity. |
| AT-062 | P04 | Travel/setup/return windows overlap other booking | Resource conflict includes full planning window, not only public event hours. |
| AT-063 | P04 | Overlapping shifts/rest/calendar change | Approved jurisdiction/profile rules applied with explicit unresolved exceptions and no hard-coded country rate. |
| AT-064 | P04 | Incident includes restricted personal narrative | Command centre/client/report projections limit detail to permitted audience. |
| AT-065 | P04 | Service acceptance and bump-out damage | Delivery completion separate from venue reinstatement, returns and claims. |
| AT-066 | P05 | Worked accrual-to-invoice example | EAC remains 90,000 when 10,000 moves from accrued to actual; no double count. |
| AT-067 | P05 | Financial source file imported twice | Unique source identity rejects duplicate business effects; batch history retained. |
| AT-068 | P05 | Invoice quarantined by accounting ledger | EOS shows awaiting/rejected ledger status, not posted or paid. |
| AT-069 | P05 | Credit note/reversal arrives after final report | Corrective fact and report revision; original report/source manifest retained. |
| AT-070 | P05 | Allocation sum exceeds invoice line | Validation rejects or routes rounding discrepancy; no duplicated source expense. |
| AT-071 | P05 | Financial period/currency/FX rate differs | Source and reporting bases preserved; no silent addition of mixed currencies. |
| AT-072 | P05 | Provider webhook forged or replayed | Verify/dedupe/quarantine per actual contract; no unauthenticated state change. |
| AT-073 | P05 | BookingQube API unavailable/unverified | Validated import/manual aggregates used; no fabricated endpoint or false live metric. |
| AT-074 | P05 | Ticket entries and daily uniques aggregated | Definitions prevent repeat entries becoming unique visitors or invalid unique sums. |
| AT-075 | P05 | Metricool stale or plan lacks API | Connector disabled/provisional; source freshness disclosed and core operation unaffected. |
| AT-076 | P05 | Calendar event changed externally | Creates reconciliation/change proposal, not silent baseline rewrite. |
| AT-077 | P05 | Client report generated from internal data | Server-side audience projection and sensitive-field tests pass. |
| AT-078 | P05 | Operational project closed with receivable open | Operational closure allowed under policy; settlement remains open. |
| AT-079 | P05 | Report generated twice from frozen snapshot | Deterministic content/basis or documented generation metadata; no duplicate publication effect. |
| AT-080 | P06 | Scenario favourable, then another project reserves resource | Apply rechecks actual availability; scenario does not act as a reservation. |
| AT-081 | P06 | Rule override rate exceeds proposed threshold | Flags contextual review with denominator/sample; does not auto-weaken policy. |
| AT-082 | P06 | Crew hours complete but deliverable incomplete | EVM does not earn value from time/scan alone. |
| AT-083 | P06 | Tender contains prompt injection instructions | AI treats as data; no tool execution, approval or cross-project disclosure. |
| AT-084 | P06 | External AI disallowed by classification | No request leaves approved boundary; manual workflow remains available. |
| AT-085 | P06 | AI generated requirement without valid source | Marked suggestion, rejected/quarantined until human source verification. |
| AT-086 | P06 | Second country/cell rollout | Jurisdiction rules and data processing reviewed; no implicit global replication or cross-cell double booking. |
| AT-087 | P07 | Restore database and object manifests in isolated environment | Recovery targets measured; domain balances, approvals and references reconcile. |
| AT-088 | P07 | Rollback after external PO already sent | No deletion/reset; compensating business action and reconciled delivery state. |
| AT-089 | P07 | Production deployment contains mock data or placeholder connector success | Go-live blocked; only approved source records/configuration activated. |
| AT-090 | P07 | Large event load and dependency pressure | Agreed p95/queue freshness targets met or launch scope/capacity adjusted with evidence. |
| AT-091 | P07 | RLS/export/file/portal independent security assessment | No unresolved exploitable critical/high defects in accepted release scope. |
| AT-092 | P07 | Operational owner support drill | Named owners can use runbooks, reconcile failures and verify actual project closure. |

## 3. Requirement traceability contract

Every backlog item carries module ID, stage activity IDs if applicable, rule/metric/API references, migration IDs, permission tests and acceptance IDs. A phase cannot pass with unimplemented dependencies hidden as TODO buttons. An item can be explicitly out of scope only with owner, reason, impact and disabled production feature flag.

| Requirement family | Source | Implementation anchor | Acceptance focus |
|---|---|---|---|
| Project begins at idea/tender | E3 onboarding direction and stage 01 | M01/M02, P01 | Unknowns, alternate outcomes, intake/template version. |
| Every project can differ | E3 configurability direction, v0.2 refinements | M03/M06, P00/P01 | Stage migration, protected authority, snapshots and source conflicts. |
| Trace request to delivery/evidence | Original lifecycle plan | M02/M04/M05/M08/M09/M13 | Coverage, exact revisions, cost/resource links and acceptance. |
| No false progress or compliance | v0.2 canonical/exception clarification | Shared state and decision model | Completed versus accepted; missing condition versus closed deviation review. |
| Internal/client separation | Original two-interface vision | M16/M18 | Projection, version, audience and negative access tests. |
| BOQ-to-profitability | Original commercial-control vision | M07/M08/M14 | Units, commitments, partial matching, accrual transitions and reporting basis. |
| Multi-country expansion | Explicit user direction | M03/M11/M12/M18 | Local calendars/currency/rules plus separate hosting/residency review. |
| Safe offline/integration | Architecture review and refinements | M13/M17 | Provisional facts, source authority, dedupe, freshness and outage behaviour. |
| Final report and learning | Event lifecycle stages 12/13 | M14/M15 | Source snapshot, client redaction, closure dimensions and reusable lessons. |

## 4. Non-functional acceptance

Measure targets in the architecture/security specs with the agreed data sizes and production-like network. Include database lock contention, high-latency mobile links and degraded providers. Obtain baseline at P00, repeat before each pilot, and retain dashboards/load scripts. No claim of zero latency or 100 percent capture completeness.

Accessibility target is WCAG 2.2 AA for core journeys as a proposed acceptance standard; validate keyboard navigation, focus, labels, error announcements, contrast and non-colour state cues. Real Arabic users review RTL and date/number formatting. Use representative printed/PDF/XLSX output samples.

Security acceptance includes threat-model review, object-level authorisation, field projections, session/MFA recovery, dependency scans, upload threats, secret handling, restore exercise and independent assessment. Critical and high vulnerabilities affecting accepted scope are resolved or the affected feature remains disabled; risk acceptance cannot fabricate a passed safety or security test.

## 5. Evidence folder per release

```text
release-evidence/<release-id>/
  scope-and-feature-flags.md
  dependency-lock-and-sbom.json
  migration-plan-and-reconciliation.md
  automated-test-results/
  security-review-and-remediation.md
  load-and-recovery-results.md
  provider-capability-evidence/
  uat-signoffs.md
  operational-readiness.md
  remaining-risks-and-approved-dispositions.md
```

This evidence folder is a developer deliverable, not included test output from this planning exercise. P07 sign-off is by designated E3 product, operational, finance and security owners, not the developer alone.
