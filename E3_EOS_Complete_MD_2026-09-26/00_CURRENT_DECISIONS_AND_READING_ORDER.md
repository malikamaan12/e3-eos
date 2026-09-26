# E3-EOS — Current decisions and reading order

**Issued:** 26 September 2026  
**Purpose:** Bring the complete developer handover forward to the latest product decisions without rewriting its detailed stage and phase libraries.  
**Status:** Product specification. Actual implementation status requires checking the current repository and deployment.

## Reading order and precedence

1. Read this document and `README.md`.
2. Read `00_MASTER_DEVELOPER_HANDOVER.md` for the original full architecture and product contract.
3. Read `specs/`, `phases/` and `stages/` for focused implementation detail.
4. Read `updates/01_REQUIREMENTS_SCOPE_AND_DESIGN.md`, `updates/02_DOCUMENT_CONTROL_AND_EVIDENCE.md`, `updates/03_RESOURCES_INTEGRATIONS_AND_FINANCE.md`, `updates/04_UI_AND_ACCESSIBILITY.md`, and `updates/05_VERIFICATION_AND_RELEASE.md` for subsequent decisions.
5. Use `references/` for complete later integration plans and implementation prompts. A prompt describes intended work; it is not proof that work was deployed.

When two statements conflict, the explicit later decision in `updates/` takes precedence for its named subject. The original detailed specification remains in force elsewhere. Real law, client contract, tender wording and verified source-system behaviour take precedence over example product defaults. An approved E3 decision can supersede a proposed baseline through versioned change control.

## Confirmed product contract

- EOS is E3's internal event operating system with selectively published client and contributor views, not a standalone ticketing application.
- Onboard at idea, enquiry, tender, internal concept, direct award or framework call-off, even with incomplete data and clearly recorded assumptions.
- Each project can choose and change stages, forms, conditions, owners, approvers and gates within scoped authority. The thirteen event stages are seed templates, not compulsory steps. Build phases P00–P07 are software delivery phases and do not prescribe a project's lifecycle.
- A requirement connects source evidence, interpretation, revision, allocation, owner, design, BOQ, sourcing, delivery and acceptance. Keep these identities separate so revisions do not break traceability.
- Super Admin can publish scoped policy versions and authorize controlled exceptions. It cannot manufacture evidence, mark an invoice paid, declare a permit issued, or make unavailable stock available.
- E3 Rentals owns live inventory, asset availability and reservations. PurchaseTracker owns procurement vendors and its purchasing actions. EOS owns project demand, allocation, decisions and reconciliation. Live connectors are deferred until verified and activated.
- Preserve English and Arabic, RTL, mobile/field operation, accessibility, current RBAC, audit history and source-system ownership throughout new work.
- Operational completion, client acceptance, reporting completion, finance review and settlement remain distinct outcomes.

## Decision states

Use `USER_CONFIRMED`, `PROPOSED_DEFAULT`, and `REQUIRES_LOCAL_REVIEW` on rules and configuration seed data. A product design can be confirmed while a particular commercial threshold, named approver, permit rule, financial rate or statutory obligation remains unconfirmed. Country, venue and contract obligations must cite their applicable source and reviewer.

## Architecture and deployment status

The September 2026 handover proposed Next.js/React, NestJS, PostgreSQL, durable workers and private object storage, initially on a dedicated Google Cloud Doha environment. A later discussion considered Cloudflare Workers/Pages with Neon PostgreSQL for cost. That discussion did not itself approve or execute a migration. Inspect the current repository, deployment manifest, migrations, dependency locks, environment and service topology before changing platform assumptions. Preserve the domain contracts regardless of host.

The previous handover and later implementation prompts contain reported commits, tests and staging claims from different dates. None is a current acceptance certificate. Record the exact frontend build, API build, schema version, effective policy version, connector mode and human UAT evidence for the candidate under review.

## Canonical boundaries

| Topic | Authoritative record | EOS handling |
|---|---|---|
| Project requirements and zone allocations | EOS | Version and trace to source evidence |
| Approved design and client submission | EOS controlled revision/pack | Pin files, decisions and exact issued version |
| Project BOQ, forecast and variation | EOS | Separate assumptions, approved commitments, actuals and accounting data |
| Physical inventory and reservations | E3 Rentals | Request through verified adapter; display source status and freshness |
| Procurement vendor and purchasing | PurchaseTracker | Request through verified adapter; retain source ID and response |
| Posted accounting and payment | Identified finance authority | Reconcile; never infer paid from EOS proposal or bankless status |
| Legal/regulatory fact | Issuing authority or reviewed source | Keep evidence, jurisdiction, date and reviewer |

## Explicit non-rules

Do not hard-code a fixed deposit, quotation count, overtime or labour rate, report deadline, safety allowance, named-person approval route, or one country/venue rule for all projects. Do not count an exception as satisfaction of the original obligation. Do not count extracted AI text as approved scope. Do not let a local draft masquerade as a confirmed external reservation or purchase order.
