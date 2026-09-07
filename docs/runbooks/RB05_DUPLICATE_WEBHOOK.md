# Operational Runbook RB05: Duplicate / Out-of-Order Webhook

**Governing Standard:** `specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md` §8  
**Target Invariants:** HMAC verification, deduplication, idempotent state updates (`AT-010`, `AT-072`)

---

## 1. Webhook Ingestion Verification
1. **HMAC Signature Check**:
   - Every external webhook request is validated against its `X-Hub-Signature-256` or `X-EOS-Signature` header computed over the raw payload bytes.
   - Forged or mismatched signatures return `401 Unauthorized` immediately.

---

## 2. Deduplication & Replay Handling
1. **Idempotency Key Check**:
   - Check the webhook's unique event ID (`eventId`) against the `webhook_inbox` table.
   - If already processed:
     - Return HTTP 200 OK with body `{"status": "duplicate_replay_ignored"}`.
     - **DO NOT** repeat business side effects (e.g. ticketing scans, payment ledger updates).
2. **Out-of-Order Sequence Handling**:
   - If an event arrives with an older timestamp than the entity's current recorded version:
     - The event is logged as an informational observation in `webhook_audit`.
     - The newer authoritative state in the database is preserved without rollback to stale facts.
