# E3-EOS Release Evidence: Provider Integrations & Outage Resilience

**Release:** `v1.0.0`  
**Governing Standards:** `specs/06_INTEGRATIONS_AND_OFFLINE.md`, `AT-072`, `AT-073`, `AT-074`, `AT-075`, `AT-076`

---

## 1. Provider Adapter Resilience Register

| Integration | Protocol / Transport | Resilience Invariant | Tested Handling |
|---|---|---|---|
| **BookingQube** | REST / JSON | Unverified API credentials must never fabricate fake live endpoints (`AT-073`). | Evaluates vendor connectivity. If uncertified or unavailable, falls back to reviewed manual spreadsheet import with `provisional_manual_import` disclosed. |
| **Metricool** | REST / Webhook | Connector disabled or plan tier lacks API (`AT-075`). | Freshness timestamp recorded. If data exceeds 24-hour window, UI discloses `stale_data` state while core project operations remain completely unaffected. |
| **Google Calendar** | OAuth2 / CalDAV | External event shifts cannot silently overwrite baseline project schedule (`AT-076`). | Creates a `CalendarReconciliationProposal` requiring explicit Project Manager review and approval before mutating project milestones. |
| **Turnstile Ticketing** | HTTPS Webhooks | Differentiates total barcode scans vs unique individuals (`AT-074`). | Turnstile scans tracked separately from daily unique attendees and multi-day festival unique visitors. Sum of daily uniques never falsely represents unique human attendees. |
| **External Supplier Webhooks** | HTTPS POST + HMAC | Signature verification and replay protection (`AT-072`). | Verifies HMAC-SHA256 signature using secret key; rejects forged payloads (401 Unauthorized); deduplicates replayed events (`duplicate_replay_ignored`). |

---

## 2. Dead-Letter Queue & Outbox Monitoring

- All asynchronous outbox events record `status: 'pending' | 'dispatched' | 'failed'`.
- Events failing after 5 retries move to the dead-letter queue (DLQ) with error diagnostics.
- Operational support runbook allows manual inspection and reprocessing of DLQ entries without duplicate side effects (`AT-009`).
