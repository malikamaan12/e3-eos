# E3 EOS — Portfolio Resource and Capacity Planning

**Planning status:** proposed next major integration, revised 19 September 2026 to reflect E3's existing external systems. Live integration is deferred until EOS is ready. This document does not claim implementation or acceptance.

**Confirmed ownership:** E3 Rentals owns inventory, assets, stock availability and equipment reservations. E3 Purchase Management System / PurchaseTracker owns procurement and procurement vendors. EOS owns project demand, planning, internal coordination and the integrated user experience. Read this with `E3_EOS_Rentals_PurchaseTracker_API_Integration_Plan.md`; its ownership and deferred activation rules take precedence over earlier generic references to inventory or procurement services.

## 1. Purpose and relationship to the current build

The current Functional Integration and Lifecycle Validation brief establishes a reliable project journey: requirements, design, BOQ, sourcing, delivery, evidence, readiness and closeout. The next major capability should coordinate those journeys across all E3 projects sharing people, production capacity, assets and transport.

The intended outcome is a company-wide plan that identifies demand, available capacity, competing bookings and approved solutions before E3 commits resources or dates. It must distinguish potential tender demand from authorized delivery commitments.

Plan this phase now. Enable operational use incrementally once EOS and the relevant source-system contracts pass their acceptance checks. EOS may hold project demand, local drafts and clearly identified external projections. Inventory balances, physical asset identities, equipment bookings, procurement vendors and purchase commitments remain authoritative in their owning systems. Existing EOS screens should become integrated views and command entry points; reconcile any existing overlapping records before activating a connector.

## 2. What the integration connects

| Existing area | Information supplied | Planning use | Update returned after an authorized decision |
|---|---|---|---|
| Project and scope | Project dates, requirement quantities, zone/location allocations, owners, maturity and workflow version | Dated demand by project, package and location | Allocation coverage, shortages and affected dates |
| Design and Creative | Deliverables, revisions, estimated effort, skills and due dates | Designer and specialist workload | Assigned capacity slots and revised commitments |
| Production and QC | Work packages, routing steps, approved drawings, estimates and inspection needs | Workshop/team capacity and dependencies | Planned work slots and release conditions |
| E3 Rentals: warehouse and assets | Source inventory, reservations, condition, maintenance and custodial state | Time-dependent availability by compatible class and depot, with freshness | Reservation/reallocation requests through the Rentals adapter; confirmation comes from Rentals |
| Crew and operations | Personnel, skills, qualification validity, shifts, leave and policy constraints | Eligible staffing and cross-project conflict checks | Assignments through the existing roster service |
| Logistics and E3 Rentals fulfilment | Vehicle classes, source manifests, load constraints and transport windows | Dispatch/return capacity and travel buffers | EOS coordinates project delivery; Rentals retains custody/dispatch records it owns; settle remaining fleet ownership during discovery |
| PurchaseTracker: procurement and vendors | Procurement vendor records/status, sourcing alternatives, supplier lead times, quotes and commitments | Rental, purchase or subcontract resolution | Vendor onboarding, PR and supported order/amendment requests through PurchaseTracker's approved APIs |
| Finance and change control | Approved budgets, commitments, rates and variations | Cost and margin impact of an alternative | Proposed forecast changes and approved variations |
| My Work and approvals | Owners, tasks, decisions and service deadlines | Actionable shortage and conflict queues | Assigned resolution work and auditable decisions |
| Calendar and reporting | Project/venue windows and approved milestones | Portfolio timeline and management visibility | Consistent views of the approved resource plan |

Every demand and booking retains the same project, requirement, allocation, package and revision identity used by its source module. A calendar block is a view of a booking, not a separate authoritative reservation.

Users can initiate supported actions from EOS. Source-system authorization, compliance and commercial approval remain effective. A locally saved request or accepted background job is not proof of a source reservation, approved vendor or issued order. All source capabilities must be checked before enabling the corresponding EOS action.

## 3. Resource types and units

Treat each resource class according to its actual capacity. Do not combine unlike units into one misleading total.

