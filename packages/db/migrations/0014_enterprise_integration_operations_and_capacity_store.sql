-- Migration: 0014_enterprise_integration_operations_and_capacity_store.sql
-- Purpose: Durable relational persistence for E3 Rentals/PurchaseTracker operations,
-- project resource demands, sourcing scenarios, and capacity conflict decisions.

CREATE TABLE IF NOT EXISTS "integration_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" text DEFAULT 'tenant-e3-default' NOT NULL,
	"project_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"action" text NOT NULL,
	"idempotency_key" text NOT NULL UNIQUE,
	"payload_hash" text NOT NULL,
	"operation_state" text NOT NULL,
	"business_state" text NOT NULL,
	"source_record" jsonb,
	"error_detail" text,
	"status_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_resource_demands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" text DEFAULT 'tenant-e3-default' NOT NULL,
	"project_id" text NOT NULL,
	"requirements" jsonb NOT NULL,
	"assumptions" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_sourcing_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" text DEFAULT 'tenant-e3-default' NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"demand_id" text,
	"allocations" jsonb NOT NULL,
	"cost_breakdown" jsonb NOT NULL,
	"readiness_conditions" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "capacity_conflict_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" text DEFAULT 'tenant-e3-default' NOT NULL,
	"project_id" text NOT NULL,
	"conflict_ref" text NOT NULL,
	"resource_pool_id" text NOT NULL,
	"assigned_owner" text,
	"resolution_action" text,
	"rationale" text,
	"status" text DEFAULT 'unresolved' NOT NULL,
	"decided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
