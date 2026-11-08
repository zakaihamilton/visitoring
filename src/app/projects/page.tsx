import { requireOrganizationProjects } from "@/lib/auth";
import { PerministerApiError } from "@/lib/perminister";
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

  return <ProjectsView projectsData={projectResult.projects} error={error} />;
}
