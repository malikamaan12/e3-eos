# API and domain event contracts

**Version:** 1.0 | **API style:** REST, JSON, versioned OpenAPI 3.1 | **Base:** `/api/v1`

## 1. Scope of this contract

The operation inventory below specifies EOS-owned endpoints. It does not invent BookingQube, Metricool or accounting provider endpoints. Each phase must deliver request/response JSON Schema, permission tests, examples and generated client types for every implemented operation before acceptance. The included `contracts/CORE_COMMANDS.openapi.yaml` provides a machine-readable subset for high-consequence commands; it is not represented as a complete runnable backend or the full future OpenAPI implementation.

## 2. Universal HTTP behaviour

Use secure cookie sessions for browser audiences; documented service credentials for trusted integrations. Normal domain requests carry correlation ID and an authenticated organisation context. Server derives project scope from the resource. API keys cannot masquerade as a human approval.

All mutating create/action requests require `Idempotency-Key`; updates and actions on existing versioned objects additionally require `If-Match` with the row/version ETag. `If-Match` is transport concurrency, while `targetVersionId`/hash bind the business content. Neither replaces the other.

Idempotency namespace: organisation + actor/service + operation + target + key. Store request hash, processing state, response and created resource in PostgreSQL. Same key/same payload returns prior result; same key/different payload is `409 IDEMPOTENCY_CONFLICT`. Financial/external-effect identities remain retained according to transactional retention, not only a short Redis TTL. A timeout retry cannot spend or consume an exception twice.

Reads use stable cursor pagination, `limit` default 50/max 200 as engineering defaults, explicit filter allowlist, sorting and date basis. Exports are scoped asynchronous jobs and recheck access before download. Bulk operations return per-item results; no silent partial success.

Success envelope: `{data, meta:{requestId, recordVersion, policySnapshotId, dataAsOf}}` as applicable. Async operation returns `202` plus job/status reference. A PO release commits an authorised delivery intent; success does NOT mean supplier acknowledgement. Creation returns `201`, updates `200`, unauthorised identity `401`, forbidden action `403`, hidden out-of-scope object `404`, stale version `412`, missing concurrency precondition `428`, validation/policy issue `422`, busy/conflict `409`, rate limit `429`, unavailable safe release dependency `503`.

Use `application/problem+json` for errors with `type`, `title`, `status`, `detail`, `code`, `requestId` and permitted field/condition details. Do not reveal another client's records, confidential policy text or raw provider tokens in error descriptions.

```json
{
  "type": "urn:e3-eos:problem:approval-required",
  "title": "Additional authority is required",
  "status": 422,
  "code": "APPROVAL_REQUIRED",
  "requestId": "request-opaque-id",
  "conditions": [{"ruleId": "vendor.comparison.required", "state": "unmet"}],
  "permittedNextActions": ["request_exception", "attach_comparison"]
}
```

## 3. Operation inventory

Ordinary draft PATCH/GET-by-ID companions follow the same module ownership, version and permission rules. They must not expose release, payment or approval state as freely editable fields. The named action endpoints below are mandatory for consequential transitions.

