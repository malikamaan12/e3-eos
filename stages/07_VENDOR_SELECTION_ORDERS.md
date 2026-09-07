# Stage 07: Vendor Selection and Orders

**Shared-control precedence:** This is an event-stage activity library, not a development phase or independent policy engine. The v1.0 shared configuration/data/API contracts govern. Task completion, acceptance, exception validity and review resolution remain separate. Every project can change this template through authorised versioned configuration; system administration alone is not unlimited financial or safety authority.
**Template ID:** E3-STAGE-07  
**Version:** 1.0, configurable template library consolidated for developer handover  
**Task library:** 24 suggested activities. Instantiate only applicable items, with explicit dispositions for required obligations.

## 1. Purpose

Translate approved scope into accountable supplier commitments without losing the connection to budget, technical version, delivery dates and acceptance. Support competitive RFQs, sole-source decisions, existing rate agreements, subcontractors and controlled urgent procurement.

## 2. Applicability and alternate routes

Use sourcing depth appropriate to the project and actual contract/policy. A small call-off can draw from an approved rate agreement; a complex structure can require technical/commercial comparison; a specialist sole-source requirement needs recorded rationale rather than fabricated competing quotations.

## 3. Inputs and progressive completeness

Package scope and specifications, authorised budget or limited release, delivery schedule, selected procurement policy, potential suppliers, local onboarding requirements and relevant parent agreements.

Missing information should have an owner, confidence/status and review date. Stage entry is controlled by the project's effective configuration, not by an unconditional system-wide gate.

## 4. Workspace and principal records

Vendor profile; qualification documents; RFQ and offer versions; technical/commercial comparison; selection decision; purchase request; PO/subcontract; commitment; delivery milestones; inspection/acceptance requirements; supplier communication log.

## 5. Suggested flow

```text
Requisition -> choose sourcing route -> issue RFQ or reference agreement
            -> evaluate offers -> select and authorise -> issue order
            -> acknowledge and track -> amend / cancel / escalate / receive
```

## 6. Editable activity library

Every instantiated activity also receives its project/package scope, owner, planned/forecast/actual dates, dependencies, evidence policy, reviewer, visibility and history. The proposed owner is a role, not a permanently assigned person.

| ID | Activity | Proposed owner | Completion output or evidence |
|---|---|---|---|
| S07-01 | Identify goods/services and package allocation | Package owner | Requisition with scope links. |
| S07-02 | Confirm current technical specification | Technical/package lead | Released specification or explicit limitation. |
| S07-03 | Confirm quantity, unit and delivery location | Procurement/package owner | Purchasable line definition. |
| S07-04 | Check budget authority and available allocation | Finance/procurement | Authorised budget position. |
| S07-05 | Select sourcing method | Procurement lead | Competition/agreement/sole-source decision. |
| S07-06 | Identify suitable vendors | Procurement | Vendor shortlist and basis. |
| S07-07 | Collect vendor onboarding and local documents | Procurement/compliance | Reviewed vendor record and gaps. |
| S07-08 | Issue controlled RFQ packages | Procurement | RFQ version and recipient list. |
| S07-09 | Record vendor questions and shared clarifications | Procurement/technical | Clarification history. |
| S07-10 | Receive offers with validity and exceptions | Procurement | Versioned offers and terms. |
| S07-11 | Review technical conformity | Technical evaluator | Conformity assessment. |
| S07-12 | Compare total delivered costs and exclusions | Procurement/finance | Comparable cost analysis. |
| S07-13 | Evaluate lead time, capacity and service risks | Procurement/operations | Delivery-risk assessment. |
| S07-14 | Record selection and negotiation outcome | Procurement lead | Selection memo and offer version. |
| S07-15 | Obtain purchase/commitment authorisation | Configured approvers | Authority linked to scope/value. |
| S07-16 | Create PO or subcontract with correct terms | Procurement | Controlled order/contract draft. |
| S07-17 | Issue order and confirm actual supplier receipt | Procurement | Issued document and receipt evidence. |
| S07-18 | Obtain supplier acknowledgement | Procurement | Confirmed dates/specifications or discrepancies. |
| S07-19 | Schedule delivery, inspection and payment milestones | Procurement/finance | Owned milestone plan. |
| S07-20 | Track production and promised delivery | Procurement/package lead | Supplier progress and forecast. |
| S07-21 | Control amendments and substitutions | Procurement/technical | Approved change/version. |
| S07-22 | Record cancellation, expediting or alternate sourcing | Procurement lead | Decision and commercial impact. |
| S07-23 | Link receipts/invoices to commitments | Finance/procurement | Matching and unresolved discrepancies. |
| S07-24 | Handover confirmed supplier scope to delivery teams | Procurement/PM | Authoritative order and contact package. |

## 7. Timing and dependency examples

Order dates depend on supplier lead time and the required accepted-on-site date, including testing/transport allowances. A purchase cannot be considered received because its promised date has passed. Partial deliveries, split locations and revised acknowledgements need separate states.

Calendar, lag, fixed-deadline protection and alternate dependency rules are project-configurable. A forecast change does not erase the approved baseline.

## 8. Approval opportunities and release controls

Sourcing-route decision; technical acceptance; vendor selection; purchase authority; contract signature; substitution/amendment; deposit/payment authorisation. The number of quotations, threshold and sequence are editable. Finance processing is not a substitute for commitment authority unless the configured matrix explicitly grants it.

A permitted configuration administrator may propose route, requiredness, severity or scope changes and request an internal exception. Publication and use follow protected current business authority, exact-version decisions, anti-self-downgrade and bounded consumption rules. No technical administrator role alone fabricates consent, accepted evidence or external authority. Historical exceptions remain visible; their follow-up can be properly closed.

## 9. Automation suggestions

Generate RFQ drafts from approved BOQ/package data; flag unallocated orders; compare offer exclusions; alert on expiring offers and late acknowledgements; show missing supplier documents; trigger receipt checks; hold potential duplicate orders for review; notify on commitment overrun.

Automations operate under permissions and the active policy version. They suggest or initiate controlled work; they do not manufacture evidence or silently issue external commitments.

## 10. Outputs and handover

Issued commitments, supplier acknowledgements, actual terms, forecast receipts, inspection plans, technical versions and cost allocations. Open commitments flow into the cost forecast; actual invoices consume or reconcile the relevant commitment rather than duplicate it.

## 11. Reporting and analysis

Committed versus authorised budget, offer comparison completeness, vendor lead-time performance, outstanding acknowledgements, procurement exposure by package, sole-source/exception decisions and overdue supplier documents.

## 12. Acceptance scenarios

1. A sole-source order can be authorised without inventing competing offers.
2. Replaying an issue request cannot create two external orders.
3. An amended specification identifies which POs need review.
4. Partial receipts retain the unreceived balance.
5. One PO allocated across packages sums to the source cost once.
6. A Super Admin one-order exception does not change all future sourcing rules.

## 13. Configuration and audit contract

This stage may be renamed, split, merged, skipped, repeated, reopened or run in parallel by an authorised configuration change. Its form fields, task selection, owners, deadlines, approvals, report sections and entry/exit conditions are editable by scope. Stable record IDs, version-linked decisions and actual history survive changes.

Use the shared [configuration and override specification](../specs/04_CONFIGURATION_APPROVALS_AND_EXCEPTIONS.md) and [data model](../specs/03_DATA_MODEL_AND_INVARIANTS.md). No deadline, approval threshold, person or country regulation in this stage is a hard-coded global policy.
