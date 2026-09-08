# E3-EOS Release Evidence: Automated Test Results

**Release:** `v1.0.0`  
**Framework:** Vitest 3.2.7  
**Execution Timestamp:** 2026-09-08T21:44:05Z  
**Total Test Files:** 23 passed (23 total)  
**Total Tests:** 201 passed (201 total)  
**Failures:** 0  
**Duration:** 2.37 seconds  

---

## 1. Test Suite Summary Table

| Test File | Package / App | Tests | Status | Key Coverage |
|---|---|---|---|---|
| `packages/domain/src/stage-activities.test.ts` | `@e3-eos/domain` | 5 | PASS | Canonical 312 Stage Activity Library ($13 \times 24$) |
| `apps/worker/src/worker.test.ts` | `@e3-eos/worker` | 1 | PASS | Outbox idempotent consumer (`AT-009`) |
| `packages/policy/src/policy.test.ts` | `@e3-eos/policy` | 6 | PASS | Four-eyes rule, delegation, policy compiler (`AT-003`-`AT-005`, `AT-020`) |
| `packages/domain/src/finance.test.ts` | `@e3-eos/domain` | 5 | PASS | 90,000 QAR EAC invariant & accrual shifts (`AT-066`) |
| `packages/domain/src/stage-graph.test.ts` | `@e3-eos/domain` | 6 | PASS | Acyclic schedule validation & stage repeat lineage (`AT-018`) |
| `packages/domain/src/rollout.test.ts` | `@e3-eos/domain` | 5 | PASS | Manifest parity check, compensating rollback, deployment gate (`AT-087`-`AT-089`) |
| `packages/domain/src/operations.test.ts` | `@e3-eos/domain` | 11 | PASS | Readiness gates, permit stamps, crew rest, logistics windows (`AT-059`-`AT-065`) |
| `packages/domain/src/portfolio-ai.test.ts` | `@e3-eos/domain` | 7 | PASS | Prompt injection defense, classification boundary, regional cells (`AT-080`-`AT-086`) |
| `tests/lifecycle-e2e.test.ts` | Monorepo root | 1 | PASS | Complete continuous 13-stage event lifecycle integration |
| `packages/domain/src/procurement.test.ts` | `@e3-eos/domain` | 12 | PASS | PO idempotency, framework ceiling, bank details 2-person rule (`AT-043`-`AT-048`) |
| `packages/domain/src/finance-reporting.test.ts` | `@e3-eos/domain` | 10 | PASS | Client report redactions, closeout dimensions, deterministic hashes (`AT-067`-`AT-079`) |
| `packages/domain/src/boq.test.ts` | `@e3-eos/domain` | 13 | PASS | Decimal arithmetic, margin floor, lump-sum decomposition (`AT-037`-`AT-040`) |
| `tests/load-performance.test.ts` | Monorepo root | 3 | PASS | High-concurrency EAC calculation, reservation collision, webhook HMAC |
| `apps/api/src/phase07.test.ts` | `@e3-eos/api` | 6 | PASS | Production rollout, 100-request load, multi-tenant isolation (`AT-087`-`AT-092`) |
| `apps/api/src/phase04.test.ts` | `@e3-eos/api` | 11 | PASS | Offline field sync, critical gates, decoupled venue signoff (`AT-055`-`AT-065`) |
| `apps/api/src/phase03.test.ts` | `@e3-eos/api` | 12 | PASS | Vendor bank changes, exclusive inventory collisions (`AT-043`-`AT-054`) |
| `apps/api/src/phase06.test.ts` | `@e3-eos/api` | 7 | PASS | Simulation live recheck, EVM physical progress, AI boundaries (`AT-080`-`AT-086`) |
| `apps/api/src/phase05.test.ts` | `@e3-eos/api` | 14 | PASS | Replay webhooks, ledger isolation, post-report credit notes (`AT-066`-`AT-079`) |
| `apps/api/src/phase02.test.ts` | `@e3-eos/api` | 9 | PASS | Design freeze, client portal quotes, change requests (`AT-032`-`AT-042`) |
| `apps/api/src/phase01.test.ts` | `@e3-eos/api` | 11 | PASS | Progressive intake completeness, lost tender closure (`AT-013`-`AT-031`) |
| `apps/web/src/web.test.ts` | `@e3-eos/web` | 23 | PASS | 7 workspace routes, view states, Arabic RTL, client redaction |
| `apps/api/src/api.test.ts` | `@e3-eos/api` | 20 | PASS | OpenAPI 3.1 docs, Health probes, M06 Governance, Approvals & Exceptions, Confirm Reservations |
| `tests/infrastructure.test.ts` | Monorepo root | 3 | PASS | DB transaction RLS isolation, audit store immutability |

---

## 2. Test Execution Output

```text
 RUN  v3.2.7 B:/PROJECTS/EOS

 ✓ apps/worker/src/worker.test.ts (1 test) 2ms
 ✓ packages/domain/src/stage-activities.test.ts (5 tests) 22ms
 ✓ packages/domain/src/finance.test.ts (5 tests) 7ms
 ✓ packages/policy/src/policy.test.ts (6 tests) 6ms
 ✓ packages/domain/src/stage-graph.test.ts (6 tests) 8ms
 ✓ packages/domain/src/rollout.test.ts (5 tests) 3ms
 ✓ packages/domain/src/operations.test.ts (11 tests) 7ms
 ✓ packages/domain/src/portfolio-ai.test.ts (7 tests) 9ms
 ✓ tests/lifecycle-e2e.test.ts (1 test) 9ms
 ✓ packages/domain/src/procurement.test.ts (12 tests) 10ms
 ✓ packages/domain/src/finance-reporting.test.ts (10 tests) 11ms
 ✓ packages/domain/src/boq.test.ts (13 tests) 12ms
 ✓ tests/load-performance.test.ts (3 tests) 137ms
 ✓ apps/api/src/phase07.test.ts (6 tests) 12ms
 ✓ apps/api/src/phase04.test.ts (11 tests) 11ms
 ✓ apps/api/src/phase03.test.ts (12 tests) 15ms
 ✓ apps/api/src/phase06.test.ts (7 tests) 13ms
 ✓ apps/api/src/phase05.test.ts (14 tests) 17ms
 ✓ apps/api/src/phase02.test.ts (9 tests) 19ms
 ✓ apps/api/src/phase01.test.ts (11 tests) 8ms
 ✓ apps/web/src/web.test.ts (23 tests) 156ms
 ✓ tests/infrastructure.test.ts (3 tests) 6ms
 ✓ apps/api/src/api.test.ts (20 tests) 69ms

 Test Files  23 passed (23)
      Tests  201 passed (201)
   Duration  2.37s
```
