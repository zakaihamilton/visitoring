ALTER TABLE "workspaces" RENAME TO "projects";--> statement-breakpoint
ALTER TABLE "projects" RENAME CONSTRAINT "workspaces_pkey" TO "projects_pkey";--> statement-breakpoint
ALTER TABLE "sites" RENAME COLUMN "workspace_id" TO "project_id";--> statement-breakpoint
ALTER TABLE "site_events" RENAME COLUMN "workspace_id" TO "project_id";--> statement-breakpoint
ALTER TABLE "sites" RENAME CONSTRAINT "sites_workspace_id_workspaces_id_fk" TO "sites_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "site_events" RENAME CONSTRAINT "site_events_workspace_id_workspaces_id_fk" TO "site_events_project_id_projects_id_fk";--> statement-breakpoint
ALTER INDEX "workspaces_organization_idx" RENAME TO "projects_organization_idx";--> statement-breakpoint
ALTER INDEX "sites_workspace_idx" RENAME TO "sites_project_idx";--> statement-breakpoint
ALTER INDEX "site_events_workspace_time_idx" RENAME TO "site_events_project_time_idx";