| Resource class | Capacity basis | Main eligibility/availability checks |
|---|---|---|
| Designers, PMs and specialists | Working hours per person or qualified team | Work calendar, leave, skills, assigned work and utilization policy |
| Field crew | Dated shifts and working hours | Role, credentials, location, overlapping work, breaks and configured rest rules |
| Fabrication teams/work centres | Work hours by routing step, team or machine | Skills, operating calendar, throughput assumption, maintenance and prerequisite readiness |
| Serialized equipment | Individual units over time | Condition, location, inspection status, reservations and compatibility |
| Pooled stock | Quantity in a defined unit over time | On-hand balance, firm reservations, quarantine and replenishment |
| Vehicles and transport | Vehicle/time windows plus applicable load measures | Payload/volume where known, route/travel buffer, driver and dock access |
| Consumables | Stock quantity and expected replenishment | Consumption forecast, lead time and purchase status |
| External rental/subcontract supply | Confirmed quantity/capacity and delivery dates | Supplier acknowledgment, quote validity, lead time and approved commitment |

Tentative supplier availability must remain distinguishable from confirmed capacity. A proposed fabrication output or expected purchase receipt is future supply with a readiness condition, not immediately available warehouse stock.

## 4. Demand, holds and commitments

Use a separate planning state from the project's overall maturity:

| Planning state | Meaning | Capacity effect |
|---|---|---|
| Forecast demand | An opportunity or tender may require resources | Visible in forecasts; no firm reservation |
| Tentative hold | A named team/resource is proposed for a defined window | Displayed separately; expiry, priority and contention follow configured policy |
| Pending decision | Resource manager or other approver must decide | Proposed change remains visible; approved bookings stay authoritative |
| Confirmed reservation | Authorized capacity is committed | Reduces firm availability for its occupied window |
| In use | Custody, work or shift execution has begun | Actual use controls availability; an estimate must not release it automatically |
| Return/inspection pending | Physical use ended but release conditions remain | Availability follows inspection/return policy |
| Released/cancelled | Capacity has been formally released | Future occupancy is removed; history remains |

Project-specific workflow policy determines when a forecast can become a hold or confirmed reservation. Do not hard-code confirmation to a single numbered lifecycle stage. A legitimate early commitment can use the configured approval/exception route.

For equipment, EOS approval authorizes sending a request; Rentals alone establishes its authoritative hold/reservation and occupancy effect. A local tentative allocation is a planning intention until Rentals acknowledges it. PurchaseTracker establishes procurement business states. Keep these source states separate from EOS approval and connector delivery states.

Keep potential demand, tentative holds and confirmed occupancy in separate layers. If management uses probability-weighted forecasts, display the chosen assumptions and unweighted demand too. Weighted demand cannot establish that a specific resource is free.

## 5. Time and availability model

For physical assets, include preparation, packing, dispatch, transit, installation, event use, de-rig, return and required inspection/reset time. The occupied period can be longer than the public event dates.

For people, use actual daily work intervals, breaks and cross-project travel/rest constraints. A week-long project assignment does not mean a continuous week-long shift.

For production, plan routing steps and dependencies at their own work centres. Design approval, material availability and QC can constrain the delivery date even when workshop hours are available.

Store precise instants with an explicit location timezone and render the user's selected planning timezone. Define interval boundaries and buffer rules consistently; test adjacent bookings, overnight work and timezone changes. An unresolved date, duration or travel estimate must appear as an assumption or missing input.

For equipment, use Rentals' authoritative availability calculation for the requested occupied interval. Preserve the source check time, location, condition exclusions and reservations already attributed to this project. Do not subtract reservations or apply buffers a second time in EOS. Source-side atomic validation is required when committing; refreshing a cached preview cannot prevent a simultaneous booking through Rentals itself. For EOS-owned people/work-centre capacity, use the authoritative calendar and assignment service. Missing or stale upstream data produces Unknown/Stale availability and explains what needs refreshing.

## 6. Practical E3 scenario

Project A requires 20 registration counters: 12 in Zone A and 8 in Zone B. Its resource window includes preparation, transport, event use and return inspection. Twelve compatible, serviceable counters exist in the selected test depot. Project B already has four of those counters firmly reserved during an overlapping window.

The planner should show:

- Twelve serviceable counters in the pool.
- Four occupied by Project B during the relevant interval.
- Eight available for Project A from that pool.
- A shortfall of twelve against Project A's requirement of twenty.
- The source of every number and the exact conflicting time window.

