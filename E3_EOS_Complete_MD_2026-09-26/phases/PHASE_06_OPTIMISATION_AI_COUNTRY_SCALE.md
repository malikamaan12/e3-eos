# P06: Portfolio optimisation, advanced rules and AI assistance

**Version:** 1.0 | **Build phase, not event lifecycle stage**

**Dependencies:** P05 and sufficient validated data  
**Outcome:** Cross-project what-if analysis, exception analytics and opt-in AI improve decisions without acquiring approval authority.  
**Primary modules:** M03/M04/M10/M15/M17 advanced capabilities; optional signing and AI  
**Accountable participants:** Product owner, portfolio/resource planner, governance owner, data/AI engineer, security and local-country reviewers.

## 1. Phase boundary

P06 is optional for initial core rollout. Each advanced feature is independently tested and flagged; weak data quality keeps the feature disabled rather than generating confident-looking outputs.

All company thresholds, named approvers, country rules, report deadlines and project workflows remain configuration, not hard-coded defaults. Shared authority, policy, money, evidence and integration contracts apply. A phase cannot implement its own conflicting approval or cost-calculation engine.

## 2. Implementation backlog and acceptance

| Story ID | Work package | Developer implementation | Completion evidence |
|---|---|---|---|
| P06-ST01 | Rule and exception analytics | Measure eligible decisions, rule versions, reasons, repeat actors, review closure and context-specific bypass rate. | Thresholds/minimum samples editable; suggestions do not auto-weaken rules. |
| P06-ST02 | Portfolio what-if simulation | Model schedule shifts across crew skills, workshop capacity, transport and inventory buffers. | Scenarios are read-only snapshots; apply rechecks current data and obtains affected project authority. |
| P06-ST03 | Historical estimating and supplier intelligence | Use reconciled actuals and comparable project/currency/date context to suggest ranges and supplier lead times. | Suggestions disclose evidence age/sample, not presented as current offers or guaranteed future cost. |
| P06-ST04 | Optional EVM | Implement only for packages with measured progress method, baseline and cost matching. | Hours/scans do not independently earn value; missing denominator gives not applicable. |
| P06-ST05 | AI extraction and narrative drafting | Add opt-in Responses adapter, source-linked tender extraction, revision comparison and report narrative drafts. | Permission-filtered inputs, structured outputs, prompt-injection tests and human acceptance before domain writes. |
| P06-ST06 | Optional formal signing | Implement Docusign only with validated commercial/legal requirement and account entitlement. | Signed envelope/certificate mapped to exact version and current webhook evidence; ordinary click not mislabelled. |
| P06-ST07 | Country-scale configuration and cell proof | Validate additional entity/location overlays, language/currency/calendar, obligations and processing region. | No jurisdiction content marked verified without reviewer; cross-cell allocation limitations explicit. |
| P06-ST08 | Mandatory update campaign tooling | Add portfolio migration dashboards, affected-source review and version adoption monitoring. | Optional enhancements differ from security revocations and effective external obligations. |

## 3. Required screens and interactions

Rule analytics, scenario comparison/apply, historical estimate evidence, supplier performance, AI draft review, signing status and country/source migration console.

Every screen includes scoped loading/empty/error/permission/offline or stale-data states as relevant. Draft state and accepted state must be visibly different. Actions explain who can proceed and why a condition is unresolved. Client/internal separation is enforced by the API rather than hidden controls.

## 4. Data and migration work

No wholesale historical AI ingestion. Index only approved, minimised records with retrieval permissions and retention. New country cells use explicit data import and permitted aggregation.

Implement the phase's aggregate tables, indexes, constraints, row-scope tests, migration/backfill and import reconciliation defined in the shared data model. Mutable drafts use row versions; approved/posted records retain historical versions and correction records. No production schema push or database reset.

## 5. API surface and permissions

Base prefix: `/api/v1`. Implement and extend the versioned OpenAPI before accepting an endpoint. Critical payloads, concurrency, idempotency, error codes and current-authority checks are defined in the shared API contract.

