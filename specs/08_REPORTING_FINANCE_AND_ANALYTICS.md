# Finance, metric contracts, final reporting and knowledge reuse

**Version:** 1.0 | **Purpose:** accurate management control without replacing a statutory ledger

## 1. Financial dimensions

Keep original budget, authorised budget changes, current budget, committed cost, posted actuals, unmatched accrued cost, remaining commitments, uncommitted forecast, pending-change exposure, billing, collection and cash paid separate. Amounts include currency, source, confidence, effective period and review status.

A signed contract, an approved investment budget, a cost estimate and collected cash are not equivalent authority or accounting facts. EOS may prepare draft invoices; posted tax and statutory entries remain in the chosen ledger. A project can be physically complete while financially unsettled.

Client projects support fixed-price, unit-rate, reimbursable and call-off models. Promoted/IP events include tickets, sponsors, concessions, rights/royalties, venue participation and commercial assumptions. Record minimum guarantees and revenue shares as explicit contract models, not buried percentage notes. Pending sponsor discussions do not become committed revenue.

## 2. Calculation contract

All formulas use decimal arithmetic and a versioned financial definition. The following is the selected management model, subject to approved scope and accounting mapping:

```text
Current authorised budget = Original budget + Approved budget changes
Cost incurred = Posted actual cost + Accepted unposted accrued cost
Estimate at completion (EAC) = Posted actual cost
                            + Accepted unposted accrued cost
                            + Remaining unperformed commitments
                            + Forecast uncommitted work
Budget variance = Current authorised budget - EAC
Forecast contribution = Approved revenue basis - EAC
Forecast contribution margin = Forecast contribution / Approved revenue basis
```

When revenue basis is zero or unknown, margin is not reported as infinity or silently zero. Show not applicable/unknown and the underlying reason. Cash position uses actual receipt/payment data and does not imply recognised profit. Management net margin must state whether overhead, financing, rights costs, nonrecoverable tax and FX are included.

A PO's recognised portion moves from remaining commitment to actual/accrued cost. Accepted-but-unbilled work may be accrued; when the matching invoice posts, reverse/replace that accrual rather than add it again. Deposits are not automatically expenses. Partial invoices/receipts, retentions, credit notes, returns and disputes require line-level matching.

## 3. Worked example and invariant

Example amounts in QAR, illustrative only, excluding tax/FX and overhead unless stated:

| Item | Amount | Treatment |
|---|---:|---|
| Original budget | 100,000 | Approved starting cost baseline. |
| Approved budget changes | 10,000 | Current authorised budget becomes 110,000. |
| PO authorised total | 70,000 | Consists of 30,000 posted invoices, 10,000 accepted unbilled and 30,000 remaining unperformed. |
| Non-PO posted actual | 5,000 | Actual costs outside that PO. |
| Other accepted accrual | 2,000 | Accrual outside that PO. |
| Uncommitted future forecast | 13,000 | Not already covered by PO or accrual. |
| Approved revenue basis | 160,000 | Pending variation of 10,000 remains excluded. |

Posted actual = 35,000; accrual = 12,000; remaining commitment = 30,000; uncommitted forecast = 13,000. EAC = 90,000. Budget variance = 20,000 favourable. Forecast contribution = 70,000. Contribution margin = 43.75% on the stated basis.

After the 10,000 accepted-unbilled PO amount is invoiced, actual becomes 45,000 and accrual becomes 2,000. EAC remains 90,000 if nothing else changes. This is a mandatory automated test, not a dashboard illustration only.

## 4. BOQ and procurement costing

Each measurable line has quantity, UOM, unit cost, unit sell rate, duration multiplier where applicable, components, assumptions, delivery location and source. One genuinely indivisible contracted item can be quantity 1/job. A breakdown of a lump-sum total must use meaningful units and allocations; do not repeat the full lump sum in every child line.

Labour, equipment, materials, transport, subcontracting, rights, contingency and overhead allocations are explicit components. Prevent mixing a hourly rate with a shift count without an approved conversion. Separate margin (`profit/revenue`) from markup (`profit/cost`). Taxes, discounts, agency fees and contingency have explicit order-of-operations and rounding tests.

Rate cards have currency, effective dates, supplier/entity applicability, validity and evidence. Historic rates are suggestions, not current quotes. A design change produces a scope/cost/time impact proposal. It does not silently alter an already accepted client price.

## 5. Canonical reporting contract

