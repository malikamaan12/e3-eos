# E3-EOS UAT Scenario Specification: Multi-Project Lifecycle & Strict Isolation

This document specifies the authoritative test scenario, parameters, test identities, requirement allocations, and verification gates for validating the complete E3-EOS project lifecycle on fresh, unpolluted project records.

---

## 1. Scenario Overview & Test Projects

To eliminate risk of demo-data pollution and establish rigorous isolation, the lifecycle validation executes two isolated projects created in the same deployment run (`RUN01`):

### Project A: Full 13-Stage Governed Lifecycle
- **Project Identifier / Code:** `EOS-UAT-LIFECYCLE-RUN01`
- **Project Title:** E3 Integration Test Client A — Celebration & Exhibition
- **Synthetic Client:** `E3 Integration Test Client A` (Organisation ID: `22222222-2222-4222-8222-222222222222`)
- **Event Venue:** `Test Venue Alpha`
- **Spatial Zones:**
  1. `Zone A / Main Event` (Stage, plenary seating, primary AV)
  2. `Zone B / Reception & Exhibition` (VIP lounge, registration, exhibition plinths)
- **Event Dates:** 3-day event duration (`2026-11-15` to `2026-11-17`, ~45 days from run initiation)
- **Tender Deadline:** `2026-10-01T13:00:00+03:00` (13:00 `Asia/Qatar` timezone)
- **Base Currency:** `QAR` (Qatari Riyal)
- **Workflow Template:** `STANDARD_THIRTEEN_STAGE_TEMPLATE` (13 canonical stages, full stage-gate governance)
- **Starting Revenue Baseline:** 101,500.00 QAR (100,000.00 base contract + 1,500.00 approved variation)

### Project B: Isolated Shorter Workflow Control
- **Project Identifier / Code:** `EOS-UAT-ISOLATION-RUN01`
- **Project Title:** Synthetic Client B — Corporate Forum
- **Synthetic Client:** `Synthetic Client B`
- **Event Venue:** `Test Venue Beta`
- **Spatial Zones:** `Conference Hall`
- **Event Dates:** 1-day event (`2026-11-20`)
- **Tender Deadline:** `2026-10-05` (Missing-time state explicitly preserved without synthetic defaults)
- **Base Currency:** `QAR`
- **Workflow Template:** `FAST_TRACK_FIVE_STAGE_TEMPLATE` (5-stage abbreviated lifecycle)
- **Starting Financial Baseline:** Authentic `0.00 QAR` (Zero baseline; unpolluted by Project A or demo fixtures)

---

## 2. 20 Logical Requirements (R01–R20) Scope Model

Project A incorporates 20 distinct logical requirements fulfilling the entire scope from intake to live delivery:

| ID | Requirement Title | Quantity & Unit | Location Allocation | Responsible Workstream | Sourcing & Acceptance Criteria |
|:---|:---|:---|:---|:---|:---|
| **R01** | Registration counters | 4 each | Zone A: 2<br>Zone B: 2 | Production + Logistics | 2 units from warehouse stock, 2 units custom fabricated; electronic POD signed with receiver & GPS. |
| **R02** | Modular stage deck | 48 m² | Zone A: 48 | Production | Approved build drawing, CNC package fabrication, physical installation QC passed. |
| **R03** | LED screen | 36 m² | Zone A: 36 | AV / Procurement | Sourced via rental PO, technical load test passed, 3-way matched. |
| **R04** | Audio system | 1 set | Zone A: 1 | AV / Procurement | Sourced via rental PO, acoustic test certificate approved. |
| **R05** | Lighting fixtures | 12 each | Zone A: 12 | AV / Procurement | Profile & wash fixtures, electrical PAT safety tested. |
| **R06** | Audience chairs | 80 each | Zone A: 80 | Logistics | Warehouse stock reservation, staged picking, dispatch, delivery POD, and post-event return. |
| **R07** | Display plinths | 6 each *(revised to 8)* | Zone B: 6 *(revised to 8)* | Production | 2 stock, 4 fabricated; Addendum ADD-01 tracks +2 delta with audit authority. |
| **R08** | Printed branding panels | 10 each | Zone A: 4<br>Zone B: 6 | Creative + Procurement | High-res vector artwork approved; print supplier output accepted without double counting. |
| **R09** | Cable protection ramps | 100 linear m | Zone A: 60<br>Zone B: 40 | Logistics / Site | Heavy-duty rubber ramps checked out of stock; trip-hazard inspection signed. |
| **R10** | Queue barriers | 20 each | Zone A: 8<br>Zone B: 12 | Logistics | Stanchions & ropes reserved from stock, zone-specific allocation verified. |
| **R11** | Counter-front graphics | 4 each | Zone A: 2<br>Zone B: 2 | Creative + Production | Graphic skins for R01 counters; linked to counters without duplicating physical assets. |
| **R12** | Coordinated 3D layout | 1 deliverable | Shared A+B | Design | Versioned 3D OBJ model & plan PDF with anchored annotations and client redaction. |
| **R13** | Site safety permit | 1 document | Shared A+B | HSE / Compliance | Qatar Civil Defence & Venue Site Safety Certificate; mandatory critical opening gate. |
| **R14** | Crew coverage | 16 person-shifts | Zone A: 8<br>Zone B: 8 | Operations | 10h max shift length; rest verified under versioned rest rules (11h E3 vs 14h Qatar Labour). |
| **R15** | Transport services | 2 trips | Shared A+B | Logistics | Curtain-sider manifests, electronic delivery sign-off with real SHA-256 hash. |
| **R16** | Commercial Registration (CR) | 1 document | Project-wide | Administration | Company legal document retrieved from reusable organizational vault (valid through 2027). |
| **R17** | Trade License evidence | 1 document | Project-wide | Administration | Valid operational license retrieved from vault; renewal leaves frozen packs intact. |
| **R18** | Audited financial statements | 2 annual docs | Project-wide | Finance / Tender | Synthetic FY2024 and FY2025 audited financial statements with controlled role access. |
| **R19** | Daily site reports (DSR) | 3 reports | Shared A+B | Site Operations | 1 report per event day with author stamp, weather/site log, and photographic attachments. |
| **R20** | Approved show run sheet | 6 cues | Zone A: 6 | Show Operations | Minute-by-minute cues; 1 simulated delay with downstream cue recalculation. |

