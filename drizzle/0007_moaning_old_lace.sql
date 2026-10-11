ALTER TABLE "workspaces" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "deletion_pending_at" timestamp with time zone;