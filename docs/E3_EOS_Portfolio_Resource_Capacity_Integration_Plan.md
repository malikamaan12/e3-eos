# E3 EOS — Portfolio Resource and Capacity Planning (Integration Plan)

> **Specification Reference Notice:**  
> This file is the canonical alias for `docs/E3_EOS_Portfolio_Resource_Capacity_Planning.md`.  
> Both filenames refer to the exact same E3 EOS Portfolio Resource and Capacity Planning specification approved on 19 September 2026.

Please refer to the authoritative specification document:
- [E3 EOS — Portfolio Resource and Capacity Planning](file:///b:/PROJECTS/EOS/docs/E3_EOS_Portfolio_Resource_Capacity_Planning.md)

---

## Executive Summary & Alignment

- **Scope:** Cross-project resource coordination across people (designers, PMs, field crew), fabrication work centres, equipment (serialized units, pooled stock), transport fleet, and external procurement.
- **Authority Separation:**
  - **E3 Rentals** is authoritative for equipment catalog, serialized assets, stock balances, dated availability, buffer windows, and warehouse custody.
  - **E3 PurchaseTracker** is authoritative for procurement vendor onboarding, compliance, PR authorization, and purchase orders.
  - **EOS** provides project demand lineage, location allocations, local draft authoring, source-linked projections, and integrated user actions.
- **Core Planning States:** Forecast demand, Tentative hold, Pending decision, Confirmed reservation, In use, Return/inspection pending, Released/cancelled.
- **Canonical 20-Counter Sourcing Scenario:** 12 in pool, 4 booked by Project B, 8 available for Project A, 12 shortfall; resolved as 8 internal stock + 8 external hire + 4 workshop fabrication.
- **Disconnected Phase Rule:** External connections to Rentals and PurchaseTracker remain disabled. EOS provides durable offline planning, local drafts, and honest disconnected badging without fabricating external confirmations.
