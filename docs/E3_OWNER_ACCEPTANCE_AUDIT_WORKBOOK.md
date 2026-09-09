# E3-EOS v1.0.0 — Official Owner Acceptance Audit (UAT) Workbook

**Document Reference:** `E3-EOS-UAT-WORKBOOK-v1.0.0-RC1`  
**Governing Standard:** `00_MASTER_DEVELOPER_HANDOVER.md` & `specs/10_DECISIONS_RISKS_AND_GO_LIVE.md §6`  

### Infrastructure & Data Residency Architecture:
* **Primary Data Region:** **Google Cloud Doha, Qatar (`me-central1`)**
* **Primary DR & Continuity:** **Intra-Qatar Regional HA + continuous Point-in-Time Recovery (PITR) + automated daily backups within `me-central1`**
* **Secondary Cross-Region DR:** **Optional — subject to explicit E3 security and client data-residency approval (Proposed target: `me-central2` Dammam, Saudi Arabia)**
* **Database Engine:** **Cloud SQL for PostgreSQL 17** *(Google-managed minor updates)*
* **Object Storage Security:** **Private regional bucket (`me-central1`) with Google-managed encryption and time-bounded signed URLs** *(CMEK positioned on post-launch security roadmap)*

### Current Release & Audit Status:
* **Automated Engineering Validation:** `COMPLETE` (246/246 tests, 27 suites, 0 TypeScript errors)
* **Automated Business Regression Suite:** `PASS` (`pnpm test:biz-regression`)
* **Local Pre-Cloud Release Gates:** `PASS (Local Baseline)`
* **GCP Staging Deployment:** `PENDING`
* **E3 Owner Human UAT:** `PENDING HUMAN EXECUTION ON STAGING`
* **Cloud Recovery / Destructive Gates:** `PENDING CLOUD EXECUTION`
* **Formal Release Status:** **`🟡 E3-EOS v1.0.0 RC1 — NOT YET PRODUCTION APPROVED`**

### Acceptance Venues & System Access:
* **Official UAT Environment (Mandatory for Acceptance):** **Google Cloud Staging (`me-central1`)**  
  *Evaluates realistic Cloud SQL latency, HTTPS secure cookies, IAM boundaries, mobile PWA cellular behavior, signed URLs, and Memorystore queues.*
* **Localhost Environment (`http://localhost:3000` / Port 4000):**  
  *Reserved strictly for preliminary walkthroughs, training dry-runs, and developer reproducibility. Does NOT constitute formal acceptance.*

---

## 1. Official Release Governance Flow

The sequence of progression to Production Approval is formally frozen:

```
RC1 CODE FREEZE
      │
      ▼
Provision GCP Staging (me-central1 — Doha)
      │
      ▼
Cloud Foundation Validation (Cloud Run / SQL / RLS / IAM / Secrets / Redis / Storage)
      │
      ▼
E3 HUMAN OWNER UAT on actual GCP Staging
      ├── P0 found → Fix → regression → re-test
      └── No P0
      │
      ▼
Cloud Recovery & Failure Drills (live backup/restore / outage simulation / monitoring)
      │
      ▼
Final Sign-Off (Operations / Finance / Technical-Security / Executive)
      │
      ▼
🟢 PRODUCTION APPROVED
```

---

## 2. Audit Principles & Rules of Engagement

1. **RC1 Strict Code Freeze:** Feature development is frozen. Developers will NOT assist or prompt testers during scenario execution. The software must stand on its own usability.
2. **Automated Regression vs Human UAT Distinction:**  
   > [!IMPORTANT]
   > Automated test scripts (`pnpm test:biz-regression`) prove that coded algorithms, mathematical balances, and invariant safeguards execute without crashing. **They DO NOT certify human usability, operational practicality, or user satisfaction.** Only real E3 personnel executing tasks through the UI can score usability and evaluate operational fit.
3. **The Core Question:** Every human participant must independently answer:  
   > **“Would you actually use EOS to manage your next live project, or would you still rely on Excel and WhatsApp?”**
