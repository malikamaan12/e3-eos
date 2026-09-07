# E3-EOS Developer Handover v1.0

**Prepared:** 7 September 2026  
**Purpose:** Hand the consolidated product plan, selected architecture, API/data contracts and phased acceptance requirements to E3's developer team.

## Start here

Read [the complete standalone master](00_MASTER_DEVELOPER_HANDOVER.md). It includes all shared specifications, eight build phases, thirteen event-stage templates and the core command OpenAPI. Use the individual files below for focused implementation and assignments. Do not implement competing copies of the same policy/approval/calculation logic.

## Development phases

| File | Outcome |
|---|---|
| [P00: Foundation, architecture and security](phases/PHASE_00_FOUNDATION_SECURITY.md) | A deployable, tested platform foundation with a demonstrated authentication and policy-publication vertical slice. |
| [P01: Project control and configurable lifecycle](phases/PHASE_01_PROJECT_CONTROL.md) | An internal project can run from idea to a basic evidence-backed closeout through a genuinely editable workflow. |
| [P02: Design, BOQ, commercial approvals and client portal](phases/PHASE_02_DESIGN_COMMERCIAL_PORTAL.md) | A client can review a controlled design and proposal, accept an exact version and approve an authorised change. |
| [P03: Procurement, fabrication and inventory](phases/PHASE_03_PROCUREMENT_PRODUCTION_ASSETS.md) | Approved scope becomes accountable orders, production jobs, reservations and accepted receipts. |
| [P04: Crew, logistics, readiness and live field operations](phases/PHASE_04_FIELD_OPERATIONS.md) | E3 can prepare, open, operate and dismantle an event with mobile evidence and bounded offline behaviour. |
| [P05: Finance, integrations, final reports and closeout](phases/PHASE_05_FINANCE_REPORTING_INTEGRATIONS.md) | One event has reconciled financials, controlled client reporting and clearly owned external data feeds. |
| [P06: Portfolio optimisation, advanced rules and AI assistance](phases/PHASE_06_OPTIMISATION_AI_COUNTRY_SCALE.md) | Cross-project what-if analysis, exception analytics and opt-in AI improve decisions without acquiring approval authority. |
| [P07: Migration, acceptance and production rollout](phases/PHASE_07_PRODUCTION_ROLLOUT.md) | A security-tested, reconciled release is accepted by named E3 owners with recovery and support evidence. |

P06 is optional optimisation; P07 can accept the P00-P05 core first. Security and QA run throughout. Build phases are not the thirteen configurable event stages.

## Shared specifications

- [Product modules, workspaces and experience contract](specs/01_PRODUCT_MODULES_AND_UX.md)
- [Technical architecture and architecture decisions](specs/02_TECH_ARCHITECTURE_AND_ADRS.md)
- [Domain data model, state contracts and invariants](specs/03_DATA_MODEL_AND_INVARIANTS.md)
- [Configuration, workflow, authority and exception engine](specs/04_CONFIGURATION_APPROVALS_AND_EXCEPTIONS.md)
- [API and domain event contracts](specs/05_API_AND_EVENT_CONTRACTS.md)
- [Integration decisions, adapter contracts and offline operation](specs/06_INTEGRATIONS_AND_OFFLINE.md)
- [Security, infrastructure, observability and operational runbooks](specs/07_SECURITY_DEPLOYMENT_AND_RUNBOOKS.md)
- [Finance, metric contracts, final reporting and knowledge reuse](specs/08_REPORTING_FINANCE_AND_ANALYTICS.md)
- [Quality, acceptance and requirement traceability](specs/09_QA_ACCEPTANCE_AND_TRACEABILITY.md)
- [Decision register, implementation control and go-live conditions](specs/10_DECISIONS_RISKS_AND_GO_LIVE.md)
- [Source and dependency verification register](specs/11_SOURCES_AND_VERSION_REGISTER.md)

## Event-stage library

- [Stage 01: Project Onboarding](stages/01_PROJECT_ONBOARDING.md)
- [Stage 02: Qualification and Feasibility](stages/02_QUALIFICATION_FEASIBILITY.md)
- [Stage 03: Idea, Concept and First Draft](stages/03_IDEA_CONCEPT_FIRST_DRAFT.md)
- [Stage 04: Clarification and Design Development](stages/04_CLARIFICATION_DESIGN_DEVELOPMENT.md)
- [Stage 05: Proposal, Submission and Authorisation](stages/05_PROPOSAL_SUBMISSION_AUTHORISATION.md)
- [Stage 06: Detailed Delivery Planning](stages/06_DETAILED_DELIVERY_PLANNING.md)
- [Stage 07: Vendor Selection and Orders](stages/07_VENDOR_SELECTION_ORDERS.md)
- [Stage 08: Production and Resource Preparation](stages/08_PRODUCTION_RESOURCE_PREPARATION.md)
- [Stage 09: Logistics, Bump-in and Installation](stages/09_LOGISTICS_BUMP_IN_INSTALLATION.md)
- [Stage 10: Finishing, Testing and Opening Readiness](stages/10_FINISHING_TESTING_READINESS.md)
- [Stage 11: Operations and Delivery](stages/11_OPERATIONS_DELIVERY.md)
- [Stage 12: Bump-out and Reconciliation](stages/12_BUMP_OUT_RECONCILIATION.md)
- [Stage 13: Post-event Report, Closure and Learning](stages/13_POST_EVENT_REPORT_CLOSURE_LEARNING.md)

## Contracts and package validation

[Core command OpenAPI](contracts/CORE_COMMANDS.openapi.yaml) and [contract notes](contracts/README.md). The core file is an explicitly bounded starting subset; the API specification contains the broader operation inventory.

`MANIFEST.json` lists package contents and hashes. `DOCUMENT_VALIDATION.md` records checks performed on the documentation files only. Those checks do not claim that EOS, provider integrations or acceptance tests have been implemented or passed.

## Precedence and provenance

This version consolidates the supplied v0.1 specification, v0.2 clarification draft and subsequent governance decisions. Shared v1.0 contracts govern the templates. External source references were checked on the preparation date. Exact package locks, actual E3 repository/account access, legal obligations, business authority and provider credentials are recorded implementation activation gates, not invented facts.

No live production system was changed, no provider was connected and no business records were created by preparing this handover.
