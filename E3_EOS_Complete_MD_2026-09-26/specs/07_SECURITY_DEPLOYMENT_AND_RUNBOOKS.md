# Security, infrastructure, observability and operational runbooks

**Version:** 1.0 | **Baseline:** security controls begin in P00 and are tested in every phase, not added at the end

## 1. Threat model

Protect against cross-client/project data leakage, malicious supplier uploads, privileged self-authorisation, stale permissions, forged/duplicate webhooks, duplicate orders, unsafe offline replay, stolen devices, unexpected AI disclosure, changed bank details, credentials in logs and deployment/migration error.

Separate E3 application Super Admin, business approver, security operator, database migration operator and cloud administrator. A database/cloud superuser can technically bypass application controls; that power must be restricted, monitored and reconciled through infrastructure governance. Do not describe application audit as mathematically untamperable against every infrastructure administrator.

## 2. Identity and access

Invitation-only accounts; verified email; no phone-number passwords; no public account-creation pathway hidden behind a front-end-only check. Staff Google OAuth, when enabled, must still require an approved membership. Better Auth provides selected session/MFA primitives (S06-S10); EOS implements project/audience/authority controls.

Store sessions server-side, use secure HttpOnly host-only cookies, SameSite appropriate to tested callbacks, CSRF/origin checks, rotation, idle/absolute expiry and explicit revocation. Do not rely on long-lived client JWT role claims or cookie permission caches for consequential actions. Current membership and authority epoch are checked when a command executes (S21-S22).

Privileged decision/publication/recovery uses recent server-verified reauthentication/MFA. Parameter values are configurable security policy subject to protected publication. Audit sign-in, MFA recovery, membership/role changes, impersonation attempts and sensitive exports. Support optional passkeys after device compatibility testing; do not use email OTP alone as the strongest release control.

Project access: organisation membership + project grant + action permission + attributes (entity, location, role, amount, audience, record classification). “Client contact” does not imply “client approver”. Temporary delegates have valid dates, purpose, limits and no greater authority than permitted by the original policy. Disabled accounts immediately lose online access and new approval capability.

Recovery requires a documented, witnessed route with alerting and review. No universal backdoor key. Super Admin cannot unloggedly impersonate a user; any support impersonation must be explicitly enabled, time-bound, read-only by default, visibly marked and unable to issue approvals as the impersonated person.

## 3. Permission baseline

| Role family | Default domain scope | Explicit exclusions |
|---|---|---|
| Platform Super Admin | Configuration management, support, protected-change requests | Not automatically commercial/HSE authority; no secret disclosure or raw client impersonation. |
| Governance owner | Publish authority policies and designate accountable business roles | Cannot fabricate external evidence; own pending transactions receive anti-self-downgrade review. |
| PM/package lead | Assigned project planning, scope, coordination, drafts and release requests | No automatic payroll/bank access or unlimited financial release. |
| Finance | Authorised costing, matching, ledger imports, billing and financial reviews | Cannot alter inspection results or imply client design acceptance. |
| Procurement | Suppliers, RFQs, PR/PO preparation and authorised issue | Buying permissions do not automatically approve payments or bank changes. |
| Design/production | Versioned design, workshop work and assigned evidence | Release purpose and quality acceptance require designated authority. |
| HSE/quality | Assigned inspections, obligation verification, protective actions | No unlimited financial approval; no false permit validity. |
| Crew/field | Assigned operational data and observation capture | No margin, bank, broad HR or unrelated project browsing. |
| Client viewer/approver | Published project items and specifically delegated decisions | No internal APIs, vendor cost, private notes or other clients. |
| Supplier contributor | Token-scoped response or upload | No arbitrary document download, user search or whole-project access. |
| Service account | Named connector/job actions in declared scopes | Cannot count as a distinct human second approver. |

Default grants are editable through protected authority processes. Deny by default for unassigned capabilities. Enforce the same boundaries on search, SSE, reports, bulk exports, job status, file access and generated documents.

## 4. Files, privacy and records

Upload intent includes allowed MIME types, declared size, purpose, scope and short expiry. Receive in quarantine, verify actual type/size/hash, run malware scan and safe parsing, then publish scan outcome. Zip bombs, active HTML, macros and malicious SVG are rejected or sanitised according to type policy. Never execute uploaded macros or template expressions.

Object names contain opaque IDs, not client names or identity numbers. Buckets are private; signed URLs are short-lived and created only after access checks. Highly sensitive downloads can use an authorised streaming proxy instead. External references are not proof of file possession or lasting retention. Approved native Drive documents are exported/copied into a controlled version where legally permitted.

Define classifications: public-approved, internal, client-confidential, commercial-sensitive, personnel-sensitive and restricted-incident. Assign retention purpose, owner, deletion/hold policy and residency to each category. Legal hold prevents automatic disposal only for in-scope records. Personal attributes in comments/attachments must not leak into universal audit payloads.

Audit events record actor/action/target/version/reason/time/correlation without unnecessary payload copies. Compute event digests and signed periodic manifests; archive manifests and appropriate logs in a separately permissioned, retention-controlled store. Application accounts cannot mutate accepted audit entries. Detect tampering through external manifests; retain correction events. Retention locking must be approved before activation because immutable storage can conflict with disposal needs.

