# Integration decisions, adapter contracts and offline operation

**Version:** 1.0 | **Principle:** one authoritative owner per fact; graceful degradation without invented confirmation

## 1. Provider decisions and evidence status

| Integration | Decision / phase | Authority and direction | Verification required |
|---|---|---|---|
| E3 Rentals | Reuse audited asset references; migrate selected inventory authority into EOS in P03 | Before cutover: existing verified system owns reservations. After cutover: EOS owns the migrated pool and rentals requests allocations through EOS. Never two independent writers. | Actual repository/API/database, existing stock conditions, active bookings, credentials and access boundaries. |
| Existing procurement records | Map and import into EOS P03 | EOS owns new authorised PR/PO workflow after reconciled cutover. Preserve legacy references and open commitments. | Current system schema, original approval evidence, outstanding receipts/invoices and named owner. |
| Accounting | Provider-neutral adapter and controlled import/export P05; bind to E3's actual ledger | EOS owns management budget, commitments, acceptance and billing request. Ledger owns posted invoice, tax, payment and statutory entries. | Product/account not confirmed; owner, plan, API docs, sandbox and source ID semantics are required. Do not arbitrarily install a new ERP. |
| HR/payroll | Controlled roster/qualification imports and approved attendance export P04/P05 | EOS owns event assignments/captured attendance. Actual HR source owns employment/credential master and payroll decisions where used. | Product unconfirmed; qualification revocations, privacy, payroll import format and reconciliation. |
| BookingQube | Read-only event/attendance/sales adapter in P05, conditional on verified contract | Ticketing/entry source, not EOS ticket issuing. Import only necessary aggregates or pseudonymous dedupe IDs. | Public integration page exists (S24), but endpoints, auth, webhooks, refunds, pagination and account entitlement are NOT verified. |
| Metricool | Read-only marketing metrics adapter P05 | Metricool owns retrieved network observations; EOS owns event/campaign mapping and report definitions. | Token via X-Mc-Auth; Advanced/Custom API entitlement and account docs (S25-S26). No endpoint guessed from browser traffic. |
| Gmail API | Selected initial notification/invitation sender, P01 | EOS outbox owns send intent; provider owns delivery acceptance. Email is not approval or guaranteed recipient reading. | Approved sending identity, OAuth scope, quotas, consent, deliverability and data-processing review. S30. |
| Google Calendar API v3 | Optional milestone/assignment projection P05 | EOS remains master for project schedule. Provider changes become change proposals, not silent baseline edits. | OAuth client, permitted calendar, scopes, renewal and sync-token handling. S27-S28. |
| Google Drive API v3 | Optional explicit import/export/reference P05 | EOS owns accepted evidence versions; Drive may remain collaborative working-file source. Freeze approved export/copy with provenance. | File permissions, native document export format, revision capability and retention. S29. |
| Docusign eSignature REST + Connect | Chosen optional formal signing adapter P06; not required for native client acceptance | Provider owns envelope/certificate evidence; EOS binds it to exact target and purpose. | Licence, jurisdiction/contract suitability, consent, sandbox, webhook validation and envelope lifecycle. S31-S32. |
| OpenAI Responses API | Opt-in assistive adapter P06 | AI creates proposals/extractions only. Humans/ordinary EOS policies own business decisions. | Approved model/version, data classification, retention, region, account limits and evaluation. S33-S34. |
| Rentman | Not part of initial architecture; optional future adapter only | Use only if E3 explicitly selects it as the inventory authority for a defined scope. | Subscription and access not established. Public API/webhook capability does not prove transactional reservation semantics. S35. |
| Government services | No launch dependency; controlled manual evidence record | Actual external authority remains authoritative. | Verify service identity, integration access, legal effect and country-specific process separately. No assumed Tawtheeq/Tasdeeq integration. |
| Canva/Figma/CAD | Files, preview media and vetted links first | Design authorship external; EOS tracks approval/release version. | Explicitly commissioned API editing/export capabilities only; no arbitrary code execution or embedded editor requirement. |

