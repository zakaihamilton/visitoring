CREATE TABLE "auth_rate_limit_buckets" (
	"bucket_key" varchar(64) PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_rate_limit_window_idx" ON "auth_rate_limit_buckets" USING btree ("window_started_at");