# Source and dependency verification register

**Version:** 1.0 developer handover | **Reviewed:** 7 September 2026

## Evidence status

This package consolidates the supplied v0.1 master, architecture, delivery and thirteen stage documents, plus the supplied v0.2 draft clarification addendum and subsequent user directions. Those project documents are the source for E3's product requirements. New stack choices and engineering defaults here are recommended implementation decisions, not claims about software already running.

Prior E3 context identifies an existing rentals application using Next.js/React, Drizzle, PostgreSQL/Supabase and Vercel. Its current repository, production data and security status were NOT inspected during this handover. P00 must inventory and verify them before reuse. The public corporate website is not assumed to share the same database or ORM.

External sources below were checked through official product/developer documentation. Public documentation does not prove E3 account access, plan entitlement, sandbox access, local legal acceptance or completed compatibility testing. No vendor secrets, customer records or live E3 accounts were accessed to create this package.

## Primary references

| ID | Official source | URL | Scope and qualification |
|---|---|---|---|
| S01 | Next.js 16 release and framework baseline | https://nextjs.org/blog/next-16 | Framework selection, not proof of application performance. |
| S02 | Node.js official release/download page | https://nodejs.org/ | Node 24 LTS line; lock an approved current security patch at P00. |
| S03 | NestJS migration guide | https://docs.nestjs.com/migration-guide | Current guide covers Nest 12, ESM and CLI Node-version floors. |
| S04 | Drizzle migrations | https://orm.drizzle.team/docs/migrations | Reviewed SQL migration workflow. |
| S05 | Drizzle transactions | https://orm.drizzle.team/docs/transactions | Transaction support; domain invariants remain E3 implementation responsibility. |
| S06 | Better Auth Express integration | https://better-auth.com/docs/integrations/express | ESM integration and HTTP handler placement. |
| S07 | Better Auth Drizzle adapter | https://better-auth.com/docs/adapters/drizzle | Adapter exists; schema and plugin compatibility must be tested. |
| S08 | Better Auth security | https://better-auth.com/docs/reference/security | Session and security configuration. |
| S09 | Better Auth two-factor authentication | https://better-auth.com/docs/plugins/2fa | TOTP and recovery capabilities; E3 enforcement remains required. |
| S10 | Better Auth changelog | https://better-auth.com/changelog | Stable-versus-prerelease and security patch verification at lock time. |
| S11 | PostgreSQL 17 row security | https://www.postgresql.org/docs/17/ddl-rowsecurity.html | Database row-security behaviour and owner/bypass caveats. |
| S12 | PostgreSQL 17 range types | https://www.postgresql.org/docs/17/rangetypes.html | Non-overlap constraints for exclusive reservations. |
| S13 | Cloud Run locations | https://docs.cloud.google.com/run/docs/locations | Doha me-central1 is listed; verify SKU and quota before deployment. |
| S14 | Cloud SQL region availability | https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview | Doha option and region/edition choice. |
| S15 | Cloud SQL PostgreSQL 17 support | https://cloud.google.com/blog/products/databases/postgresql-17-now-available-on-cloud-sql/ | PG17 service support. |
| S16 | Memorystore Redis regions | https://docs.cloud.google.com/memorystore/docs/redis/regions | Doha regional option. |
| S17 | Compute Engine regions and zones | https://docs.cloud.google.com/compute/docs/regions-zones | Regional always-on worker deployment option. |
| S18 | Cloud SQL FAQ | https://docs.cloud.google.com/sql/docs/postgres/faq | Explicitly configure backup geography; do not rely on defaults. |
| S19 | BullMQ production guidance | https://docs.bullmq.io/guide/going-to-production | Queue deployment and Redis requirements. |
| S20 | BullMQ idempotent jobs | https://docs.bullmq.io/patterns/idempotent-jobs | Retries must not duplicate business effects. |
| S21 | OWASP authorisation guidance | https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html | Request-level, object-level access checks. |
| S22 | OWASP transaction authorisation | https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html | Bind approval to transaction details and enforce at execution. |
| S23 | Open Policy Agent performance guidance | https://openpolicyagent.org/docs/policy-performance | Precomputation and workload testing as architectural reference; OPA is not selected as an initial runtime dependency. |
| S24 | BookingQube API integration page | https://bookingqube.com/integration-with-api | Public integration capability only; endpoint schemas and customer entitlement are not established. |
| S25 | Metricool API basic guide | https://help.metricool.com/basic-guide-for-api-integration-r97af | API token, X-Mc-Auth header and plan restrictions. |
| S26 | Metricool API access | https://help.metricool.com/api-access-export-your-metricool-data-to-other-tools-and-automate-tasks-x8ln5 | Advanced/Custom entitlement and account documentation. |
| S27 | Google Calendar API overview | https://developers.google.com/workspace/calendar/api/guides/overview | Calendar v3 integration. |
| S28 | Google Calendar push notifications | https://developers.google.com/workspace/calendar/api/guides/push | Watch notifications and channel lifecycle. |
| S29 | Google Drive API overview | https://developers.google.com/workspace/drive/api/guides/about-sdk | Drive v3 imports/exports and file references. |
| S30 | Gmail API overview | https://developers.google.com/workspace/gmail/api/guides | Authorised email sending; no blanket inbox access proposed. |
| S31 | Docusign eSignature REST reference | https://developers.docusign.com/docs/esign-rest-api/reference/ | Optional formal signing provider; account/legal suitability unverified. |
| S32 | Docusign Connect | https://developers.docusign.com/platform/webhooks/connect/ | Optional envelope event notifications. |
| S33 | OpenAI Responses API | https://developers.openai.com/api/reference/resources/responses/methods/create/ | Selected opt-in AI interface. |
| S34 | OpenAI data controls | https://developers.openai.com/api/docs/guides/your-data | Storage, abuse-monitoring and approved retention controls; store=false is not a universal zero-retention guarantee. |
| S35 | Rentman public API webhooks | https://support.rentman.io/hc/en-us/articles/15274709111826-Public-API-Webhooks | Optional future adapter only, not an assumed E3 subscription or current source of stock. |
| S36 | Memorystore Redis service documentation | https://docs.cloud.google.com/memorystore/docs/redis | Managed Redis compatibility; test BullMQ command behaviour on selected SKU. |

## Dependency locking and compatibility evidence

Choose the technology families stated in the architecture specification. At P00 create `DEPENDENCY_LOCK.md` in the implementation repository containing exact package versions, lockfile hash, container digest, licence, upstream support status, security scan, compatibility test and owner. Do not use `latest`, `^` or prerelease images in production deployment manifests. Compatible patch ranges in development tooling do not replace an exact checked-in lockfile.

Node 24 must meet the current Nest CLI floor documented in S03; use a supported security patch at or above that floor. Next.js 16 uses a React 19-compatible version. Nest 12 packages move together. Better Auth and all its selected plugins must be from a tested compatible stable line. Use a stable Drizzle release, not an RC just because a quickstart uses one. PostgreSQL 17 is an intentional baseline, not a claim that it is the newest PostgreSQL release.

New vulnerabilities or upstream deprecations can require updates independently of a project's pinned business policy. Each upgrade requires migration and regression evidence. This register is a design-time review dated above, not a perpetual certification.