| Endpoint | Permission |
|---|---|
| `POST /connectors` | `integration.manage` |
| `POST /connectors/{id}/test` | `integration.test` |
| `POST /connectors/{id}/sync` | `integration.sync` |
| `GET /connectors/{id}/health` | `integration.read` |
| `POST /webhooks/{provider}/{accountId}` | `integration.webhook` |
| `POST /integration-conflicts/{id}/resolve` | `integration.resolve` |
| `POST /portfolio/scenarios` | `scenario.create` |
| `POST /portfolio/scenarios/{id}/apply` | `scenario.apply` |
| `GET /portfolio/rule-analytics` | `governance.read` |
| `POST /projects/{projectId}/ai-drafts` | `ai.request` |
| `POST /projects/{projectId}/ai-drafts/{id}/accept` | `ai.review` |

The module also needs ordinary permitted read/draft-edit companions with complete JSON schemas. No generic draft PATCH can set `approved`, `paid`, `permit_valid` or `ready_to_open`. Release actions use dedicated commands.

## 6. Mandatory phase test cases

Run all prior-phase regression tests plus these initial cases. Results must link to actual test files, CI run, commit and reviewer; listing a case is not evidence of a pass.

| ID | Scenario | Expected outcome |
|---|---|---|
| AT-080 | Scenario favourable, then another project reserves resource | Apply rechecks actual availability; scenario does not act as a reservation. |
| AT-081 | Rule override rate exceeds proposed threshold | Flags contextual review with denominator/sample; does not auto-weaken policy. |
| AT-082 | Crew hours complete but deliverable incomplete | EVM does not earn value from time/scan alone. |
| AT-083 | Tender contains prompt injection instructions | AI treats as data; no tool execution, approval or cross-project disclosure. |
| AT-084 | External AI disallowed by classification | No request leaves approved boundary; manual workflow remains available. |
| AT-085 | AI generated requirement without valid source | Marked suggestion, rejected/quarantined until human source verification. |
| AT-086 | Second country/cell rollout | Jurisdiction rules and data processing reviewed; no implicit global replication or cross-cell double booking. |

## 7. Demonstration and UAT

Move one event in a scenario and show another project’s crew/asset conflict without altering either live schedule. Apply after approvals and recheck. Extract tender obligations with page references while refusing embedded instructions to execute actions.

Use labelled synthetic data until the relevant E3 owner authorises a controlled pilot. A stakeholder walks the journey and checks the actual API/source record, not only a screenshot. Capture feedback as versioned backlog changes.

## 8. Explicit exclusions

No autonomous approvals, generic all-data chatbot, cross-region replication by default, forced EVM on unsuitable work or automatic supplier ordering.

## 9. Developer handover for this phase

Deliver migrations, API schemas/generated client, UI flows, permission and concurrency tests, effective policy fixtures, audit/events, feature flags, operational metrics, failure runbook and rollout/rollback notes. Record new dependencies/licences and updated external capability evidence. Provide a short phase closure note linking story IDs to commits and acceptance results.

## 10. References

- [Product/module contract](../specs/01_PRODUCT_MODULES_AND_UX.md)
- [Selected technical architecture](../specs/02_TECH_ARCHITECTURE_AND_ADRS.md)
- [Data and invariants](../specs/03_DATA_MODEL_AND_INVARIANTS.md)
- [Configuration and authority](../specs/04_CONFIGURATION_APPROVALS_AND_EXCEPTIONS.md)
- [API/event contract](../specs/05_API_AND_EVENT_CONTRACTS.md)
- [Integration and offline contract](../specs/06_INTEGRATIONS_AND_OFFLINE.md)
- [Security and operations](../specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md)
- [Reporting/finance](../specs/08_REPORTING_FINANCE_AND_ANALYTICS.md)
- [Acceptance register](../specs/09_QA_ACCEPTANCE_AND_TRACEABILITY.md)
- [Decision and production gates](../specs/10_DECISIONS_RISKS_AND_GO_LIVE.md)