4. **Defect Triage Standard:**
   - 🔴 **P0 (Production Blocker):** Security isolation failure, financial miscalculation, unapproved bypass, data loss, asset double-booking, or corrupted sync $\to$ **RC1 remains frozen until fixed and re-tested.**
   - 🟠 **P1 (Launch Improvement):** Navigation confusion, excessive clicks, missing filter, layout inconvenience $\to$ **Logged for v1.0.x post-launch maintenance.**
   - 🟢 **P2 (Enhancement):** Advanced analytics, aesthetic refinement, extra automation $\to$ **Scheduled for v1.1 roadmap.**

---

## 3. Participant Testing Roster & Responsibilities

Each tester must execute their assigned scenario(s) independently on the **GCP Staging environment**:

| Role | Target Participant | Primary Audit Focus | Assigned Scenarios |
| :--- | :--- | :--- | :---: |
| **Project Manager** | Lead Event PM | Full 13-stage lifecycle, tasks, overdue items, stage transitions | Scenario 1, 2, 4 |
| **Operations** | Head of Event Operations | Readiness score, safety permits, zone clearance, runbook drills | Scenario 2, 4 |
| **Finance** | Financial Controller | BOQs, PO commitments, invoice reconciliation, EAC tracking | Scenario 1, 2, 3 |
| **Procurement** | Procurement Manager | Vendor RFQs, quote comparisons, framework call-offs, PO cancellation | Scenario 1, 2, 4 |
| **Design / Production** | Creative / Technical Director | CAD drawing versions, moodboards, client approvals, fabrication orders | Scenario 1, 2, 4 |
| **Logistics & Fleet** | Yard / Warehouse Manager | Serialized asset dispatch, booking collisions, asset returns | Scenario 2, 3, 4 |
| **Marketing & Commercial**| Commercial Lead | Sponsorship tiers, ticketing inventory, public briefs, turnstile footfall | Scenario 3 |
| **Management / Executive**| Managing Director / Partner | Leadership portfolio dashboard, four-eyes approvals, margin governance | Scenario 1, 2, 3, 4 |
| **System / Tech Owner** | IT / Security Lead | Tenant isolation, RBAC permissions, audit log tamper-resistance | Scenario 1, 4 |
| **Field Tech / Supervisor**| On-site Operations Lead | Mobile PWA workflow, offline queue, sync recovery, photo snags | Scenario 2, 4 |

---

## 4. Scenario 1: Qatar Tourism Tender (ATV Project)

### Purpose:
Verify whether EOS is intuitive, fast, and transparent for commercial estimators and tender managers bidding on high-stakes institutional events.

### Step-by-Step Flow:
1. **New Project Setup:** Click `New Project`, select `Tender` classification, enter client details (*Qatar Tourism Authority*), set submission deadline.
2. **Tender Ingestion:** Upload tender RFP document; review extracted scope & requirements.
3. **Clarification Register:** Log a clarification query regarding ATV track safety barriers; set reminder.
4. **Site Visit Logistics:** Schedule site inspection activity in Stage 01; record site notes.
5. **BOQ & Costing:** Build initial pricing structure for track construction, lighting, and timing systems.
6. **Commercial Approval:** Route for internal four-eyes approval (CFO review).
7. **Submission Record:** Mark tender submitted; record final submission package hash.

### Intentional Disruption Checklist (Try to break it!):
- [ ] **Change the submission deadline** by 3 days mid-process $\to$ *Verify calendar updates and alerts propagate cleanly.*
- [ ] **Add a clarification query late** in the bid window $\to$ *Verify it does not block parallel BOQ work.*
- [ ] **Change the assigned PM** halfway through $\to$ *Verify permissions shift immediately and audit records the reassignment.*
- [ ] **Revise the BOQ after an approval request is pending** $\to$ *Verify pending approval is invalidated and re-approval required.*
- [ ] **Cancel an active approval request** $\to$ *Verify request ceases to block without orphan state.*
- [ ] **Mark one requirement item "Not Applicable"** $\to$ *Verify mandatory denominator updates correctly.*
- [ ] **Upload a replacement tender document** $\to$ *Verify previous version is retained in revision history.*

**Pass Condition:** The full audit history remains crystal clear, and the PM always knows exactly what requires attention.

---

## 5. Scenario 2: Oryx University Graduation