The planner can propose an approved combination of internal stock, rental and fabrication, with quantity, responsible team, cost estimate, lead time and readiness conditions for each portion. It must check workshop/crew/transport implications as well as stock. Merely moving a resource card cannot remove those dependencies.

If Project B shifts its event date, calculate the affected reservations and notify the appropriate internal decision queue. Do not silently take already committed resources from Project A or rewrite supplier commitments. After a reviewed change is approved, update the authoritative reservations and affected forecasts consistently.

If Project A is cancelled, release eligible unstarted reservations and flag related purchase/rental commitments for the normal cancellation process. Released capacity and cancellation costs are different outcomes.

## 7. User workflow

1. **Generate demand.** Derive dated resource needs from approved scope, work packages, staffing and logistics plans. Allow reviewed planning assumptions while the scope is developing.
2. **Assess coverage.** Compare eligible internal and confirmed external supply with demand. Display allocated, uncovered, tentative and blocked quantities or effort.
3. **Review conflicts.** Identify the affected projects, resource windows, constraints, priority rules and responsible decision-makers.
4. **Compare alternatives.** Explore internal reallocation, approved substitutes, revised work slots, rental, purchase or subcontracting. Present incremental cost, timing, assumptions and approval needs.
5. **Approve the selected plan.** Use existing authority and change-control rules. Refresh availability before committing; reject or resolve a concurrent booking conflict.
6. **Execute through the owning systems.** EOS offers the working interface; Rentals records inventory/reservation/custody actions, PurchaseTracker records vendor and procurement actions, and the existing roster/production services record their assignments and work. Track external acknowledgments and failures in EOS.
7. **Reconcile the plan.** Late returns, actual hours, QC failures, delivery delays and approved scope revisions update availability and raise actionable exceptions.

An approved asset quantity is not the same as physical delivery. Show capacity coverage, execution progress and readiness as separate measures.

## 8. Required screens

### Portfolio Resource Planner

A day/week/month planning view with filters for project, resource class, department, skill, depot/location, planning state and country. Show available capacity, confirmed bookings, tentative holds, shortages and data freshness. Opening a booking reveals the source record, owner, quantities, exact time window and applicable constraints.

### Project Resource Plan

Within the existing project cockpit, show each requirement/package and its resource coverage. Support grouping by zone/location and department without duplicating the demand. Explain uncovered demand and link each allocation to its source booking.

### Department Capacity View

Design, fabrication, logistics and operations managers see required versus available capacity, deadlines, approved assignments and proposed alternatives. A team pool can receive estimated demand before an individual is selected, but execution must have the identity needed for the applicable safety and access checks.

### Conflict and Decision Queue

Use My Work and the existing approvals experience for unresolved shortages, expired holds, late returns, unavailable qualifications and pending reallocations. Show ownership, due date, severity, affected work and a direct action. Deduplicate repeated alerts for the same unresolved condition.

### Resource Record

Extend the existing personnel, asset, vehicle or work-centre detail where available. Show capabilities, calendars, current bookings, condition/qualification evidence, history and future commitments. Avoid creating an unrelated second resource directory.

For equipment and procurement vendors, display the source system, source reference, permitted source link and last verification time. An edit in EOS submits a source-system change request. Before connection, show Not connected or a clearly identified planning draft; imported/manual snapshots cannot display a Live badge.

Reuse the current E3 design system and navigation patterns. Make timelines accessible through a corresponding list/table view. Dragging proposes a change; visible success requires an accepted, persisted update.

## 9. Domain records and integration boundaries

Reuse existing entities where they already fulfill these roles:

- **Resource / resource pool:** type, unit, owning department, location and capabilities.
- **Capacity calendar:** working/available intervals, exceptions, policy version and source.
- **Demand:** project, requirement/allocation, package/revision, quantity or effort, need window and assumptions.
- **Reservation / assignment:** allocated resource/pool, demand link, occupied window, quantity, state and authoritative source.
- **Conflict:** overlapping or ineligible demand, evaluated versions, reason and resolution state.
- **Plan version / scenario:** proposed allocations, changed assumptions, cost/timing impacts and approval history.
- **Release/return condition:** the actual evidence or event needed before capacity becomes reusable.

