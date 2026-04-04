CREATE TYPE "public"."agent_role" AS ENUM('email-filter', 'social-post', 'seo-optimize', 'content-gen', 'blog-writer', 'sensor-monitor', 'climate-control', 'irrigation', 'engagement-monitor', 'ops-engineer', 'custom');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('idle', 'working', 'degraded', 'error', 'stalled', 'unreachable', 'dead', 'paused');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('error', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."approval_workflow" AS ENUM('auto', 'manual', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."server_status" AS ENUM('online', 'degraded', 'offline');--> statement-breakpoint
CREATE TYPE "public"."sla_tier" AS ENUM('basic', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('queued', 'active', 'approval', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('social-post', 'email-batch', 'seo-audit', 'blog-draft', 'content-gen', 'sensor-read', 'engagement-pull', 'custom');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "agent_role" NOT NULL,
	"status" "agent_status" DEFAULT 'idle' NOT NULL,
	"current_task_id" uuid,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_heartbeat" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"source" varchar(255) NOT NULL,
	"agent_id" uuid,
	"server_id" uuid,
	"tenant_id" uuid,
	"message" text NOT NULL,
	"details" text,
	"acknowledged" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heartbeats" (
	"time" timestamp with time zone DEFAULT now() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" "agent_status" NOT NULL,
	"cpu_percent" real NOT NULL,
	"memory_percent" real NOT NULL,
	"task_counter" integer NOT NULL,
	"queue_depth" integer NOT NULL,
	"current_task_id" uuid,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"hostname" varchar(255) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"region" varchar(100) DEFAULT 'local' NOT NULL,
	"status" "server_status" DEFAULT 'offline' NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_seen" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agent_id" uuid,
	"type" "task_type" NOT NULL,
	"status" "task_status" DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"estimated_duration" integer,
	"actual_duration" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outputs" jsonb,
	"execution_log" text,
	"cost" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"brand_voice_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approval_workflow" "approval_workflow" DEFAULT 'hybrid' NOT NULL,
	"sla_tier" "sla_tier" DEFAULT 'basic' NOT NULL,
	"pricing_tier" varchar(50) DEFAULT 'starter' NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agents_server" ON "agents" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "idx_agents_tenant" ON "agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_agents_status" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_alerts_severity" ON "alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_alerts_created" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_heartbeats_agent" ON "heartbeats" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_heartbeats_tenant" ON "heartbeats" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_tenant" ON "tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_agent" ON "tasks" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "tasks" USING btree ("priority");