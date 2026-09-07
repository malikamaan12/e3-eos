# Configuration, workflow, authority and exception engine

**Version:** 1.0 | **Precedence:** supersedes contradictory v0.1 wording and incorporates the v0.2 clarification addendum

## 1. Core promise and protected boundaries

Every project can have its own stages, fields, calendars, responsibilities, business rules, approval routes, exceptions and reporting. A Super Admin can configure the product and initiate authorised overrides. This does not mean one generic `is_admin` flag grants every financial, technical or external authority.

Three boundaries apply:

| Layer | Editable content | Protection |
|---|---|---|
| Project flex | Structure, forms, tasks, internal thresholds, schedules, selected approval routing and business validations | Scoped authoring and versioned publication, impact preview and history. |
| Company governance | Spending authority, ability to change protected policies, separation of duties, exception classes and sensitive data access | Independently governed publication; changing one's pending transaction route cannot silently self-authorise it. |
| System integrity | Stable identity, truthful provenance, referential integrity, no cross-project leakage, no fabricated external fact | Not disableable by project configuration. Engineering changes require controlled release, not an override button. |

External obligations can be updated, disputed or found inapplicable with reviewed source/evidence. An internal exception cannot fabricate an external permit, client signature, structural test result, physical resource or collected payment.

## 2. Configuration sources and resolution

Model typed sources rather than blind nine-step last-write-wins inheritance. Supported scopes are platform capability, organisation, legal entity, country/jurisdiction, client/contract, venue/location, project template, project/package and temporary exception. Profiles can include multiple applicable sources at the same level. A contract/venue requirement is not automatically legally superior or inferior to another source.

For editable defaults, resolve from broad to narrow within the permitted override boundary. For external obligations and protected controls, retain all applicable constraints. A conflict is a record requiring authorised interpretation or changed scope, not silent deletion of whichever source appeared first. Temporary exceptions authorise named actions; they do not mutate the published policy snapshot.

Each rule stores `rule_id`, `version`, `scope`, `source_ref`, `owner`, `review_status`, `effective_from/until`, `applicability`, `condition`, `outcome`, `severity`, `authority_class`, `fact_dependencies`, `freshness_requirements`, `exception_policy` and `remediation_template`.

Use `USER_CONFIRMED`, `PROPOSED_DEFAULT`, `REQUIRES_LOCAL_REVIEW` and `VERIFIED_FOR_SCOPE` as policy provenance labels. No country pack is legally verified because a developer added a country code.

## 3. Authoring versus execution

Maintain separate objects:

- **Authored configuration:** editable drafts/deltas with review comments.
- **Compiled effective snapshot:** immutable, flattened applicable rules/forms/graph with source manifest, compiler version, content hash and applicability scope.
- **Decision record:** evaluation of an exact snapshot with current facts, authority epoch, result, reasons and any exception use.

Publication workflow: draft -> validate types/graph/scope -> evaluate representative fixtures -> preview changed requirements and affected records -> obtain protected publication authority where applicable -> atomically activate -> notify/recalculate future work.

Compilation failure never partially changes an active project. Keep the last valid snapshot. Do not quietly continue under an old snapshot when a separately effective legal/security restriction applies; show scope impact and route it to the accountable owner.

A pointer `(organisation,project,scope,active_snapshot_id,revision)` is changed using optimistic concurrency. Invalidate affected caches by version. A decision stores the snapshot hash, not merely the current template name. Pinned business snapshots do not freeze current access grants, available inventory, budget, issued drawings or qualification validity. Policy precomputation reduces repeated work but does not eliminate runtime evaluation (S23).

## 4. Bounded rule language

Choose JSON AST with a typed schema. Supported initial operators: `all`, `any`, `not`, `eq`, `ne`, `in`, `exists`, `gt/gte/lt/lte`, `within_interval`, `has_evidence`, `has_authority`, `sum_decimal`, `date_add` and references to registered fact providers. Money comparisons require a currency/basis match. Computed facts are server-controlled and permission-scoped.

Three-valued evaluation is mandatory: true, false and unknown. Missing data never evaluates as a successful check. Each rule specifies handling of unknowns: collect information, warn, seek alternative verification or restrict the affected action according to its risk policy. Do not infer safety from a null value.

No `eval`, arbitrary JavaScript/SQL, unbounded recursion, template executable code or rule-initiated external HTTP. A requested new operator is a versioned code feature with tests. Limit graph size, expression depth, evaluation time and output size. Engineering safety limits are configurable by platform operators within validated bounds, not lifted by a business exception.

Illustrative rule payload, not an approved E3 procurement policy:

```json
{
  "ruleId": "vendor.comparison.required",
  "version": 1,
  "classification": "PROPOSED_DEFAULT",
  "scope": {"projectId": "example-project"},
  "trigger": "purchase_order.release",
  "condition": {
    "op": "eq",
    "left": {"fact": "procurement.comparisonAccepted"},
    "right": {"literal": true}
  },
  "whenFalse": "require_authorised_exception",
  "whenUnknown": "request_verification",
  "exceptionPolicyId": "project-commercial-exception-v1",
  "sourceRef": "project-procurement-policy-v1"
}
```

## 5. Workflow graph and schedule changes

Template nodes/edges use IDs and canonical mapping, not stage numbers. Stages group work; dependencies reference actual tasks/deliverables. Enforce an acyclic dependency graph for scheduling. A repeat/reopen command creates a new cycle instance or transition history rather than a hidden graph cycle. Support parallel branches, AND/OR joins, entry/exit conditions and explicit cancellation/disposition routes.