### Purpose:
Test the end-to-end event-delivery engine connecting:  
**Requirement $\to$ Design $\to$ Approval $\to$ Cost $\to$ Vendor $\to$ Production $\to$ Delivery $\to$ Evidence**

### Step-by-Step Flow:
1. **Client Brief & Onboarding:** Record brief for 3,500-seat outdoor ceremony.
2. **Creative Concept:** Upload stage moodboards and technical CAD drawings (Version 1).
3. **Client Portal Review:** Publish sanitized view to Client Portal; verify client login and margin redaction.
4. **Client Approval:** Record client sign-off on Main Stage design.
5. **Detailed BOQ Builder:** Price audio line array, curved LED backdrop, VIP seating, and carpeting.
6. **Procurement & POs:** Issue RFQ to audio suppliers; compare bids; dispatch PO to selected vendor.
7. **Production & Fabrication:** Track custom lectern and backdrop fabrication milestones.
8. **Logistics & Bump-In:** Dispatch equipment from warehouse; record arrival on site.
9. **Field Snagging & Readiness:** Complete pre-doors safety inspection; verify Civil Defence stamp.
10. **Event Run & Closeout:** Log live operations checklist; record bump-out completion and closeout report.

### Intentional Disruption Checklist:
- [ ] **Submit Design Revision V2 after V1 was approved** $\to$ *Verify V1 remains viewable and diff is highlighted.*
- [ ] **Simulate client rejecting a design** $\to$ *Verify feedback flows back to PM without corrupting budget.*
- [ ] **Replace an assigned supplier with alternative vendor** $\to$ *Verify old PO cancels cleanly via compensating entry.*
- [ ] **Increase BOQ quantity on site** $\to$ *Verify variation order triggers budget impact warning.*
- [ ] **Simulate delayed fabrication delivery** $\to$ *Verify schedule slippage alert appears on project cockpit.*
- [ ] **Attempt payment release before supervisor acceptance** $\to$ *Verify three-way invoice matching strictly blocks payment.*

---

## 6. Scenario 3: E3-Owned Event (InflataCity Festival)

### Purpose:
Prove that EOS functions seamlessly for self-promoted, internal investment events that lack an external client contract.

### Step-by-Step Flow:
1. **Investment Approval:** Create internal venture project; input projected investment (500,000 QAR).
2. **Commercial Modeling:** Enter projected revenue streams:
   - General Admission Tickets (30,000 visitors @ 35 QAR = 1,050,000 QAR)
   - Brand Sponsorship Packages (250,000 QAR)
   - Food & Beverage Concession Fees (150,000 QAR)
3. **Direct Procurement:** Issue purchase orders for custom inflatables, power generation, and security.
4. **Live Daily Operations:** Log daily ticket sales vs actual turnstile attendance.
5. **Concession Reconciliation:** Record vendor turnover percentages and utility chargebacks.
6. **Post-Event P&L Report:** Compare forecast contribution margin against final settled margin.

### Invariant Checks:
- [ ] Estimated vs fixed values clearly demarcated.
- [ ] Ticket sales vs turnstile attendance reconciliation does not corrupt revenue totals.
- [ ] Final settled margin accounts for all accrued and actual costs.

---

## 7. Scenario 4: The Chaos Drill 🧨

### Purpose:
Intentionally create operational chaos to verify that EOS adapts to real-world live event disruption without data corruption, silent overrides, or systemic lockup.

