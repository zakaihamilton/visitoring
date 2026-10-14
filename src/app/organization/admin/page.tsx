import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { Topbar } from "@/app/components/Topbar";
import { requireOrganizationAdmin } from "@/lib/auth";
import { ProjectManager } from "@/app/projects/ProjectManager";
import type { ManagedProject } from "@/app/projects/project-types";
import styles from "@/app/projects/projects.module.css";

export const dynamic = "force-dynamic";

function getManagedProjectRows(organizationId: string) {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      archivedAt: workspaces.archivedAt,
      deletionPendingAt: workspaces.deletionPendingAt,
    })
    .from(workspaces)
    .where(eq(workspaces.organizationId, organizationId))
    .orderBy(asc(workspaces.name));
}

async function ManagedProjectsSection({ organizationId }: { organizationId: string }) {
  const projects = await getManagedProjectRows(organizationId);
  const managedProjects: ManagedProject[] = projects.map((project) => ({
    ...project,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    deletionPendingAt: project.deletionPendingAt?.toISOString() ?? null,
  }));

  return <ProjectManager projects={managedProjects} />;
}

function ProjectsLoading() {
  return (
    <section className={styles.manager} aria-busy="true">
      <div className={styles.managerHeading}>
        <div>
          <div className="eyebrow">Organization administration</div>
          <h1>Manage Visitoring projects</h1>
          <p>Loading project controls…</p>
        </div>
      </div>
    </section>
  );
}

export default async function OrganizationAdminPage() {
  const admin = await requireOrganizationAdmin();

  return (
    <>
      <Topbar user={admin} section="organization-admin" />
      <main className={styles.adminPage}>
        <Suspense fallback={<ProjectsLoading />}>
          <ManagedProjectsSection organizationId={admin.organizationId} />
        </Suspense>
      </main>
    </>
  );
}