| Initial phase | Method and relative path | Permission | Purpose |
|---|---|---|---|
| P00 | `GET /me` | `identity.read` | Read current identity, memberships and permitted audiences |
| P00 | `GET /my-work` | `work.read` | Scoped tasks, approval requests and notifications |
| P00 | `POST /invitations` | `membership.invite` | Invite a scoped user; never public self-sign-up |
| P00 | `POST /memberships/{id}/revoke` | `membership.revoke` | Revoke access, sessions/subscriptions and active delegation |
| P00 | `GET /audit-events` | `audit.read` | Permission-filtered audit search/export cursor |
| P00 | `GET /jobs/{id}` | `jobs.read` | Read job progress/result subject to original scope |
| P00 | `GET /events/stream` | `events.read` | SSE notification cursor, reauthorised per audience |
| P01 | `POST /projects` | `project.create` | Register idea/project using effective intake form |
| P01 | `GET /projects` | `project.read` | List/filter scoped portfolio |
| P01 | `GET /projects/{projectId}` | `project.read` | Read project and completeness |
| P01 | `PATCH /projects/{projectId}` | `project.edit` | Edit permitted draft properties with row version |
| P01 | `POST /projects/{projectId}/clone` | `project.clone` | Clone template/structure with historical proof reset |
| P01 | `POST /projects/{projectId}/roles` | `project.roles.manage` | Assign scoped role with authority boundary |
| P01 | `POST /projects/{projectId}/requirements` | `scope.edit` | Create source-linked obligation/requirement |
| P01 | `GET /projects/{projectId}/requirements` | `scope.read` | Read coverage, applicability and missing owners |
| P01 | `POST /projects/{projectId}/requirements/{id}/disposition` | `scope.disposition` | Authorised applicability/amendment/exception reference |
| P01 | `POST /projects/{projectId}/clarifications` | `scope.edit` | Create owned clarification with due date/source |
| P01 | `POST /projects/{projectId}/clarifications/{id}/respond` | `scope.edit` | Record response and affected scope review |
| P01 | `POST /projects/{projectId}/risks` | `risk.edit` | Create risk, owner and mitigation record |
| P01 | `POST /projects/{projectId}/qualification-decisions` | `project.qualify` | Pursue/pause/no-go with authority and reasoning |
| P01 | `POST /programmes` | `programme.manage` | Create parent programme |
| P01 | `POST /agreements/{id}/call-offs` | `commercial.calloff` | Allocate authorised parent scope/ceiling to child |
| P01 | `GET /templates` | `configuration.read` | Read permitted versioned templates |
| P01 | `POST /templates/{id}/versions` | `configuration.author` | Draft new template version |
| P01 | `POST /projects/{projectId}/policy-drafts` | `configuration.author` | Draft project delta or structural migration |
| P01 | `POST /projects/{projectId}/policy-drafts/{id}/validate` | `configuration.validate` | Compile/check; no activation or business side effect |
| P01 | `POST /projects/{projectId}/policy-drafts/{id}/impact` | `configuration.validate` | Queue affected-record and authority impact analysis |
| P01 | `POST /projects/{projectId}/policy-drafts/{id}/publish` | `configuration.publish` | Protected atomic snapshot activation |
| P01 | `GET /projects/{projectId}/policy` | `configuration.read` | Read effective policy with source provenance |
| P01 | `POST /projects/{projectId}/transitions` | `workflow.transition` | Execute permitted stage/work transition |
| P01 | `POST /projects/{projectId}/approval-requests` | `approval.request` | Create request targeting an exact version/hash |
| P01 | `GET /projects/{projectId}/approval-requests` | `approval.read` | Read scoped requests and decisions |
| P01 | `POST /projects/{projectId}/approval-requests/{id}/decisions` | `approval.decide` | Record current authorised human decision |
| P01 | `POST /projects/{projectId}/exceptions` | `exception.request` | Request bounded exception |
| P01 | `POST /projects/{projectId}/exceptions/{id}/authorise` | `exception.authorise` | Grant only under current exception authority |
| P01 | `POST /projects/{projectId}/exceptions/{id}/revoke` | `exception.revoke` | Stop future use; retain historical uses/review |
| P01 | `POST /projects/{projectId}/exceptions/{id}/reviews` | `exception.review` | Record review/remediation/closure disposition |
| P01 | `POST /admin/authority-policies/{id}/versions` | `authority.author` | Draft protected governance change |
| P01 | `POST /admin/authority-policies/{id}/publish` | `authority.publish` | Publish protected authority version with anti-self-downgrade check |
| P01/P02 | `POST /projects/{projectId}/work-packages` | `work.edit` | Create linked delivery package |
| P01/P02 | `GET /projects/{projectId}/work-packages` | `work.read` | List packages with coverage and readiness |
| P01/P02 | `POST /projects/{projectId}/tasks` | `work.edit` | Create tasks/checklists from schema or template |
| P01/P02 | `PATCH /projects/{projectId}/tasks/{id}` | `work.edit` | Edit current task properties under version check |
| P01/P02 | `POST /projects/{projectId}/tasks/{id}/complete` | `work.complete` | Record completion with evidence; not automatic acceptance |
| P01/P02 | `POST /projects/{projectId}/work-packages/{id}/acceptances` | `work.accept` | Record designated output acceptance/rejection |
| P01/P02 | `POST /projects/{projectId}/dependencies` | `schedule.edit` | Validate and add dependency edge |
| P01/P02 | `POST /projects/{projectId}/baselines` | `schedule.baseline` | Create immutable authorised baseline version |
| P01/P02 | `POST /projects/{projectId}/forecast-changes` | `schedule.edit` | Propose forecast changes; retain fixed deadlines |
| P01/P02 | `GET /projects/{projectId}/timeline` | `schedule.read` | Return baseline/forecast/actual and resource impacts |
| P01/P02 | `POST /projects/{projectId}/documents/upload-intents` | `document.upload` | Grant bounded quarantine upload |
| P01/P02 | `POST /projects/{projectId}/documents/{id}/versions` | `document.version` | Register uploaded immutable version for scan/verification |
| P01/P02 | `GET /projects/{projectId}/documents` | `document.read` | List metadata under document visibility grants |
| P01/P02 | `POST /projects/{projectId}/documents/{id}/access` | `document.read` | Issue short-lived permitted read URL |
| P01/P02 | `POST /projects/{projectId}/designs` | `design.edit` | Create design package/moodboard |
| P01/P02 | `POST /projects/{projectId}/designs/{id}/annotations` | `design.review` | Annotate exact design version |
| P01/P02 | `POST /projects/{projectId}/designs/{id}/release` | `design.release` | Release approved version for stated purpose |
| P01/P02 | `POST /projects/{projectId}/comments` | `collaboration.comment` | Create scoped thread comment/mention |
| P02 | `POST /projects/{projectId}/estimates` | `commercial.estimate` | Create scenario/BOQ draft |
| P02 | `POST /projects/{projectId}/estimates/{id}/lines` | `commercial.estimate` | Add typed quantities, units and cost components |
| P02 | `POST /projects/{projectId}/estimates/{id}/calculate` | `commercial.estimate` | Deterministic priced calculation with assumptions |
| P02 | `POST /projects/{projectId}/proposals` | `commercial.propose` | Generate sell-side version without buying-rate leakage |
| P02 | `POST /projects/{projectId}/contracts` | `commercial.contract` | Register contract or internally authorised investment basis |
| P02 | `POST /projects/{projectId}/variations` | `change.request` | Create change request with scope/cost/time impact |
| P02 | `POST /projects/{projectId}/variations/{id}/apply` | `change.apply` | Apply approved change to baseline/authority scope |
| P02 | `POST /projects/{projectId}/publications` | `portal.publish` | Publish permitted exact-version projection |
| P02 | `POST /projects/{projectId}/publications/{id}/withdraw` | `portal.publish` | Revoke future publication access |
| P02 | `GET /portal/projects` | `portal.read` | List only client-granted projects |
| P02 | `GET /portal/projects/{projectId}` | `portal.read` | Return published client projection |
| P02 | `GET /portal/projects/{projectId}/publications/{id}` | `portal.read` | Return permitted published item |
| P02 | `POST /portal/projects/{projectId}/decisions` | `portal.decide` | Client decision on exact published version |
| P02 | `POST /portal/projects/{projectId}/comments` | `portal.comment` | Client-visible comment, not approval |
| P03 | `POST /vendors` | `vendor.edit` | Create draft vendor or independent cash/freelance supplier profile |
| P03 | `POST /vendors/{id}/verification` | `vendor.verify` | Record scoped field/document verification |
| P03 | `POST /vendors/{id}/bank-changes` | `vendor.bank.request` | Request protected bank detail change |
| P03 | `POST /projects/{projectId}/rfqs` | `procurement.source` | Create source-linked RFQ |
| P03 | `POST /projects/{projectId}/rfqs/{id}/issue` | `procurement.issue` | Issue controlled request to named vendors |
| P03 | `POST /projects/{projectId}/offers` | `procurement.source` | Record versioned supplier offer |
| P03 | `POST /projects/{projectId}/comparisons` | `procurement.evaluate` | Create comparable technical/commercial evaluation |
| P03 | `POST /projects/{projectId}/purchase-requests` | `procurement.request` | Create requisition with authority/budget links |
| P03 | `POST /projects/{projectId}/purchase-orders` | `procurement.order` | Draft PO/subcontract from authorised scope |
| P03 | `POST /projects/{projectId}/purchase-orders/{id}/release` | `procurement.release` | Atomically authorise commitment and enqueue exact-version delivery |
| P03 | `POST /projects/{projectId}/purchase-orders/{id}/amendments` | `procurement.amend` | Version scope/price/date change without overwriting issued order |
| P03 | `POST /projects/{projectId}/purchase-orders/{id}/acknowledgements` | `procurement.track` | Record supplier acknowledgement/discrepancy |
| P03 | `POST /projects/{projectId}/receipts` | `procurement.receive` | Record quantity/condition and accepted/rejected portions |
| P03 | `POST /projects/{projectId}/production-orders` | `production.plan` | Create fabrication/workshop job linked to drawing/materials |
| P03 | `POST /projects/{projectId}/production-orders/{id}/material-issues` | `production.issue` | Issue/reconcile actual materials |
| P03 | `POST /projects/{projectId}/production-orders/{id}/checkpoints` | `production.update` | Progress, inspection and rework record |
| P03 | `POST /contributor-grants` | `contributor.invite` | Issue expiring supplier response/upload token |
| P03 | `POST /contribute/{token}/responses` | `contributor.respond` | Restricted response, quarantined and reviewed |
| P03/P04 | `GET /resources/availability` | `resource.read` | Current serviceable inventory and overlaps by scope/window |
| P03/P04 | `POST /projects/{projectId}/reservations` | `resource.request` | Create tentative demand or capacity-consuming hold |
| P03/P04 | `POST /projects/{projectId}/reservations/{id}/confirm` | `resource.confirm` | Fresh atomic availability check and confirmation |
| P03/P04 | `POST /projects/{projectId}/reservations/{id}/release` | `resource.release` | Release future claim and record current custody separately |
| P03/P04 | `POST /projects/{projectId}/asset-movements` | `inventory.move` | Scan dispatch/receipt/transfer with custody evidence |
| P03/P04 | `POST /resources/{id}/maintenance-holds` | `inventory.maintain` | Quarantine and block future availability |
| P03/P04 | `POST /projects/{projectId}/return-inspections` | `inventory.inspect` | Record condition and serviceability release decision |
| P03/P04 | `POST /projects/{projectId}/subrental-requests` | `resource.request` | Raise shortage for authorised sourcing, no automatic purchase |
| P03/P04 | `POST /projects/{projectId}/crew-assignments` | `crew.assign` | Assign qualified crew with calendar/rule checks |
| P03/P04 | `POST /projects/{projectId}/shifts` | `crew.plan` | Create zoned role-based shift plan |
| P03/P04 | `POST /projects/{projectId}/attendance` | `crew.capture` | Record actual attendance with source/conflict status |
| P03/P04 | `POST /projects/{projectId}/trips` | `logistics.plan` | Create vehicle/load/access/delivery plan |
| P03/P04 | `POST /projects/{projectId}/delivery-slots` | `logistics.plan` | Reserve available venue loading slot |
| P04 | `POST /projects/{projectId}/obligations` | `compliance.manage` | Create reviewed scope-specific requirement |
| P04 | `POST /projects/{projectId}/permits` | `compliance.record` | Record actual authority/source/dates/evidence |
| P04 | `POST /projects/{projectId}/inspections` | `quality.inspect` | Inspection result distinct from task completion |
| P04 | `POST /projects/{projectId}/snags` | `quality.inspect` | Create corrective item with affected scope |
| P04 | `GET /projects/{projectId}/readiness` | `readiness.read` | Return critical blockers and conditions by location/package |
| P04 | `POST /projects/{projectId}/opening-releases` | `readiness.release` | Record current scoped ready-to-open decision |
| P04 | `POST /projects/{projectId}/protective-actions` | `safety.protect` | Record stop/evacuate/isolate action without routine-release delay |
| P04 | `POST /projects/{projectId}/run-sheets` | `operations.plan` | Publish controlled live sequence |
| P04 | `POST /projects/{projectId}/incidents` | `incident.capture` | Capture incident; sensitive fields separately protected |
| P04 | `POST /projects/{projectId}/handover-records` | `operations.handover` | Record delivery/venue/shift acceptance |
| P04 | `GET /field/projects/{projectId}/bundle` | `field.read` | Permitted signed/versioned assigned-work manifest |
| P04 | `POST /field/sync` | `field.sync` | Apply offline operations independently with per-item outcomes |
| P04 | `GET /field/sync/{batchId}` | `field.sync` | Read accepted/conflict/rejected operations |
| P05 | `POST /projects/{projectId}/cost-imports` | `finance.import` | Quarantine/import explicit financial source batch |
| P05 | `POST /projects/{projectId}/accruals` | `finance.accrue` | Record period-correct accrued cost with matching |
| P05 | `POST /projects/{projectId}/cost-allocations` | `finance.allocate` | Allocate source amounts without duplication |
| P05 | `POST /projects/{projectId}/billing-requests` | `finance.bill` | Request invoice based on contract milestone |
| P05 | `POST /projects/{projectId}/reconciliations` | `finance.reconcile` | Match ledger/PO/receipt/accrual facts and report differences |
| P05 | `GET /projects/{projectId}/financial-position` | `finance.read` | Current budget/actual/accrual/commitment/forecast/cash by basis |
| P05 | `POST /projects/{projectId}/metric-observations` | `metrics.record` | Import measured KPI with definition/provenance |
| P05 | `POST /projects/{projectId}/reports` | `report.create` | Create versioned client/internal report job |
| P05 | `POST /projects/{projectId}/reports/{id}/publish` | `report.publish` | Freeze approved report and publish allowed projection |
| P05 | `POST /projects/{projectId}/closure-decisions` | `project.close` | Close specified dimension, not unrelated settlement |
| P05 | `POST /projects/{projectId}/lessons` | `learning.record` | Capture reviewed lesson/evaluation for reuse |
| P05 | `GET /portfolio/metrics` | `portfolio.read` | Canonical permitted aggregate with definition/freshness |
| P05/P06 | `POST /connectors` | `integration.manage` | Configure secret reference and capability manifest |
| P05/P06 | `POST /connectors/{id}/test` | `integration.test` | Run sandbox/read-only capability validation |
| P05/P06 | `POST /connectors/{id}/sync` | `integration.sync` | Queue bounded sync/reconciliation |
| P05/P06 | `GET /connectors/{id}/health` | `integration.read` | Freshness, lag, last success and unresolved conflicts |
| P05/P06 | `POST /webhooks/{provider}/{accountId}` | `integration.webhook` | Verify provider-specific signature and persist inbox |
| P05/P06 | `POST /integration-conflicts/{id}/resolve` | `integration.resolve` | Apply reviewed reconciliation action |
| P05/P06 | `POST /portfolio/scenarios` | `scenario.create` | Queue resource/budget what-if without live changes |
| P05/P06 | `POST /portfolio/scenarios/{id}/apply` | `scenario.apply` | Revalidate current versions/availability and apply authorised scope |
| P05/P06 | `GET /portfolio/rule-analytics` | `governance.read` | Eligible-use override rates and follow-up outcomes |
| P05/P06 | `POST /projects/{projectId}/ai-drafts` | `ai.request` | Opt-in extraction/report draft with permission-filtered sources |
| P05/P06 | `POST /projects/{projectId}/ai-drafts/{id}/accept` | `ai.review` | Human accepts selected draft records through ordinary validators |