Add/remove/merge/split changes create a migration plan mapping old nodes, tasks, fields, requiredness and approvals. Preserve existing work IDs where possible. Unmapped required work blocks publication or is explicitly dispositioned by an authorised reviewer; it is never silently orphaned.

Baseline, current forecast and actual dates remain separate. Approval of a reschedule does not automatically approve a new cost. Fixed contractual dates need an explicit approved amendment before the baseline changes. Scenario runs use snapshots and have no write side effects until authorised apply.

## 6. Approval engine

An approval request specifies target type/version/hash, purpose, amount/currency where relevant, scope, authority policy version, required roles/identities, sequence/parallel branches, quorum, validity, delegate rules and conditions. Approvers see significant transaction details and the exact documents. No generic `approved=true` update endpoint.

Support sequential, parallel and threshold-based routes, substitute approvers, abstention, return for revision, rejection, conditional approval, withdrawal, expiry and supersession. Missing approver is an explicit blocker/assignment action, not an automatic approval. Quorum defaults and timing are project-configurable within protected authority.

At decision and execution time recheck identity, current membership, delegated limits, target version and required independence. Material changes invalidate the corresponding authorisation. Purely descriptive metadata can be excluded only by a documented significance definition. Approvals and releases have separate purposes: concept accepted does not mean issued for fabrication; supplier selection does not mean payment released.

## 7. Authority separation and break-glass

Configuration administration, commercial approval and technical/HSE verification are distinct permissions. A person can hold multiple roles only as explicitly assigned. Where two-person approval applies, two roles under the same user ID do not satisfy it. Audit review alone is not a substitute for pre-release authority. S21-S22 support current request and transaction-bound checks.

Protect authority-policy changes through an organisation-level publisher permission, recorded review and scoped activation. A requester cannot weaken a control over their own pending transaction and then approve under the weaker rule. Such a case is detected in the impact preview and must obtain the originally required independent authority or a separately configured ultimate owner-authorised route. The owner route is labelled as such, never as a fictitious two-person approval.

Bootstrap is special: P00 provisions the initial governance owners through an approved deployment/runbook with named witnesses and immutable setup evidence. Do not ship an unchangeable demo Super Admin account or permanent developer backdoor. Privileged access recovery uses a separate, monitored recovery process.

## 8. Exception model

Keep four distinct records: condition evaluation; exception authorisation; exception use; follow-up review. An unmet condition remains historically unmet at the action time. An authorised resolution can close the active deviation without rewriting the historical check.

| Exception mode | Permitted behaviour |
|---|---|
| Delegated direct deviation | A properly authorised person permits a lower-consequence internal exception within their limits. |
| Independent pre-release exception | Required distinct reviewer(s) must approve before the scoped release. |
| Protective action plus review | Stop unsafe work or take the configured protective action immediately, then record/review. Not a general spending bypass. |
| Evidence/authority resolution | Obtain or verify the actual missing external evidence; internal permissions do not certify it. |

Temporary exception fields: target rules/records/actions, requester, reason, authority basis, evidence, risk/consequences, permitted identities, `valid_from`, `valid_until`, `maximum_uses`, amount/currency cap where relevant, affected location/period, review owner/template, `review_due_at`, revocation and closure disposition. Clock is the trusted server clock for execution, not a field device timestamp.

Single-use consumption and the business action occur in one transaction with a unique target-action ID. Retry returns the original result. Scope mismatch, expiry, revoked authority, exhausted use or changed target version requires new authorisation. A generic warning override cannot consume a financial exception.

Expiry blocks future use and restores ordinary checks for subsequent actions. It does not reverse executed work or close the review. Permanent changes use a new policy version, not endlessly renewed emergencies. Review deadlines and consequence rules are configurable; no universal 48-hour allowance or automatic freeze of unrelated payments.

## 9. Worked urgent purchase example

A package needs a replacement component. Comparison acceptance is false, but the project commercial policy permits an authorised single-order sourcing exception. The request names the PO version, supplier, scope, amount/currency, valid period and review owner. Required reviewers approve. Release atomically consumes the exception and records the PO/commitment/outbox.

After delivery, Finance reviews the sourcing rationale and evidence, then closes the deviation. The original condition is still recorded as false; the historical exception remains reportable; the follow-up is closed. Quotes collected afterwards are not presented as quotes obtained before the order. An exception cannot be reused on another PO or revived by changing a date field.

## 10. Update classes and migration

| Update | Active-project behaviour |
|---|---|
| Optional workflow/template improvement | New projects inherit; existing projects adopt after preview and review. |
| Corrected applicability or contractual amendment | Authorised source update; future rule evaluation/obligations change with effective date; history preserved. |
| Changed external obligation | Identify affected scopes, owner, review deadline and interim controls. Pinning is not permission to ignore effective obligations. |
| Security vulnerability or access revocation | Platform/identity update applies independently of business snapshot. |
| Compiler bug | Publish tested compiler release; identify affected decisions/snapshots, recompile and review impact without silently rewriting decisions. |

Migration rollback restores configuration for future actions only. Already sent orders, signatures or built work require explicit compensating actions; restoring an old snapshot does not undo real-world effects.

## 11. Analytics and guardrails against configuration chaos

Report rule usage by rule version, eligible decision count, project type/country, outcome, exception reason, reviewer, overdue follow-up and consequence. The denominator is eligible decisions, not every project. Thresholds/minimum samples are configurable and labelled proposed until approved. The analyser suggests review; it never automatically weakens a frequently bypassed rule.

Monitor active-project distance from templates, unpublished changes, outdated mandatory reviews and unresolved policy conflicts. Preserve common metric contracts even when project labels change. Conflicts should restrict only relevant releases, unless a reviewed dependency shows broader impact. Always retain access to incident reporting and protective actions.
