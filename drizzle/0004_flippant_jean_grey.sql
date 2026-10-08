ALTER TABLE "workspaces" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
UPDATE "workspaces" SET "organization_id" = '660601f6-c1c3-42b0-9118-c2285d7659a3' WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "workspaces_organization_idx" ON "workspaces" USING btree ("organization_id");