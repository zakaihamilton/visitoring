import { requireOrganizationProjects } from "@/lib/auth";
import { PerministerApiError } from "@/lib/perminister";
import { VisitoringDashboardFrame } from "@/app/components/VisitoringDashboardFrame";
import { ProjectsView } from "./ProjectsView";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ error?: string }> };

export default async function ProjectsPage({ searchParams }: Props) {
  const [projectResult, { error }] = await Promise.all([
    requireOrganizationProjects()
      .then((projects) => ({ projects }))
      .catch((error: unknown) => {
        if (error instanceof PerministerApiError && error.status >= 500) {
          return { projects: null };
        }
        throw error;
      }),
    searchParams,
  ]);

  const organizationContext = projectResult.projects
    ? {
        organizationId: projectResult.projects.organizationId,
        organizations: projectResult.projects.organizations,
        canManageOrganization: projectResult.projects.canManageProjects,
      }
    : undefined;

  return (
    <VisitoringDashboardFrame
      active="projects"
      title="Your projects"
      organizationContext={organizationContext}
    >
      <ProjectsView projectsData={projectResult.projects} error={error} />
    </VisitoringDashboardFrame>
  );
}
