# Controlled invitation real HTTP verification

Loopback API localhost:4000; loopback PostgreSQL; isolated synthetic fixtures.

No raw invitation tokens, links, passwords, delivery key, or sessions are included in evidence. Temporary fixture state is encrypted and removed after cleanup.

| Check | Result | Evidence |
| --- | --- | --- |
| Isolated synthetic fixtures | PASS | {"organisations":2,"users":6,"memberships":6,"passwordCredentials":1,"externalMessages":0,"initialApiPid":4780} |
| Live admin capabilities and no-store header | PASS | {"httpStatus":200,"canInvite":true,"canCancelInvitations":true,"cacheControl":"no-store"} |
| Forged headers cannot establish authentication | PASS | {"httpStatus":401,"code":"UNAUTHENTICATED"} |
| Executive cannot create an invitation | PASS | {"httpStatus":403,"code":"FORBIDDEN_ROLE"} |
| Cookie command without Origin is rejected | PASS | {"httpStatus":403,"code":"UNTRUSTED_REQUEST_ORIGIN"} |
| Cookie command with hostile Origin is rejected | PASS | {"httpStatus":403,"code":"UNTRUSTED_REQUEST_ORIGIN"} |
| Browser Bearer command with hostile Origin is rejected | PASS | {"httpStatus":403,"code":"UNTRUSTED_REQUEST_ORIGIN"} |
| Origin rejections have no database effects | PASS | {"unchanged":true} |
| Allowed-origin cookie creation queues delivery | PASS | {"httpStatus":201,"code":null} |
| Hashed token and encrypted queued delivery without membership | PASS | {"tokenColumn":null,"tokenHashVerified":true,"encryptedFragmentLink":true,"plaintextTokenInStoredPayloadOrReceipt":false,"membershipCount":6} |
| Non-browser Bearer creation replay | PASS | {"httpStatus":201,"identicalReceipt":true} |
| Public token inspection with no-store | PASS | {"httpStatus":201,"requiresExistingSignIn":false,"cacheControl":"no-store"} |
| Scoped invitation list excludes another organisation | PASS | {"httpStatus":200,"cacheControl":"no-store","crossOrganisationRows":0} |
| Forged organisation selection is rejected | PASS | {"httpStatus":401,"code":"UNAUTHENTICATED"} |
| Privileged invitation role is denied | PASS | {"httpStatus":403,"code":"INVITATION_ROLE_NOT_ALLOWED"} |
| Existing account cannot accept anonymously | PASS | {"httpStatus":401,"code":"INVITATION_SIGN_IN_REQUIRED"} |
| Existing account requires the matching session | PASS | {"httpStatus":401,"code":"INVITATION_SIGN_IN_REQUIRED"} |
| Existing account accepts with its own session | PASS | {"httpStatus":201,"code":null} |
| Existing account credentials and profile remain unchanged | PASS | {"exactNameEmailVerificationAndPasswordHashPreserved":true} |
| New account accepts once | PASS | {"httpStatus":201,"code":null} |
| Same-key acceptance replay has one membership and audit | PASS | {"httpStatus":201,"identicalReceipt":true,"creation_audit":1,"acceptance_audit":1,"memberships":1,"receipts":2} |
| Changed new-account name conflicts with receipt | PASS | {"httpStatus":409,"code":"IDEMPOTENCY_CONFLICT"} |
| Consumed invitation rejects a different key | PASS | {"httpStatus":410,"code":"INVITATION_NOT_AVAILABLE"} |
| Cancellation commits through trusted cookie origin | PASS | {"httpStatus":201,"code":null} |
| Cancelled token cannot be inspected | PASS | {"httpStatus":410,"code":"INVITATION_NOT_AVAILABLE"} |
| Cancellation stops the pending delivery row | PASS | {"outboxStatus":"cancelled"} |
| Expired token is rejected | PASS | {"httpStatus":410,"code":"INVITATION_NOT_AVAILABLE"} |
| Synthetic issuer can be durably revoked | PASS | {"httpStatus":201,"code":null} |
| Revoked issuer makes invitation unavailable | PASS | {"httpStatus":410,"code":"INVITATION_NOT_AVAILABLE"} |
| Durable audit metadata is discoverable over HTTP | PASS | {"httpStatus":200,"cacheControl":"no-store","acceptanceEventPresent":true} |
| Preview-only pending fixtures prepared | PASS | {"pendingPreviews":2,"kinds":["new-account","existing-account"],"deterministicNonsecretFixtureTokens":true,"originalEncryptedDeliveryUnusable":true,"browserAcceptanceAuthorised":false} |
| Fixtures retained for independent-process replay | PASS | {"nextAction":"Root restarts API; run replay, then cleanup."} |
| Independent-process creation and acceptance replay | PASS | {"initialApiPid":4780,"restartedApiPid":24088,"creationHttpStatus":201,"acceptanceHttpStatus":201,"identicalReceipts":true,"unchangedRowCounts":true,"creation_audit":1,"acceptance_audit":1,"memberships":1,"receipts":2} |
| Exact synthetic fixture cleanup | PASS | {"organisationsRemoved":2,"usersRemoved":7,"ownedUsersAndOrganisationsRemaining":0,"encryptedStateFileRemoved":true} |

All 34 checks passed, including independent-process replay from API PID 4780 to PID 24088 and exact fixture cleanup. Delivery is verified as encrypted outbox queuing only; this exercise did not send email.

An initial helper proof query required explicit text/UUID parameter casts. Its isolated fixtures were removed before this complete rerun; no backend correction was required.
