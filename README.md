# E3 Enterprise Event Operating System (E3-EOS) — v1.0 Production Baseline

**Product:** E3 Enterprise Event Operating System  
**Version:** 1.0 Production Implementation  
**Status:** All 8 Build Phases Delivered (`P00`–`P07`), 92 Acceptance Tests Verified (`AT-001`–`AT-092`), 213 Automated Tests Passing (0 Failures across 24 test suites).

---

## 1. Quickstart

### Prerequisites
- **Node.js**: `v22.14.0` or higher (Node 22 / Node 24 LTS)
- **pnpm**: `v10` or `v11`
- **Docker & Docker Compose**: (optional for local multi-service container cluster)

### Installation & Verification
```bash
# 1. Install workspace dependencies
pnpm install

# 2. Strict typecheck across all 8 workspace packages
pnpm typecheck

# 3. Execute all 213 automated tests across 24 test suites
pnpm test

# 4. Verify complete 92/92 acceptance test traceability matrix
pnpm verify:matrix

# 5. Run single-command comprehensive pre-flight verification gate (all 6 layers)
pnpm verify:preflight

# 6. Production build across all packages and frontend bundles
pnpm build

# 7. Run the interactive console demonstration (10 core invariants)
pnpm demo

# 8. Generate development database seed manifest (13 stages & 312 activities)
pnpm seed

# 9. Start live local services
pnpm dev:api   # NestJS API on http://localhost:4000 (OpenAPI docs: /api/v1/docs)
pnpm dev       # React 19 Web on http://localhost:3000 (with port 3001 redirect bridge & Field PWA)
```

---

## 2. Monorepo Architecture

```text
b:/PROJECTS/EOS/
├── apps/
│   ├── api/          # NestJS 11 Enterprise REST & Command API
│   ├── web/          # React 19 Full-Stack Workspace UI (7 workspaces, RTL, view states)
│   └── worker/       # Background Outbox Dispatcher & Event Reconciler
├── packages/
│   ├── contracts/    # Canonical DTOs, OpenAPI schemas, and RFC 7807 Problem Details
│   ├── domain/       # Non-destructive domain logic (Stage graph, BOQ, Finance, Inventory, AI)
│   ├── policy/       # Versioned policy engine with scoped exceptions
│   ├── db/           # Drizzle ORM PostgreSQL 17 schema, migrations, and seed generator
│   └── test-fixtures/# Canonical synthetic multi-tenant test fixtures
├── tests/
│   ├── lifecycle-e2e.test.ts   # 13-stage continuous lifecycle end-to-end integration test
│   └── infrastructure.test.ts  # IaC, Dockerfile, and runbook integrity tests
├── infra/
│   └── terraform/    # Google Cloud me-central2 (Doha, Qatar) Terraform topology (Cloud Run, Cloud SQL, Redis)
├── docs/
│   └── runbooks/     # All 12 operational runbooks (RB01 to RB12)
└── release-evidence/
    └── v1.0.0/       # Production release evidence package (10 mandatory artifacts)
```

---

## 3. Core Domain Invariants Enforced

1. **Finance (EAC 90,000 QAR Invariant)**:
   - $\text{EAC} = \text{Posted Actuals} + \text{Accepted Accruals} + \text{Remaining Commitments} + \text{Uncommitted Forecast}$
   - Reconciling 10,000 QAR shifts accrual to actual cost with **zero double-counting** (EAC stays precisely at 90,000 QAR with 43.75% margin).
2. **Inventory (Serialized Collision Prevention)**:
   - Non-overlapping reservation engine guarantees zero double-booking for heavy generators and AV equipment across regional events.
3. **Readiness (Critical Condition Gate)**:
   - Critical safety checkpoints (e.g., Civil Defense permits) strictly override percentage progress (a 95% ready event cannot open with a blocked safety gate).
4. **AI Assistant (Prompt Injection Neutralization)**:
   - Untrusted tender directives attempting system prompt override are treated as inert plain text.
5. **Localization (Arabic RTL Layout)**:
   - Full bi-directional layout support (`ltr` $\leftrightarrow$ `rtl`), native Arabic translation bundles, and regional currency formatting (`QAR` / `AED`).
