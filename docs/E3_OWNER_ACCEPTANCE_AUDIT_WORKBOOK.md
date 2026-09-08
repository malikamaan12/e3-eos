# E3-EOS v1.0.0 — Official Owner Acceptance Audit Workbook

**Document Reference:** `E3-EOS-UAT-WORKBOOK-v1.0.0-RC1`  
**Status:** **🟡 E3-EOS v1.0.0 RC1 — Engineering Complete, Code Frozen, Owner Acceptance Audit Ready**  
**Governing Standard:** `00_MASTER_DEVELOPER_HANDOVER.md`  
**System Access:**  
- **Web UI & PWA:** `http://localhost:3000` (Bridge: `http://localhost:3001`)  
- **Backend API:** `http://localhost:4000/api/v1/health`  
- **API Reference:** `http://localhost:4000/api/v1/docs`  

---

## 1. Audit Principles & Rules of Engagement

1. **RC1 Code Freeze:** Feature development is frozen. Developers will NOT assist testers during scenario execution. The software must be self-explanatory.
2. **True Business Testing:** This audit evaluates usability, resilience, and operational clarity, not simply code syntax.
3. **Primary Question:** At the end of testing, every participant must answer:  
   > **“Would you actually use EOS to manage your next live project?”**
4. **Defect Triage Standard:**
   - 🔴 **P0 (Production Blocker):** Security isolation failure, financial miscalculation, approval bypass, data loss, asset double-booking, or corrupted sync $\to$ **RC1 remains frozen until resolved.**
   - 🟠 **P1 (Launch Improvement):** Navigation confusion, excessive clicks, missing filter, layout inconvenience $\to$ **Scheduled for v1.0.x post-launch update.**
   - 🟢 **P2 (Enhancement):** Advanced analytics, aesthetic refinement, extra automation $\to$ **Scheduled for v1.1 roadmap.**

---

## 2. Participant Testing Roster

| Role | Target Participant | Primary Audit Focus | Assigned Scenarios |
| :--- | :--- | :--- | :---: |
| **Project Manager** | Lead Event PM | Full 13-stage lifecycle, tasks, overdue items | Scenario 1, 2, 4 |
| **Operations** | Head of Event Operations | Readiness score, safety permits, zone clearance | Scenario 2, 4 |
| **Finance** | Financial Controller | BOQs, PO commitments, invoice reconciliation, EAC | Scenario 1, 2, 3 |
| **Procurement** | Procurement Manager | Vendor RFQs, quote comparisons, purchase orders | Scenario 1, 2, 4 |
| **Design / Production** | Creative / Technical Director | CAD drawing versions, moodboards, fabrication orders | Scenario 1, 2, 4 |
| **Logistics & Fleet** | Yard / Warehouse Manager | Serialized asset dispatch, booking collisions, returns | Scenario 2, 3, 4 |
| **Marketing & Commercial**| Commercial Lead | Sponsorship tiers, ticketing inventory, public briefs | Scenario 3 |
| **Management / Executive**| Managing Director / Partner | Leadership portfolio dashboard, four-eyes approvals | Scenario 1, 2, 3, 4 |
| **System / Tech Owner** | IT / Security Lead | Tenant isolation, RBAC permissions, audit log | Scenario 1, 4 |
| **Field Tech / Supervisor**| On-site Operations Lead | Mobile PWA workflow, offline queue, sync recovery | Scenario 2, 4 |

---

## 3. Scenario 1: Qatar Tourism Tender (ATV Project)

### Purpose:
Verify whether EOS is intuitive and fast for commercial estimators and tender managers bidding on high-stakes institutional events.

### Step-by-Step Flow:
1. **New Project Setup:** Click `New Project`, select `Tender` classification, enter client details (*Qatar Tourism Authority*), set submission deadline.
2. **Tender Ingestion:** Upload tender RFP document; review extracted scope & requirements.
3. **Clarification Register:** Log a clarification query regarding ATV track safety barriers; set reminder.
4. **Site Visit Logistics:** Schedule site inspection activity in Stage 01; record site notes.
5. **BOQ & Costing:** Build initial pricing structure for track construction, lighting, and timing systems.
6. **Commercial Approval:** Route for internal four-eyes approval (CFO review).
7. **Submission Record:** Mark tender submitted; record final submission package hash.