### Chaos Injections:
- [ ] **Venue changes abruptly:** Change event venue from DECC to Qatar National Convention Centre (QNCC) $\to$ *Check asset routing.*
- [ ] **Event date moves:** Shift event date 2 days forward $\to$ *Verify shift schedules and equipment reservations update.*
- [ ] **Emergency PM replacement:** Replace PM Tariq with PM Sarah mid-installation $\to$ *Verify handover integrity.*
- [ ] **Supplier cancels:** Primary generator supplier defaults 48 hours before doors $\to$ *Verify emergency subrental workflow.*
- [ ] **Double-booking collision:** Attempt to reserve the same 500kVA generator for another concurrent project $\to$ *Verify collision engine blocks.*
- [ ] **Internet loss on site:** Disconnect field device from network during inspection checklist $\to$ *Verify PWA queues actions offline.*
- [ ] **Stale offline data upload:** Reconnect device after server status updated $\to$ *Verify stale record rejected for review.*
- [ ] **Client changes design on site:** Request change order 24 hours before show $\to$ *Verify fast-track approval route.*
- [ ] **Urgent over-threshold PO:** Create emergency PO exceeding approval ceiling $\to$ *Verify two-person rule enforcement.*
- [ ] **Late permit stamp:** Civil Defence inspection pending while all other zones are 100% complete $\to$ *Verify venue opening remains blocked.*
- [ ] **Worker qualification revoked:** Safety officer revokes high-rigging credential $\to$ *Verify worker cannot be assigned to rigging shifts.*

---

## 8. Individual Human Usability Scorecards

> [!NOTE]
> Every tester must fill out their own scorecard on the GCP Staging system. Software cannot evaluate its own usability.

### Scorecard Template (1 Form per Participant)

**Tester Name:** ________________________________________  
**Department / Role:** ________________________________________  
**Scenario(s) Tested on Staging:** `[ ] Scenario 1` `[ ] Scenario 2` `[ ] Scenario 3` `[ ] Scenario 4`  
**Test Date:** _____ / _____ / 2026  

| Dimension | Usability Question | Target | Your Score (1–10) | Specific Notes / Friction Points / Confusion |
| :---: | :--- | :---: | :---: | :--- |
| **01** | I can understand what needs my immediate attention | $\ge 8$ | _____ / 10 | |
| **02** | I can onboard a project without technical help | $\ge 8$ | _____ / 10 | |
| **03** | I can understand overall project status quickly | $\ge 8$ | _____ / 10 | |
| **04** | I can identify blockers and overdue activities rapidly | $\ge 8$ | _____ / 10 | |
| **05** | Approval history and audit trail is clear and transparent | $\ge 9$ | _____ / 10 | |
| **06** | Design, drawing, and version history is clear | $\ge 9$ | _____ / 10 | |
| **07** | BOQ and financial controls make sense and feel intuitive | $\ge 8$ | _____ / 10 | |
| **08** | Procurement and supplier workflow feels practical | $\ge 8$ | _____ / 10 | |
| **09** | Site / mobile PWA workflow is practical and fast | $\ge 8$ | _____ / 10 | |
| **10** | Management portfolio dashboard is understandable | $\ge 8$ | _____ / 10 | |
| **11** | Final reporting information is easy to retrieve and export | $\ge 8$ | _____ / 10 | |
| **12** | EOS materially reduces reliance on Excel and WhatsApp | **YES** | `[ ] YES` `[ ] NO` | |

### The Litmus Question:
> **“Would you actually use EOS to manage your next live project?”**  
> `[ ] DEFINITELY YES`  
> `[ ] YES, WITH MINOR IMPROVEMENTS (P1)`  
> `[ ] NO, CRITICAL BLOCKERS REMAIN (P0)`  
> 
> *Key Reason / Honest Reaction:*  
> ____________________________________________________________________________________  
> ____________________________________________________________________________________  

### Defects Identified During Your Session:
| Defect # | Severity (P0 / P1 / P2) | Screen / Function | Description of What Happened vs What You Expected |
| :---: | :---: | :--- | :--- |
| **D-01** | `[ ] P0  [ ] P1  [ ] P2` | | |
| **D-02** | `[ ] P0  [ ] P1  [ ] P2` | | |
| **D-03** | `[ ] P0  [ ] P1  [ ] P2` | | |

**Tester Signature:** ________________________________________ **Date:** _____ / _____ / 2026  

---

## 9. Master Sign-Off Tracking Register (All Roles Required)

| Role | Named Participant | Staging Tested | Scorecard Submitted | Avg Usability Score | Litmus Result | Open P0s | Formal Sign-Off Signature |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Project Manager** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Operations** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Finance** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Procurement** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Design / Production** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Logistics & Fleet** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Marketing** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Management / MD** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **System / Tech Owner** | | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |
| **Field Tech / Supervisor**| | `[ ] Yes` | `[ ] Yes  [ ] No` | ___ / 10 | | ___ | _____________________ |

