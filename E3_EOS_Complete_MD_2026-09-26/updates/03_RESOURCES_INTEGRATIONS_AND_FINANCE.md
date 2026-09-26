# Resource demand, source integrations and financial control

## Project resource plan

Requirement/BOQ demand can create dated needs for equipment, labour, fabrication, transport and services. Each demand links project, allocation, quantity/unit, time interval, location, quality/specification, responsible owner, assumptions and approval version. Sourcing scenarios show internal, hire, purchase, subcontract or unresolved coverage with cost and lead-time assumptions.

Cross-project capacity views display possible overlap, priority and decision history. A simulated conflict is not proof of unavailable stock. Once E3 Rentals is connected, its authoritative availability/hold/reservation result determines confirmed equipment capacity. A source timestamp, source reference and pending/failed/confirmed state appear in EOS.

## External ownership

E3 Rentals owns catalog, serialized assets, availability, holds, reservations, warehouse movements and physical condition. PurchaseTracker owns procurement vendor master, onboarding and purchasing workflows. EOS may offer native project forms that call those systems through server-side adapters after activation. No direct writes into their production tables and no parallel authoritative vendor, stock or PO register.

Until then, adapters remain disabled and EOS records project demand and explicitly labelled local drafts. A draft vendor is not approved; a draft order is not issued; an assumed stock quantity is not confirmed. Connection, identity mapping, source API capabilities, command idempotency, webhook/reconciliation, credentials and failure handling require verification before enablement.

## Money and lifecycle

Track estimate, approved budget, client BOQ/price, commitment, forecast to complete/EAC, actual cost, invoiced amount, received amount and disputed/retained amount as distinct measures. Keep original budget and approved variations as versioned baselines. A 20% markup, 15% management fee or payment instalment from one quotation does not become EOS global policy. Tax, currency, exchange-rate source and rounding rules must be configured and reviewed per entity/contract.

Physical delivery can finish while receivables, supplier invoices, claims and finance review remain open. Reconcile PurchaseTracker commitments and accounting/payment authority using source IDs and timestamps. Never infer posted cost or payment from an EOS draft or invoice issue alone.

See `../references/E3_EOS_Portfolio_Resource_Capacity_Integration_Plan.md` and `../references/E3_EOS_Rentals_PurchaseTracker_API_Integration_Plan.md` for full contracts.