## 4. Critical payload contracts

All objects reject unknown privileged fields. IDs are UUIDs in actual requests. The examples in prose may use descriptive placeholders; production schema validates real IDs.

| Contract | Required fields | Important validation |
|---|---|---|
| ProjectCreate | intakeMode defaults to draft; title, description, originCode, ownerId and other intake fields as required by the effective schema | Technical schema permits an incomplete draft; server supplies IDs/code and an honest display fallback, not invented business facts. Activation applies configured requirements. |
| PolicyPublish | expectedActiveSnapshotId, draftVersionId, impactReportId, authorityDecisionIds | Impact report matches candidate hash/current dependencies; no self-downgrade; atomic activation. |
| ApprovalDecision | targetVersionId, targetHash, outcome, acknowledgedConditions, comment where required | Current assignment and identity; significant fields; distinct approvers; allowed outcome. |
| ExceptionAuthorise | targetVersionId, targetHash, authorityDecisionIds, approvedScope, validFrom, validUntil, maxUses, reviewPolicy | approvedScope includes target/rule/action limits; referenced request carries authorityBasisId. Bounds fit approver limits; review cannot substitute for required preapproval. |
| PurchaseOrderRelease | targetVersionId, targetHash, authorityBasisId, approvalDecisionIds, optional exceptionId | Fresh authority, amount/currency/supplier and commitment checks in one transaction. |
| ReservationConfirm | expectedResourceVersion, planningStart, planningEnd, quantity, optional authorityBasisId | Full operational window; usable inventory; tentative request is not confirmation. |
| DesignRelease | versionId, targetHash, purpose, affectedPackageIds, approvalDecisionIds | Correct issue purpose and approved immutable version. |
| OpeningRelease | scopeIds, evaluatedReadinessVersion, evidenceVersionIds, approvalDecisionIds, validUntil | Recheck actual critical conditions; no global ready status from task percent. |
| ClientDecision | publicationId, publicationVersion, targetHash, purpose, decision, comment | Client granted exact scope/action; no cost-side data leaked; publication still current. |
| OfflineBatch | batchId, deviceId, operations[] | Each operation includes clientOperationId, capturedAt, baseVersion, type, payload and source-manifest version. |
| ReportPublish | reportVersionId, sourceSnapshotId, targetHash, audience, approvalDecisionIds | Audience projection, reconciled/provisional labels and current publication authority. |
| FinancialImport | connectorAccountId or manualSourceId, sourcePeriod, currencyBasis, fileVersionId, mappingVersion, reviewId | Source uniqueness, validation/dry-run before posting, opening-total reconciliation. |
| CloseDimension | dimension, evidenceManifestId, decisionIds, disclosedOpenItems | Dimension is operational/acceptance/reporting/financial_review/settlement; no false all-closed default. |