---

## 10. GCP Staging Deployment & Cloud Gate Validation Plan

Before production approval, RC1 must be deployed to Google Cloud Doha (`me-central1`) and the 10 release gates re-executed in cloud staging:

| Gate | Name | Staging Validation Test on GCP me-central1 | Responsible Owner | Result |
| :---: | :--- | :--- | :--- | :---: |
| **G01** | **Cloud Run Services** | Cloud Run API (`api.staging.e3-eos.com`) and Web Frontend verified on HTTPS. | Tech Lead | `PENDING` |
| **G02** | **Authority & RBAC** | Four-eyes approval tested across authenticated staging sessions. | Security Lead | `PENDING` |
| **G03** | **Physical RLS on Cloud SQL** | Cloud SQL for PostgreSQL 17 tested with physical RLS under `eos_app` role. | Tech Lead | `PENDING` |
| **G04** | **Cloud Security & Secrets** | Secret Manager verified; zero credentials in container images or environment. | DevOps Lead | `PENDING` |
| **G05** | **Memorystore Redis** | Multi-worker concurrency on Cloud Run with Memorystore Redis 7.2. | QA Lead | `PENDING` |
| **G06** | **External Adapters** | Real outbound network egress to external APIs or mock fallbacks verified. | Integrations Lead | `PENDING` |
| **G07** | **Live Backup & Restore** | **Real Cloud SQL automated export created, test table dropped, database restored, parity verified.** | DevOps Lead | `PENDING` |
| **G08** | **Offline Mobile Field Test** | Field PWA tested on real mobile devices under airplane mode against staging. | Field Lead | `PENDING` |
| **G09** | **Private Storage & Signed URLs**| Private Cloud Storage bucket (`me-central1`) with Google-managed encryption and signed URLs. | Data Owner | `PENDING` |
| **G10** | **Cloud Logging & Alerts** | Cloud Monitoring dashboards, error reporting, and alert policies active. | Operations Lead | `PENDING` |

---

## 11. Final Release Certificate (Template for Production Sign-Off)

> [!CAUTION]
> This certificate CANNOT be executed until both Human UAT on Staging and GCP Cloud Recovery Gates are 100% complete.

```
================================================================================
          E3 ENTERPRISE EVENT OPERATING SYSTEM (E3-EOS) v1.0.0
                       OFFICIAL RELEASE CERTIFICATE
================================================================================
Release Status:          🟡 RC1 — NOT YET PRODUCTION APPROVED
Git Commit Baseline:     master [COMMIT_SHA]
Primary Deployment:      Google Cloud Platform — Doha Region (me-central1)
Primary DR & Resilience: Intra-Qatar Regional HA + PITR + Backups (me-central1)
Secondary Cross-Region:  Optional me-central2 Dammam (Subject to E3 Data Residency Approval)
Database Engine:         Cloud SQL for PostgreSQL 17 (me-central1)
Cache & Queue Engine:    Memorystore Redis 7.2 (me-central1)
Primary Object Storage:  Google Cloud Storage (me-central1) — Private + Signed URLs

Audit Prerequisites:
[ ] Automated Business Regression: PASS (pnpm test:biz-regression)
[ ] Local Pre-Cloud Gates:         PASS (Verification Matrix 92/92, 0 TypeScript Errors)
[ ] E3 Human Owner UAT:            PENDING HUMAN COMPLETION ON STAGING (Target: All Scores >= 8/10)
[ ] GCP Staging Cloud Gates:       PENDING (Cloud SQL RLS, Real Backup Restore in me-central1)

Mandatory Defect Ceilings:
- Open P0 (Production Blockers):  0 (Mandatory Zero Tolerance)
- Open P1 (Launch Improvements):  <= 5 (Scheduled for v1.0.x maintenance window)

Required Executive Sign-Offs:
[ ] Operations Sign-Off:           __________________________  Date: __/__/2026
[ ] Finance & Commercial Sign-Off: __________________________  Date: __/__/2026
[ ] Technical & Security Sign-Off: __________________________  Date: __/__/2026
[ ] Executive Management Approval: __________________________  Date: __/__/2026
================================================================================
```
