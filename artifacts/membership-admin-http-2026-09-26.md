# Admin membership HTTP acceptance — 26 September 2026

Recorded results: 23 PASS, 0 FAIL, 0 PENDING.

Environment: local rebuilt NestJS API on localhost:4000 with local PostgreSQL. Requests used opaque sessions belonging only to isolated synthetic organisations; synthetic-header authentication remained disabled. No passwords or external email delivery were used.

Independent process check: root confirmed API PID 29940 was replaced by PID 24120 before replay. A second HTTP request after restart returned the identical stored revocation receipt with exactly one audit event, one outbox intent, and one command receipt. The revoked session remained rejected.

The audit HTTP projection returned the correct organisation, actor, membership target, event ID, digest and timestamp. Digest and timestamp were unchanged by replay. This check does not claim privileged database tamper resistance.

Cleanup: the two synthetic organisations, five users/memberships, their sessions and associated test audit/outbox/receipt rows were removed using exact generated fixture IDs. The temporary file containing fixture session tokens was deleted. No existing user or membership was revoked.

| Check | Status | HTTP status | Timestamp (UTC) |
|---|---|---|---|
| Isolated synthetic fixtures | PASS | — | 09/26/2026 09:19:46 |
| Scoped admin directory without invented rows | PASS | 200 | 09/26/2026 09:19:47 |
| Executive read-only capabilities | PASS | 200 | 09/26/2026 09:19:47 |
| Identity headers do not establish authority | PASS | 401 | 09/26/2026 09:19:47 |
| Cross-organisation target is hidden | PASS | 404 | 09/26/2026 09:19:47 |
| Missing command key is rejected | PASS | 400 | 09/26/2026 09:19:47 |
| Empty reason is rejected | PASS | 400 | 09/26/2026 09:19:47 |
| Invalid membership ID is rejected | PASS | 400 | 09/26/2026 09:19:47 |
| Executive cannot revoke | PASS | 403 | 09/26/2026 09:19:47 |
| Self admin revocation is rejected | PASS | 409 | 09/26/2026 09:19:47 |
| Legacy invitation is explicitly unavailable | PASS | 503 | 09/26/2026 09:19:47 |
| Legacy project grant is explicitly unavailable | PASS | 503 | 09/26/2026 09:19:47 |
| Unsupported admin commands have no membership or invitation effects | PASS | — | 09/26/2026 09:19:47 |
| Valid revocation commits receipt audit and outbox | PASS | 201 | 09/26/2026 09:19:47 |
| Revoked session denied on its next tenant request | PASS | 401 | 09/26/2026 09:19:47 |
| Same command replay returns identical receipt | PASS | 201 | 09/26/2026 09:19:47 |
| Reused key with different reason conflicts | PASS | 409 | 09/26/2026 09:19:47 |
| New key cannot repeat the revoked business action | PASS | 409 | 09/26/2026 09:19:47 |
| Fixtures retained for independent API process restart | PASS | — | 09/26/2026 09:19:47 |
| Independent API process restart replay | PASS | 201 | 09/26/2026 09:21:37 |
| Revoked session remains denied after API restart | PASS | 401 | 09/26/2026 09:21:37 |
| Scoped audit HTTP projection preserves revocation metadata | PASS | 200 | 09/26/2026 09:21:37 |
| Exact synthetic fixture cleanup | PASS | — | 09/26/2026 09:21:50 |

Machine-readable evidence: [admin-membership-http-smoke-results-2026-09-26.json](admin-membership-http-smoke-results-2026-09-26.json). No session tokens are included.

These results cover the scoped directory/capability, revocation, replay and disabled legacy-command slice. Invitation issuance, role reassignment, restoration and project access grants remain explicitly unavailable.