The APIs connected to this chat are not production credentials for EOS. Developer must register EOS-owned clients/secrets and consent flows; do not assume a ChatGPT connector grants deployable API access.

## 2. Adapter shape and capability manifest

```typescript
interface AdapterCapabilities {
  provider: string;
  contractVersion: string;
  canRead: string[];
  canWrite: string[];
  webhookTypes: string[];
  idempotencyMode: 'provider-key' | 'lookup-before-retry' | 'manual-ambiguity-review';
  paginationMode: 'cursor' | 'page' | 'none';
  freshnessPolicyId: string;
  verificationStatus: 'unverified' | 'sandbox_verified' | 'production_verified';
}
interface ExternalRecordEnvelope<T> {
  accountId: string;
  recordType: string;
  sourceId: string;
  sourceVersion?: string;
  sourceUpdatedAt?: string;
  fetchedAt: string;
  payloadHash: string;
  data: T;
}
```

Implement provider clients through ports: listChanges(cursor), fetchRecord(identity), verifyWebhook(rawBody,headers), mapToCanonical(record), deliverCommand(authorisedIntent), reconcile(identity). Return typed retryable/permanent/ambiguous errors. Missing capability is a truthful `unsupported`, not a mock success.

Before activation, save `PROVIDER_CAPABILITY_<name>.md` with actual endpoint/method/auth, scopes, sample sanitised response, source IDs, timezone/currency interpretation, quotas, timeout/retry behaviour, signature rules, deletion/reversal handling and test evidence. Secrets only in Secret Manager; application records reference secret versions.

## 3. One owner per fact

| Fact | Authoritative source | EOS representation |
|---|---|---|
| Event deliverable accepted | EOS designated acceptance record | Primary business record. |
| Invoice posted/tax accepted | Selected accounting ledger | Timestamped source mirror, not manually editable truth. |
| Payment collected | Ledger/bank-confirmed source chosen by Finance | Reconciled mirror; not inferred from invoice issue or card checkout intent. |
| Equipment available | Defined inventory authority for that pool | Current query/confirmed booking, otherwise tentative demand. |
| Worker actually attended | Captured evidence plus reviewed adjustment | Retain observation even if roster was later changed. |
| Worker is qualified | Verified credential source/current revocation facts | Validity/freshness controlled view for future assignment/release. |
| Visitor entry | Ticketing/entry source | Pseudonymous/aggregate metric observation with definition. |
| Marketing reach | Network/Metricool observation | Source-specific estimate; not automatically unique event attendees. |

Source transfer is a controlled cutover event with reconciliation, effective time and rollback rules. Do not sync financial status bidirectionally simply because both systems have a `paid` field.

## 4. Delivery, sync and reconciliation

Transactional outbox persists intent in the domain transaction. A worker publishes to BullMQ, but PostgreSQL remains the durable intent/completion source. Re-enqueue an orphaned intent if Redis loses a job. Consumers use durable inbox uniqueness and business idempotency (S19-S20). A daily replay of all invoices must not add the same expense again.

Inbound webhook: verify raw-body/provider signature and timestamp where supported; enforce size/rate limits; persist inbox; acknowledge only durable receipt; process asynchronously. A provider without a trustworthy signature requires its documented alternative verification or a fresh authenticated fetch before applying trusted changes. Never label every vendor webhook as HMAC if that contract is unknown.

Use cursor checkpoints committed with processed batch state. Out-of-order updates use source version/effective time and explicit reversal semantics. An old observation cannot silently overwrite a newer payment state. Expired cursor triggers a bounded full re-sync, not duplicate postings. Provider deletions create source-deleted/tombstone states and reconciliation; they do not erase accepted E3 history.

Retries use capped exponential backoff with jitter, provider Retry-After and connector-level concurrency/circuit breaker. Suggested initial ceilings are engineering defaults, not business policy. Authentication failure pauses the connector and alerts the owner. Business validation errors are not retried forever. Ambiguous external write goes to reconciliation; do not resend a PO just because a request timed out.