These are conceptual roles, not a requirement to create seven new tables. Equipment resource and reservation records in EOS are projections/references to E3 Rentals. Procurement vendor and purchasing records are projections/references to PurchaseTracker. Demand, scenarios and local approval history belong to EOS. Staff and production assignments use their existing authoritative services. Maintain one writer for each business record; an EOS reservation table must not become a competing stock ledger.

Persist each EOS intent and its outbound work atomically in EOS. Rentals and PurchaseTracker commit their own transactions; no shared database transaction is assumed. Use durable commands, verified inbound events, stable external IDs, reconciliation and visible pending/unknown/failed states. Prevent booking races in Rentals, including requests originating outside EOS. Compensating cancellation follows the owning system's rules and may itself require approval.

Retain optimistic version checks for edits, audit events for approvals/reallocations and idempotency for retried commands. Updating a resource name or project display code must not break links.

## 10. Settings and authority

Manage configuration centrally, with effective dates and version history:

- Resource classes, units, locations, skills and compatible substitutions.
- Department work calendars, capacity assumptions and planning buffers.
- Tentative-hold expiry, contention rules and approved prioritization criteria.
- Allocation approval thresholds and project-specific workflow mappings.
- Applicable crew, qualification, maintenance and release constraints.
- Notification recipients, escalation timing, quiet hours and delivery channels.
- Optional AI provider/model and allowed planning-assistance operations.
- Deferred E3 Rentals and PurchaseTracker connections: environments, secret references, scopes, legal-entity/location mappings, supported actions, freshness and reconciliation settings.
- Optional calendar/HR connectors and their field ownership.

Project managers request resources; resource owners allocate within their authority; finance reviews applicable cost changes; HSE/operations validate relevant prerequisites; authorized executives resolve escalations under the configured policy. Map these responsibilities to E3's actual existing roles during implementation.

Authorized Super Admin changes and allowed overrides retain reason, scope, actor and evidence. Ordinary administrative access must not fabricate qualification, inspection or release evidence. Restrict personnel details and commercially sensitive rates by role; clients see only the approved project-facing commitments and effects.

## 11. Optional AI and external integrations

Start with deterministic demand, calendars and booking rules. AI assistance can later draft effort estimates, identify similar completed packages, summarize conflict impacts and explain proposed alternatives using cited internal records. It must expose assumptions and uncertainty and respect the same permissions as the user.

Users approve allocations, purchases, staffing and date changes through the normal workflow. An AI suggestion does not bypass those decisions.

External calendar integration is a later extension to the established capacity model. First select E3's actual calendar/HR systems, authoritative fields and permitted information flow. Importing a busy window can inform availability without copying confidential event descriptions. An external calendar event should not automatically become a purchase, crew qualification or inventory reservation.

All connector credentials, mappings, sync directions and job health belong in Settings. Retried syncs need stable external IDs and conflict handling. Payroll and accounting platform integration require a separate mapping decision once E3 identifies its systems of record.

Rentals and PurchaseTracker are confirmed integration targets. Their connections stay disabled until the later integration phase. Shared database access, if provided, may support approved read-only views or change feeds; business writes use source-owned APIs/services. AI can suggest sourcing options but cannot manufacture availability, onboard an approved vendor or issue an order.

## 12. Delivery sequence

| Increment | Scope | Exit evidence |
|---|---|---|
| 0. Prepare while EOS matures | Ownership, project demand, external-reference contracts and explicit disconnected UI; isolated fixtures only when needed | No duplicate inventory/vendor/procurement authority and no live connection implied |
| 1. Later: source discovery and visibility | Verified Rentals/PurchaseTracker contracts, shared IDs, mapped catalogs and read-only portfolio views | Two sandbox projects reconcile to source records and explain stale/unknown inputs |
| 2. Later: holds and reservations | Rentals-confirmed reservations, source approvals, concurrent booking checks, expiry and cancellation | Competing requests across EOS and Rentals cannot overbook; acknowledgments survive reload |
| 3. Design and workshop capacity | Effort estimates, skill/team calendars, production routing and design/material/QC dependencies | Feasible plans account for both capacity and prerequisite readiness |
| 4. Later: sourcing and commercial impact | Alternatives, scenarios, Rentals reallocation, PurchaseTracker vendor/PR/order commands and approved forecast changes | A shortage is resolved without duplicate scope, vendors, bookings or cost commitments |
| 5. Actuals and external availability | Late returns, actual work, schedule changes, dashboards and selected calendar/HR connector | The approved plan reconciles with execution, and sync failures remain visible |