Example released intent, conforming to the core CommandResult envelope. Linked PO version and exception-use records are retrieved through the authorised release record:

```json
{
  "data": {
    "id": "d3a7f1e2-6a19-4d8d-b792-4eeb9a7fa880",
    "status": "execution_pending",
    "recordVersion": 7,
    "externalDeliveryStatus": "queued"
  },
  "meta": {"requestId": "request-20260907-001", "policySnapshotId": "b2c43a61-4790-452e-93ef-98de91d0ccf1"}
}
```

## 5. Command authorisation pipeline

Authenticate -> derive verified scope/audience -> authorise object/action -> validate schema -> verify idempotency -> load/lock current versions -> load effective policy/current facts -> evaluate required authority -> consume bounded exception if applicable -> apply domain transaction + audit + outbox -> commit -> queue side effects -> return record/status.

Order matters: do not reveal existence via idempotency lookup before access checks; do not consume an exception outside the domain transaction; do not call a supplier before commit. On recovery, query the durable command receipt before retrying. Permission/rule checks apply equally to import, automation, admin UI, mobile sync and ordinary API callers.

## 6. Domain event envelope and registry

```json
{
  "eventId": "opaque-event-id",
  "type": "purchase_order.released.v1",
  "schemaVersion": 1,
  "organisationId": "opaque-org-id",
  "projectId": "opaque-project-id",
  "aggregateType": "purchase_order",
  "aggregateId": "opaque-po-id",
  "aggregateVersion": 7,
  "occurredAt": "2026-09-07T10:00:00Z",
  "actorId": "opaque-user-id",
  "correlationId": "opaque-request-id",
  "causationId": "opaque-command-id",
  "policySnapshotId": "opaque-policy-id",
  "data": {"versionId": "opaque-po-version-id", "releaseId": "opaque-release-id"}
}
```