### Intentional Disruption Checklist (Try to break it!):
- [ ] **Change the submission deadline** by 3 days mid-process $\to$ *Verify calendar updates and alerts propagate.*
- [ ] **Add a clarification query late** in the bid window $\to$ *Verify it does not block parallel BOQ work.*
- [ ] **Change the assigned PM** halfway through $\to$ *Verify permissions shift immediately and audit records the reassignment.*
- [ ] **Revise the BOQ after an approval request is pending** $\to$ *Verify pending approval is invalidated and re-approval required.*
- [ ] **Cancel an active approval request** $\to$ *Verify request ceases to block without orphan state.*
- [ ] **Mark one requirement item "Not Applicable"** $\to$ *Verify mandatory denominator updates correctly.*
- [ ] **Upload a replacement tender document** $\to$ *Verify previous version is retained in revision history.*

**Pass Condition:** The full audit history remains crystal clear, and the PM always knows exactly what requires attention.

---

## 4. Scenario 2: Oryx University Graduation

### Purpose:
Test the end-to-end event-delivery engine connecting:  
**Requirement $\to$ Design $\to$ Approval $\to$ Cost $\to$ Vendor $\to$ Production $\to$ Delivery $\to$ Evidence**

### Step-by-Step Flow:
1. **Client Brief & Onboarding:** Record brief for 3,500-seat outdoor ceremony.
2. **Creative Concept:** Upload stage moodboards and technical CAD drawings (Version 1).
3. **Client Portal Review:** Publish sanitized view to Client Portal; verify client login.
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
- [ ] **Attempt payment release before supervisor acceptance** $\to$ *Verify invoice matching is strictly blocked.*

---

## 5. Scenario 3: E3-Owned Event (InflataCity Festival)

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

## 6. Scenario 4: The Chaos Drill 🧨

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
- [ ] **Skipped work package:** Cancel VIP drone show due to airspace restriction $\to$ *Verify package marked skipped without corrupting portfolio metrics.*
- [ ] **Reopened closed task:** Reopen an electrical cabling task after snagging found a fault $\to$ *Verify readiness re-evaluates to blocked.*
- [ ] **Worker qualification revoked:** Safety officer revokes high-rigging credential $\to$ *Verify worker cannot be assigned to rigging shifts.*

---

## 7. Individual Usability Scorecard

Every participant must complete this scorecard independently:

**Tester Name:** _______________________  
**Assigned Role:** _______________________  
**Date:** ___ / ___ / 2026  

| Dimension | Question | Target | Your Score (1–10) | Notes / Friction Points |
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
| **12** | EOS materially reduces reliance on Excel and WhatsApp | **YES** | [ ] YES<br>[ ] NO | |

### The Litmus Test:
> **“Would you actually use EOS to manage your next live project?”**  
> [  ] **DEFINITELY YES**  
> [  ] **YES, WITH MINOR IMPROVEMENTS (P1)**  
> [  ] **NO, CRITICAL BLOCKERS REMAIN (P0)**  
> 
> *Key Reason:* _________________________________________________________________

---

## 8. Final Production Approval Protocol

Only upon successful completion of the Owner Acceptance Audit and clearance of all 10 Cloud Gates will the release status transition to:  
**`🟢 E3-EOS v1.0.0 — Production Approved`**

### Release Certificate Fields:
- **Version:** `v1.0.0`
- **Git Commit SHA:** `master 6036e35`
- **Deployment Environment:** Google Cloud Doha (`me-central2`)
- **UAT Date:** ___ / ___ / 2026
- **Open P0 Count:** 0 (Mandatory)
- **Open P1 Count:** ___ (Logged for v1.0.x)
- **Operations Sign-Off:** _______________________
- **Finance Sign-Off:** _______________________
- **Technical Sign-Off:** _______________________
- **Executive Management Approval:** _______________________