---

## 3. Test Identities & Role Governance

| Test Identity | System Role | Assigned Responsibilities |
|:---|:---|:---|
| **Tariq Al-Ansari** | `project_director` | Overall project governance, opening authorization, commercial closeout sign-off. |
| **Fatima Al-Nuaimi** | `executive_producer` | Dual sign-off on show opening, exceptions acknowledgment, executive governance. |
| **Zaid Mansour** | `lead_producer` | Scope approvals, variation management, design revision authorizer. |
| **Rashid Al-Kuwari** | `field_supervisor` | Field Ops PWA offline inspection, delivery POD signing, asset checkout. |
| **Bilal Nasser** | `hse_officer` | Site safety inspection, R13 permit verification, crew fatigue compliance. |
| **Client Reviewer Alpha** | `client_representative` | Client portal review, milestone approval, zero-leak financial view. |

---

## 4. Key Verification Checkpoints

1. **CP01 — Intake & Timezone Preservation:** Create Project A and Project B; assert exact round-trip of `13:00 Asia/Qatar` on A and missing-time preservation on B.
2. **CP02 — Requirement Deduplication:** Verify R01 appears in both narrative and appendix but is extracted and approved as exactly 4 counters.
3. **CP03 — Sourcing Split:** Verify R01 is satisfied by 2 warehouse stock units + 2 fabrication PO units (total 4).
4. **CP04 — Three-Way Invoice Match:** Invoiced quantity > GRN received quantity triggers `exception_detected` and halts payment.
5. **CP05 — Rest Interval Governance:** Validate that an inter-shift rest of 12 hours passes under `POLICY-CREW-E3-INTERNAL-v1.0` (11h threshold) and fails under `POLICY-CREW-QATAR-LABOUR-v1.0` (14h threshold).
6. **CP06 — Authoritative Safety Gate:** With R13 unpassed, `authorizeOpening` throws HTTP 422 `OPENING_BLOCKED`. With R13 passed, opening succeeds with cryptographic `authHash`.
7. **CP07 — Offline Field Binding:** Enqueue an offline mutation on Project A; switch UI to Project B; assert queued mutation remains permanently bound to Project A.
8. **CP08 — Submission Pack Immutability:** Freeze pack containing R16–R18; renew R17 in company vault; assert frozen pack SHA-256 hash and version snapshot remain unaltered.
9. **CP09 — Section 8 Deterministic Finance:** Validate exact contract (101.5k), budget (71.2k), billed (60k), collected (45k), receivable (15k), unbilled (41.5k), actual (20k), accrued (5k), commitments (12k), ETC (8k), EAC (45k), VAC (26.2k), profit (56.5k), margin (55.67%).
10. **CP10 — Accrual Conversion:** Convert 5,000 QAR accrual to posted supplier invoice; assert EAC remains invariant at 45,000.00 QAR.
11. **CP11 — E3 Rentals Availability & Buffer Windows:** Execute bulk dated availability query via Rentals adapter; assert 24h prep + 24h return buffers applied; when Project B holds 4 of 12 counters, assert exactly 8 available for Project A with 12 shortfall against demand of 20.
12. **CP12 — E3 Rentals Idempotent Reservation Command:** Submit reservation request; assert HTTP 202 Accepted with stable `operationId`; assert duplicate retry with identical key returns cached operation; assert payload mutation with same key triggers HTTP 409 Conflict.
13. **CP13 — PurchaseTracker Vendor Search & Compliance Guard:** Query vendor master; verify compliance statuses; assert suspended vendor (`vnd-pt-003`) cannot initiate PR; assert name similarity without registration match triggers duplicate warning rather than automatic merge.
14. **CP14 — Deferred PO Creation Block:** Attempt direct purchase order issuance (`POST /api/v1/purchase-orders`); assert HTTP 501 Not Implemented with `PO_CREATION_DEFERRED` as PO creation capability is deferred in this phase.
15. **CP15 — 20-Counter Capacity Resolution Scenario:** Execute Portfolio Capacity Engine for 20 registration counters; assert resolution plan: 8 internal stock (warehouse) + 8 external hire (PurchaseTracker PR) + 4 custom fabrication (workshop) satisfying total demand of 20.
16. **CP16 — PostgreSQL Production Durability:** Verify that integration operations, demands, multi-sourcing scenarios, and conflict decisions persist directly to PostgreSQL 16 (Migration 0014) and survive container scaling, instance replacement, and process restart without local filesystem dependence.
17. **CP17 — Multi-Instance Optimistic Concurrency:** Verify that concurrent updates to project demands or sourcing scenarios submitting stale `expectedVersion` are rejected with HTTP 409 Conflict (`OPTIMISTIC_LOCK_CONFLICT`), preventing silent overwrites across stateless instances.
18. **CP18 — Multi-User Planning Handover:** Verify that a demand and multi-sourcing scenario authored by a Project Planner, along with assigned conflict ownership, persist in PostgreSQL and load identically when reopened by an Operations Director.