## 5. Environments and infrastructure

Separate cloud projects for dev, staging and production with explicit region labels, service accounts and data classification. No production database access from preview deployments. Local Compose: PostgreSQL 17, Redis, storage emulator and local mail sink; synthetic fixtures only.

Terraform defines network, Cloud Run services, Cloud SQL, Memorystore, private buckets, worker group, secrets, logging/alerts, DNS/TLS and backup location. Secret Manager holds credentials. GitHub Actions deploys through federated workload identity and protected environment approval; no cloud keys in source/CI variables unless an approved short-lived mechanism requires them.

Database private access, TLS in transit, encryption at rest and narrowly scoped service identities are required. Application DB role cannot migrate schema or disable RLS. Worker role has only the modules needed. Outbound access is constrained for file fetch, AI and webhooks. Provider OAuth redirect URIs and public ingress routes are explicitly allowlisted.

API/worker concurrency and DB pool totals are configured as one capacity budget. Redis queues use a tested no-eviction configuration and monitored memory; keep durable business intent in PostgreSQL. Background workers use graceful shutdown, job leases and safe retry. Heavy report/virus-scan processes run with resource/time limits and restricted egress.

## 6. Release pipeline and gates

Branch -> lint/typecheck/unit -> contract/schema check -> real DB integration/concurrency -> browser/RTL/accessibility -> dependency/container/secret scan -> build signed/digested image -> staging migration -> smoke/UAT -> authorised production migration -> rollout -> post-release reconciliation/monitoring.

Every feature includes permission tests, schema, server logic, UI states, audit/event records, metrics, migrations, fixtures and rollback considerations. No feature is complete because screenshots look correct. Keep a machine-readable feature-flag register and block navigation to unimplemented production modules.

Use expand/backfill/contract migrations. Failed migration stops rollout. A code rollback must remain compatible with the current expanded schema. Do not roll back production financial facts with a database reset. External effects use controlled compensating actions.

## 7. Service targets and alerts

Proposed initial targets: 99.9% monthly availability for the core online app; RPO 15 minutes and RTO 4 hours for the tested database/application recovery scenarios. These are design/acceptance targets, not achieved SLAs. Measure them in P07 and record exclusions. Provider API uptime is separately reported.

A region-wide outage needs an approved alternate-region recovery plan and data-transfer permission; same-region HA does not prove regional disaster recovery. Without an approved alternate region, disclose this residual outage risk and obtain explicit acceptance before live dependency. Do not silently copy Qatar data abroad for convenience. Backup geography must be explicitly set (S18).

Alert on authentication anomalies, critical incident notification failure, delayed outbox, old connector cursor, queue backlog, failed scans, database lock/connection saturation, release failures, missing audit manifests, stale authority cache and overdue high-risk exception follow-up. Non-sensitive metrics use project/entity identifiers, not personnel names.

## 8. Operational runbooks

| Runbook | Immediate action | Recovery and evidence |
|---|---|---|
| RB01 Database/API outage | Show degraded state; stop unsafe consequential writes; keep permitted local capture | Restore/fail over under approved process; replay outbox; reconcile intents and totals; document RPO/RTO. |
| RB02 Queue/Redis outage | Persist domain intents; display delayed notification/integration | Recover queue; re-enqueue incomplete durable intents; deduplicate consumer effects; compare dispatch log. |
| RB03 Ambiguous PO/provider timeout | Do not resend blindly; mark outcome unknown | Query provider or obtain supplier confirmation; bind external ID; only approved replay/compensation. |
| RB04 Credential compromise | Revoke token/sessions and pause affected connector | Rotate secret, reauthorise least scopes, inspect access/exfiltration, reconcile changes and notify owners. |
| RB05 Duplicate/out-of-order webhook | Persist/dedupe without repeating business effects | Fetch authoritative record, validate version, record reversal/conflict and test replay. |
| RB06 Lost/offline field device | Revoke future sessions; identify cached data exposure | Purge on reconnect where possible, assess local storage loss, recover queued facts through supervisor review. |
| RB07 Wrong policy published | Identify affected scope; suspend relevant future releases | Restore reviewed snapshot/compile fix; assess executed actions separately; do not erase decisions. |
| RB08 Missing/failed safety evidence | Keep affected activity unreleased; allow protective action and incident capture | Obtain actual verification, resolve scope/dependency and record authorised reopening. |
| RB09 Financial import mismatch | Quarantine batch; keep last reconciled position | Validate source mapping, duplicates, tax/currency and allocations; reverse erroneous postings visibly. |
| RB10 Malicious file or AI prompt injection | Quarantine content/job and block external execution | Preserve safe forensic metadata, verify no cross-project retrieval, purge unauthorised outputs and retest. |
| RB11 Leaked publication link | Withdraw grant/publication and invalidate future URL issue | Record exposure, identify access, communicate under approved process; do not claim downloaded copies recalled. |
| RB12 Failed deployment/migration | Halt rollout and keep prior compatible application | Follow expand/contract rollback, restore only under data-owner authority, reconcile domain/external effects. |

Each implemented runbook needs named on-call roles, exact cloud commands stored securely, escalation contacts, tested procedure and evidence. Do not embed real passwords or private personal phone numbers in public developer documentation.