Every projection displays last success, source data time, current connector health and provisional/reconciled status. Reports include a coverage/freshness statement when a source is missing. Core safe work remains available during provider outages.

## 5. Degradation matrix

| Operation | Provider/offline failure behaviour |
|---|---|
| Task note/photo/incident capture | Retain local draft/fact with timestamp and later sync. |
| Equipment demand | Tentative request only until authoritative capacity can be confirmed. |
| Invoice drafting | Store billing draft/request; do not mark accepted by ledger or paid. |
| Tender/permit evidence import | Allow manual controlled upload and verification, not a fabricated provider status. |
| Notification | Queue and show delay; in-app task/decision remains present. |
| Schedule calendar sync | EOS schedule continues; external projection marked stale. |
| High-consequence release | Fresh authority/evidence required or explicitly configured alternative verification; no generic “API down” bypass. |
| Marketing/ticket KPI | Last observation labelled as-of; no zeros invented for missing days. |

## 6. Offline field model

Cache an explicit signed/versioned manifest of assigned project/package instructions, permitted drawings and forms. Store only minimum field data. Do not cache internal margin, bank details, identity scans, sensitive HR documents or unrestricted incident narratives. Show offline status and data age prominently.

Operation record: clientOperationId, deviceId, userId, project/package, operationType, capturedAt, receivedAt, baseVersion, policy/manifest version, payloadHash and evidence references. Client timestamps are claims, not trusted ordering or approval time. Each operation is append-only locally until acknowledgement.

Allowed initial offline operations: notes, photos, checklist observations, attendance facts, asset scan observations, delivery evidence, incident/protective-action capture and local draft edits. Not allowed as authoritative offline actions: purchase/financial approval, budget release, policy publication, final permit validation, confirmed resource reservation, client binding decision or final ready-to-open release.

Sync reauthenticates the user, validates current scope and applies operations independently. Results: accepted, accepted_as_observation_with_conflict, pending_evidence, requires_review, rejected_authority or rejected_schema. Stale facts are preserved as disputed observations where appropriate; they do not overwrite current accepted records. A revoked identity cannot execute new commands; legally/operationally needed historical observations may be uploaded through an authorised supervisor review path without reinstating access.

Browser storage can be lost/evicted and background sync is not guaranteed across all devices. Provide explicit “Sync now”, upload progress, queue export/recovery through authorised support, storage-health warnings and paper/manual contingency. Test actual iOS/Android devices. Offline expiry and device enrolment policies are scoped. Remote revocation cannot magically erase a disconnected device; minimise cache, expire locally, purge on reconnect/logout and document that limitation.

Use HTTPS, CSP and encryption where appropriate, but do not claim IndexedDB encryption protects against malicious same-origin code holding the keys. Real defence includes minimal data, hardened app origin, device access protection and expiry. Photos remain pending until upload, scanning and linking complete.

## 7. AI and document assistance

Use pdfjs-dist text extraction for readable PDFs and controlled parsers for DOCX/EML/XLSX. OCR/vision is an explicit fallback for scanned documents, with confidence and manual verification. AI can propose requirements with source page/paragraph, suggest risk questions, draft narratives or compare selected revisions. It cannot decide legal compliance, approve spending or silently ingest an entire private drive.

Treat all tender/vendor/file text as untrusted content. Prompt instructions inside documents cannot change system actions. Pass only approved, permission-filtered snippets; use schema-constrained outputs, provenance and evaluation fixtures. No arbitrary URL fetch, SQL, unrestricted tool invocation or cross-project retrieval. Suggested actions go through normal human validation and EOS command endpoints.

OpenAI is selected as a provider interface, not a permanent model lock. Model IDs are versioned deployment configuration selected after representative evaluation. Use `store:false` where supported and minimise inputs, but this is not a blanket zero-retention guarantee; review actual account controls and processing arrangements (S33-S34). Restricted client/government content remains disabled for external AI until explicitly permitted. AI outage never blocks operational work.