6. **Compensating Rollback**:
   - Dispatched external purchase orders maintain immutable audit history; rollbacks issue compensating cancellations without database resets.

---

## 4. Workspaces (`@e3-eos/web`)

1. **Leadership**: `/portfolio`, `/portfolio/resources`, `/portfolio/exceptions`
2. **Personal Work**: `/my-work`, `/approvals`, `/notifications`
3. **Project Cockpit**: `/projects/:id/...` (Interactive 13-stage lifecycle cockpit & 312 stage activities)
4. **Field Ops (PWA)**: `/field/projects/:id`, `/field/sync` (Touch-optimized mobile checklist runner with offline queueing)
5. **Client Portal**: `/portal/projects/:id` (Sanitized client projection stripping internal contractor rates and margins)
6. **Supplier Portal**: `/contribute/:token` (Restricted RFQ upload & virus quarantine defense)
7. **Admin Studio**: `/admin/templates`, `/admin/policies`, `/admin/audit` (P07 Go-Live Gate, Drills, and RB01-RB12 Runbook Console)

---

## 5. API & OpenAPI 3.1 Specification (`@e3-eos/api`)

- **Interactive Scalar API Reference**: [`http://localhost:4000/api/v1/docs`](http://localhost:4000/api/v1/docs)
- **Raw OpenAPI 3.1 Contract (YAML)**: [`http://localhost:4000/api/v1/openapi.yaml`](http://localhost:4000/api/v1/openapi.yaml)
- **Core Commands**: All 16 normative commands implemented with strict Zod validation, RFC 7807 problem details, and multi-tenant RLS context.
- **Health & Telemetry Probes**: [`http://localhost:4000/api/v1/health`](http://localhost:4000/api/v1/health)

---

## 6. Operational Runbooks

| Runbook | Title | Focus Area |
|---|---|---|
| [RB01](docs/runbooks/RB01_DATABASE_API_OUTAGE.md) | Database & API Outage | Regional failover, PITR, restore parity, outbox replay |
| [RB02](docs/runbooks/RB02_QUEUE_REDIS_OUTAGE.md) | Queue & Redis Outage | Memorystore failover, outbox re-enqueueing |
| [RB03](docs/runbooks/RB03_AMBIGUOUS_PO_TIMEOUT.md) | Ambiguous PO Timeout | Supplier timeout reconciliation without blind retries |
| [RB04](docs/runbooks/RB04_CREDENTIAL_COMPROMISE.md) | Credential Compromise | Immediate session revocation, secret rotation, audit review |
| [RB05](docs/runbooks/RB05_DUPLICATE_WEBHOOK.md) | Duplicate Webhook Ingestion | HMAC verification and idempotent deduplication |
| [RB06](docs/runbooks/RB06_LOST_FIELD_DEVICE.md) | Lost Field Device | Offline session revocation and supervisor contingency |
| [RB07](docs/runbooks/RB07_WRONG_POLICY_PUBLISHED.md) | Wrong Policy Published | Scoped snapshot rollback without audit destruction |
| [RB08](docs/runbooks/RB08_SAFETY_EVIDENCE_FAILURE.md) | Safety Evidence Failure | Stop-work order, critical gate blocking, authorized reopening |
| [RB09](docs/runbooks/RB09_FINANCIAL_IMPORT_MISMATCH.md) | Financial Import Mismatch | File hash deduplication, quarantine, reversing entries |
| [RB10](docs/runbooks/RB10_MALICIOUS_FILE_PROMPT_INJECTION.md) | Malicious File & Prompt Injection | Quarantine isolation and passive prompt-injection defense |
| [RB11](docs/runbooks/RB11_LEAKED_PUBLICATION_LINK.md) | Leaked Publication Link | Token revocation and replacement publication issuance |
| [RB12](docs/runbooks/RB12_FAILED_DEPLOYMENT_MIGRATION.md) | Failed Deployment Migration | Non-destructive compensating rollback without database resets |

---

## 7. License & Ownership
Copyright © 2026 E3. All rights reserved. Master Developer Handover v1.0 specifications.
