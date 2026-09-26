# Local development on this Windows workspace

The web application runs at http://localhost:3002 and the API at http://localhost:4000. Ports 3000 and 3001 belong to other applications; Vite automatically selected 3002.

PostgreSQL 17 is installed in `.local/postgresql/pgsql`, with data in `.local/pgdata`. It listens only on `127.0.0.1:5432`, uses SCRAM password authentication, and uses the repository's default local database/user/password (`postgres`). This is development-only configuration. The `.local` directory is ignored by Git.

To resume after a reboot:

```powershell
pwsh -File scripts/start-local-db.ps1
pnpm migrate
pnpm build:api
pwsh -File scripts/start-local-api.ps1
# In another terminal:
pnpm dev
```

`pnpm seed` populates the canonical development fixtures. Some integration tests mutate shared fixtures; reseed the local development database after running `pnpm test`. Do not run these tests against a production database. A separate database may be selected through `DATABASE_URL` or the `DB_*` environment variables.

To stop this local database:

```powershell
& .local/postgresql/pgsql/bin/pg_ctl.exe -D "$PWD/.local/pgdata" stop
```

On a fresh machine, use the supplied Docker Compose PostgreSQL service, or obtain the PostgreSQL 17 Windows binary archive from [EDB](https://productsdl.enterprisedb.com/download-postgresql-binaries), the distributor linked by [PostgreSQL](https://www.postgresql.org/download/windows/). Extract it under `.local/postgresql`, then initialize `.local/pgdata` with `initdb -U postgres -A scram-sha-256 -W --encoding=UTF8 --locale=C`. Use a password matching your local environment configuration. The Compose database uses different defaults; configure `DB_NAME=e3_eos_dev` and `DB_PASSWORD=devpassword123` when using Compose.

## Authentication after the Markdown foundation increment

Protected endpoints require an unexpired database session with an active membership. Seeded password login remains available against this development database; header-only identity is no longer accepted by default. Authentication storage errors fail closed.

Only for local synthetic fixture/UAT work, explicitly set `EOS_ENABLE_LOCAL_SYNTHETIC_AUTH=true` together with `NODE_ENV=development` (or `test`) and `ENVIRONMENT=local` (or `development`/`test`). The flag cannot enable these paths in staging/production. Do not use fixture headers as evidence of real authorization testing.

Browser commands require an allowed origin. Local defaults cover `localhost` and `127.0.0.1` on ports 3000–3002. Set `EOS_WEB_ORIGINS` to exact comma-separated HTTP(S) origins, or `APP_BASE_URL` to one origin, for other environments. Deployed environments have no implicit origin allowance. Cookie-authenticated writes without Origin are rejected; non-browser clients use a database-backed Bearer session. See [P00 authentication boundary](P00_AUTH_BOUNDARY.md).

Database library imports and API startup do not seed fixtures. Run `pnpm seed` explicitly when restoring local synthetic fixtures; it calls `packages/db/src/seed-cli.ts`. A failed seed rolls back and exits nonzero. Importing `seed.ts` only exposes library functions. The explicit seed can reset synthetic credentials and operational fixtures, so it remains a development command, not a deployment health check.

The user directory shows current-organisation membership records, including revoked records. Internal Super Admin membership revocation requires a reason and a stable `Idempotency-Key`; the transaction records audit, outbox and retry receipt together. Controlled invitations use the same transaction guarantees and require delivery configuration below. Ordinary role changes, membership restoration and explicit project-access grants are now available through the controlled access administration flows below. Local persona preview is offered only when the API reports the explicit synthetic mode as enabled; a rejected preview never substitutes a browser-generated identity.

## Controlled invitation configuration

Apply `pnpm migrate` before starting the rebuilt API; migration `0015_controlled_invitation_lifecycle.sql` adds invitation provenance and lifecycle fields. Existing invitation rows become `legacy_unverified` and cannot be accepted through the controlled flow.

Set these values in the API environment before startup:

| Variable | Required configuration |
| --- | --- |
| `EOS_INVITATION_DELIVERY_KEY` | Base64 encoding of exactly 32 random bytes, provided through local secret configuration. Without a valid key, invitation creation is unavailable. |
| `EOS_INVITATION_DELIVERY_KEY_ID` | Encryption key label; defaults to `v1`. This label does not implement rotation or a key store. |
| `EOS_INVITATION_TTL_HOURS` | Integer from 1 to 168; defaults to 24. |
| `APP_BASE_URL` | Frontend origin with no path, credentials, query or fragment. Defaults to `http://localhost:3002` only in local/test environments; deployed environments require an explicit HTTPS origin. |

`canInvite` from `/admin/access-capabilities` requires both current internal Super Admin authority and valid key, expiry and application-origin configuration. `canCancelInvitations` does not require delivery configuration. `allowedInvitationRoles` is the authoritative role list; privileged roles are excluded. Configure browser origin permission as described above as well.

The invitation register reports `queued` when an encrypted outbox delivery intent exists. This increment has no email sender: creating an invitation does not send email or return a token/link. The encrypted payload contains an `/accept-invite#token=...` link for a future controlled delivery worker. Do not represent a queued entry as a delivered invitation.

On this Windows workspace, a random local queue key is stored under the current Windows account's DPAPI protection at ignored `.local/invitation-delivery.key.dpapi`. `scripts/start-local-api.ps1` loads it without printing it, selects only the loopback development database, disables synthetic authentication and uses queued-only email configuration. It neither seeds nor migrates. The key is not portable to another Windows identity or a deployed environment; use approved managed secrets there. Without this local file or a supplied valid environment key, invitations remain unavailable. Do not rotate or discard a queue key while encrypted delivery intents still need it.

Migration 0015 was applied locally inside one explicit transaction with its ledger entry. The legacy migration runner's broad `already exists` handling remains a deployment limitation; schema presence alone must not be treated as proof that a partially applied migration succeeded. Use a reviewed transactional migration procedure for deployment.

Acceptance requires the opaque token and an `Idempotency-Key`. Existing accounts must sign in as the invited identity and keep their existing credentials and name. New accounts set a password; sign-in remains a separate step afterward. Acceptance grants organisation membership only, with no project access. Existing memberships, including revoked ones, cannot be replaced or restored by invitation. See [P00 authentication boundary](P00_AUTH_BOUNDARY.md) for cancellation, replay and legacy-token behavior.

Offline captures currently stay provisional on the device. Upload is unavailable until durable server capture/receipt storage is implemented; retry cannot claim that memory-only acknowledgement saved the evidence.

See [Markdown implementation tracker](MD_IMPLEMENTATION_TRACKER.md) for completed local safeguards and the ordered remaining backlog.


## Access administration batch

Apply migrations 0016_project_access_grants.sql and 0017_membership_controlled_changes.sql before starting the rebuilt API. These add the scoped project grant register and membership versions without granting anyone access or changing existing roles. Use /admin/users for ordinary role changes/restoration and /admin/access for explicit project grants. A newly created project is a saved draft; its owner/creator still needs an explicit grant to open it.

Role changes and restoration end all of the affected user's sessions, including sessions in other organizations. Restoration never reactivates old project grants. Privileged roles and audience transitions require a separate governance process. Legacy project cloning, dimensional closure and activity edits return an explicit unavailable response until durable implementations are built.

The role reference is at /admin/roles. Projects outside the current membership's grants are not inserted into the browser directory from sample data. The project's other business controllers are not yet certified against this new grant register.

## Work, document and reporting batch

Apply migrations 0018_work_versions.sql, 0019_document_versions.sql and 0020_reporting_snapshots.sql before running this batch. They preserve existing rows, add work/document versions and document provenance, and create the immutable internal report snapshot store. They do not grant project access or verify legacy uploaded files.

The connected routes are /work-register, /documents/register, /reports and /portfolio. Project-specific routes are /projects/:id/work, /projects/:id/document-register and /projects/:id/reports. Select a currently granted project; ownership alone does not confer access. Server capabilities control available actions, and the server rechecks authority for commands and retries.

Work packages and task completion are ordinary delivery records, not designated output acceptance. Document drafts/revisions contain metadata only: upload, virus scanning, approval, download, vault delivery and submission packs remain unavailable. Internal report snapshots preserve project/stage/activity state as of capture; the chosen period is a label, not a period-filtered performance calculation. No financial or client-publication values are inferred.

Module command retries reuse the same key and payload after uncertain responses. Version conflicts require refreshing and reviewing the current record before a new decision. New tests use exact-owned temporary records or isolated adapters and do not require reseeding.