| Event family | Core events | Consumers |
|---|---|---|
| Project/work | project.created, requirement.changed, task.completed, output.accepted, baseline.published | Template instantiation, scope coverage, reporting and notifications. |
| Policy | policy.published, policy.conflict_opened, authority.changed | Cache invalidation, affected-release review and audit. |
| Approval/exception | approval.requested, approval.decided, exception.authorised, exception.used, exception.expired, exception.review_closed | Inbox, release eligibility, escalations and governance reporting. |
| Documents | document.scan_completed, design.released, publication.created, publication.withdrawn | Preview generation, affected-work notification, client access projection. |
| Commercial | budget.authorised, variation.applied, purchase_order.released, receipt.accepted | Commitments, supplier delivery, matching, scope forecast. |
| Resources | reservation.confirmed, asset.dispatched, return.inspected, qualification.changed | Availability, logistics, relevant readiness and projected cost. |
| Operations | incident.recorded, protective_action.recorded, opening.released, handover.accepted | Command centre, corrective action and evidence reporting. |
| Finance | cost.posted, accrual.reversed, invoice.synced, payment.synced, reconciliation.completed | Financial projections, billing visibility and settlement. |
| Closure | report.published, project.dimension_closed, lesson.accepted | Client notification, archive review and reusable knowledge. |

Actual event types include `.v1`. Persist aggregate version and causation to handle reordering and prevent automation loops. No global event order is assumed. Consumers deduplicate by event ID and ignore/quarantine stale projection updates; late accounting corrections append new effective facts. Domain events contain IDs/minimal facts, not raw payroll, medical narratives or bank details.

## 7. Automation contract

Automation definitions identify trigger, applicable scope, condition, permitted action, service authority, deduplication key, retry policy, owner and expiry. Safe actions include task generation, reminders, draft creation and job scheduling. External PO issue, paid messages, report publication and approvals require explicit authority evidence and cannot be granted implicitly to the automation engine.

Guard against recursion with causation depth and visited-action limits. Record each execution and its effective policy. A disabled automation stops future runs; queued irreversible operations must be cancelled or reviewed explicitly rather than deleted from audit.

## 8. API test obligations

Every endpoint needs schema validation, object-scope denial, field-level projection checks, malformed-ID handling, replay behaviour, stale-version behaviour and audit verification. Critical commands additionally need concurrent execution tests, exception expiry between check/commit, current authority revocation, target-hash tampering and remote-delivery ambiguity tests. All date/time and amount fields require timezone/currency fixtures.