Estimate effort after the integration inventory identifies reusable services, missing contracts and data quality. Do not commit delivery dates from screen count alone.

## 13. Acceptance scenarios

1. **Overlapping demand:** the twenty-counter scenario identifies eight available and twelve uncovered for the overlapping interval.
2. **Concurrency:** two managers simultaneously request the last available unit; only permitted capacity is confirmed and the other request gets a clear conflict.
3. **Soft versus firm:** a tentative tender hold is visible without being confused with a confirmed delivery booking; configured expiry is recorded and applied correctly.
4. **Multi-zone allocation:** one requirement split across zones has the correct aggregate quantity, with separate location coverage and no duplication.
5. **Different units:** person-hours, vehicle load measures and asset quantities remain separate and cannot be summed into a meaningless availability number.
6. **Full occupancy window:** an event ending on Friday does not make its assets available Saturday if return/inspection is scheduled for Sunday.
7. **Unknown supply:** an unconfirmed vendor promise or future fabrication output cannot count as ready internal stock.
8. **Capacity and dependencies:** free workshop hours do not imply a released production plan when the approved drawing or material is missing.
9. **Crew eligibility:** availability does not bypass the configured qualification, overlap, travel or rest checks.
10. **Revision impact:** a quantity increase or date shift produces a reviewed allocation/cost impact; existing approved commitments retain their history.
11. **Execution feedback:** a damaged return, missed delivery or delayed task updates affected availability and the resolution queue once, including on retries.
12. **Cancellation:** future eligible reservations are released, while committed procurement cancellation follows its own authority and commercial treatment.
13. **Stale data:** a failed upstream refresh produces a visible stale/unknown state and prevents false assurances of availability.
14. **Financial treatment:** resource reservations inform planning/forecasting according to the existing model; they do not create duplicate actual costs or duplicate PO commitments.
15. **Permissions:** planners see the authorized capacity view while restricted personnel details, vendor pricing and client-unshared information remain protected.
16. **Durability:** fresh-project allocations, approvals and histories survive refresh, another authorized session and an isolated application restart.
17. **External ownership:** changes made directly in Rentals or PurchaseTracker appear in EOS; EOS commands return the existing source record and cannot bypass source approval.
18. **Ambiguous completion:** a timeout after a source write is reconciled against its operation reference before any retry can create a second reservation, vendor or purchase request.
19. **Deferred mode:** disconnected connectors permit planning drafts while authoritative inventory/vendor/order actions remain unavailable; test data never appears as live stock.

## 14. Decisions to settle before implementation

Planning can proceed with configurable placeholders. Confirm these during the integration inventory, before assigning operational defaults:

- Which resource pools are managed centrally versus by project/department.
- Who owns booking priority, hold expiry, substitutions and cross-project reallocations.
- Existing authoritative staff/leave and workshop sources, plus remaining fleet ownership. Inventory ownership is already assigned to Rentals; procurement/vendor ownership is already assigned to PurchaseTracker.
- Actual Rentals/PurchaseTracker API contracts, service authentication, source-side idempotency/concurrency, internal-use equipment allocation, receiving handoff and current PO support.
- Current internal effort/rate standards, capacity assumptions and buffer rules, including how unknown estimates are labelled.
- Which project and resource classes enter the first rollout.
- Whether external calendar/HR integration is needed in this phase and which actual system is authoritative.

**Recommended first rollout:** continue EOS-owned design/fabrication planning and project demand now. In the later integration stage, pilot Rentals inventory visibility and PurchaseTracker vendor/PR visibility for two overlapping sandbox projects, then enable selected commands. Expand operational use after the conflict, persistence, permission and reconciliation scenarios pass.

The success measure is that a project manager can see an evidenced resource shortage, compare realistic options, obtain the correct decision and execute the approved allocation across EOS without maintaining separate spreadsheets of conflicting bookings.
