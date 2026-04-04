CREATE TYPE "public"."platform" AS ENUM('twitter', 'linkedin', 'facebook', 'instagram', 'tiktok');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'review', 'approved', 'scheduled', 'published', 'rejected');--> statement-breakpoint
CREATE TABLE "platform_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"oauth_tokens" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rate_limit_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"posting_schedule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_refresh" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"task_id" uuid,
	"platform" "platform" NOT NULL,
	"content_body" text NOT NULL,
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"approved_by" varchar(255),
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"engagement" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_platform_accounts_tenant" ON "platform_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_content_tenant" ON "content_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_content_status" ON "content_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_content_scheduled" ON "content_items" USING btree ("scheduled_at");
