import { requireOrganizationWorkspaces } from "@/lib/auth";
import { PerministerApiError } from "@/lib/perminister";
import { ProjectsView } from "./ProjectsView";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ error?: string }> };

export default async function ProjectsPage({ searchParams }: Props) {
  const [workspaceResult, { error }] = await Promise.all([
    requireOrganizationWorkspaces()
      .then((workspaces) => ({ workspaces }))
      .catch((error: unknown) => {
        if (error instanceof PerministerApiError && error.status >= 500) {
          return { workspaces: null };
        }
        throw error;
      }),
    searchParams,
  ]);

  return <ProjectsView workspacesData={workspaceResult.workspaces} error={error} />;
}