| Metric | Required definition | Integrity rule |
|---|---|---|
| Procurement lead time | Approved request instant to issued order instant; specify business or elapsed calendar | Use named events, not mutable stage labels. Missing event != zero duration. |
| Supplier delivery reliability | Accepted receipt versus confirmed required date, with partial-delivery method | Promised delivery is not accepted receipt. |
| Approval turnaround | Request-ready instant to final valid decision; define paused periods | Changes-requested and superseded requests measured consistently. |
| Milestone reliability | Actual completion against chosen approved baseline | Moving the forecast must not rewrite historical baseline performance. |
| Readiness | Critical applicable conditions by package/location and validity | Do not average away one unresolved critical release condition. |
| Override rate | Exception-authorised eligible decisions / all eligible decisions, by rule/version/context | Include denominator, sample size and open versus closed follow-up. |
| Scope coverage | Applicable requirements with owned deliverables/dispositions / applicable requirements | Deleting a stage cannot make a requirement vanish from denominator. |
| Tickets sold | Source-valid ticket units with specified refund/void treatment | Not identical to people attended or entry scans. |
| Unique visitors | Defined deduplication identity/period/source | Do not sum daily unique counts as event uniques without cross-day dedupe. |
| Entries | Valid check-in/entry events with re-entry handling | Distinguish repeat entry from unique attendance. |
| Marketing outcomes | Platform metric definition, campaign mapping, attribution window, source as-of | Do not sum reach across platforms and call it unique audience. |
| Financial forecast | Approved revenue/EAC definition, currency basis and freshness | Not labelled audited statutory profit. |
| Client satisfaction | Survey question, scale, response count, sample period and method | No NPS claim from unrelated rating or unverified anecdotes. |

Each definition has immutable ID/version, formula, units, time basis, exclusions, dimensions, owner and source dependencies. Changing a definition creates a new version; historic reports keep the old one. Maturity mapping supports pipeline, while project outcome separately records lost/cancelled/delivered. Task completion and acceptance remain independent.

## 6. Earned value and scenarios

EVM is optional P06 and only applies to work packages with a valid scope/budget baseline, planned-value curve and measured acceptance/progress method. Timesheets and scans are cost/resource evidence, not earned value by themselves.

Define PV, EV, AC, CPI = EV/AC and SPI = EV/PV with a documented method, period and zero-denominator behaviour. Unsupported packages show not applicable. Never infer 80% earned value because 80% of crew shifts elapsed.

Portfolio what-if snapshots changes to schedule, calendars, preparation/return buffers, crew skills, workshop capacity and inventory. Scenarios have no live write effect. On apply, recheck current record/resource/authority versions, produce a diff and obtain appropriate approvals. Applying a schedule scenario does not silently commit subrentals or change other PMs' approved budgets.

## 7. Final reports

Report builder uses versioned sections, audiences, requiredness, styling, charts/tables and evidence rules. No universal hard-coded closeout date. Each project sets contractual report deadlines and internal review deadlines, with explicit timezone/date formula.

| Client report sections | Internal-only supplement |
|---|---|
| Agreed scope, objectives and delivery summary | Estimate accuracy, margin basis and cash exposure. |
| Milestones, selected approved changes and acceptance | Vendor buy rates, procurement analysis and commitment exceptions. |
| Attendance/marketing/feedback with definitions | Workforce/productivity and restricted incident review where permitted. |
| Approved photo/video assets and evidence | Detailed claims, accruals, disputes and forecast risk. |
| Sponsor/partner outcomes where contracted | Supplier/team evaluation and reusable lessons. |
| Disclosed limitations, provisional data and next actions | Configuration performance and remediation ownership. |

A report job captures source IDs/versions, metric definitions, financial period, data-as-of, freshness, redaction profile and template version. Rendering retries are idempotent. Reviewers approve the exact report hash/version. Publishing emits a client projection, not an unrestricted ZIP of internal folders. Later corrections produce a revised report with change notice, not an overwritten “final”.

## 8. Closure and learning

Maintain separate operational, client-acceptance, reporting, financial-review and settlement closures. Disclosure of open claims/receivables allows an authorised operational closure but not false settlement. Closure can be reopened for a stated dimension with reason and audit. Archiving disables normal operational edits while preserving authorised corrections and retained access.

Lessons capture context, root cause, recommendation, evidence, responsible reviewer and proposed reusable template/rate update. A lesson becomes a template change only through reviewed publication. The rule analyser cannot auto-remove a permit or approval requirement because it is frequently bypassed.

## 9. Export and dashboard implementation

Build scoped SQL projections/materialised views over canonical records; no browser calculation of authoritative margins. Dashboard values include definition version and freshness. Rebuild projections deterministically and test against source totals. Row/project permissions apply before aggregation where needed; small sensitive groups are suppressed by reporting policy.

Allow approved PDF, XLSX, CSV and JSON exports with classification/manifest. Neutralise CSV formula injection, limit file sizes, log sensitive downloads and expire access links. Decimal strings round only for display/export according to currency/UOM policy; export retains the underlying calculation basis.
