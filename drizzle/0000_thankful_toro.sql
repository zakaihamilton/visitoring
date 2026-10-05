CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"source_id" varchar(160),
	"visitor_id" varchar(64) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"event_name" varchar(128) NOT NULL,
	"path" varchar(1024) NOT NULL,
	"referrer_host" varchar(253),
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"device" varchar(24),
	"browser" varchar(24),
	"os" varchar(24),
	"country" varchar(2),
	"region" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"allowed_domains" text[] DEFAULT '{}' NOT NULL,
	"site_key_hash" varchar(64) NOT NULL,
	"site_key_prefix" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(16) DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" ADD CONSTRAINT "rate_limit_buckets_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_events" ADD CONSTRAINT "site_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_events" ADD CONSTRAINT "site_events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_expiry_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_site_ip_idx" ON "rate_limit_buckets" USING btree ("site_id","ip_hash");--> statement-breakpoint
CREATE INDEX "rate_limit_window_idx" ON "rate_limit_buckets" USING btree ("window_started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "site_events_source_idx" ON "site_events" USING btree ("site_id","source_id");--> statement-breakpoint
CREATE INDEX "site_events_site_time_idx" ON "site_events" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE INDEX "site_events_workspace_time_idx" ON "site_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "site_events_site_name_time_idx" ON "site_events" USING btree ("site_id","event_name","created_at");--> statement-breakpoint
CREATE INDEX "site_events_site_visitor_idx" ON "site_events" USING btree ("site_id","visitor_id");--> statement-breakpoint
CREATE INDEX "site_events_site_session_idx" ON "site_events" USING btree ("site_id","session_id");--> statement-breakpoint
CREATE INDEX "sites_workspace_idx" ON "sites" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_workspace_email_idx" ON "users" USING btree ("workspace_id","email");