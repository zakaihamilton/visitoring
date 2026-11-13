import { MembersSkeleton } from "../SettingsLoading";
import { Suspense } from "react";
import { VisitoringDashboardFrame } from "@/app/components/VisitoringDashboardFrame";
import { listPerministerProjectMembers } from "@/lib/perminister";
import { requireAdmin } from "@/lib/auth";
import { SettingsPageIntro } from "../SettingsPageIntro";
import pageStyles from "../settings-page.module.css";
import { UsersManager } from "./UsersManager";
import { UserList } from "./components/UserList";
import type { ManagedUser } from "./user-types";

export const dynamic = "force-dynamic";

async function ProjectUsers({
  projectId,
  organizationId,
  currentUserId,
}: {
  projectId: string;
  organizationId: string;
  currentUserId: string;
}) {
  const members = await listPerministerProjectMembers(projectId, organizationId);
  const users: ManagedUser[] = members.map((member) => ({
    ...member,
    role: member.role === "admin" ? "admin" : "viewer",
  }));
  return <UserList users={users} currentUserId={currentUserId} />;
}

export default async function SettingsUsersPage() {
  const admin = await requireAdmin();

  return (
    <VisitoringDashboardFrame user={admin} active="users" title="Team members">
      <main className={pageStyles.page}>
        <SettingsPageIntro
          eyebrow="Settings · Users"
          title="Manage users"
          description="Add people to your project and control their access to its dashboard."
        />
        <UsersManager />
        <Suspense fallback={<MembersSkeleton />}>
          <ProjectUsers
            projectId={admin.projectId}
            organizationId={admin.organizationId}
            currentUserId={admin.id}
          />
        </Suspense>
      </main>
    </VisitoringDashboardFrame>
  );
}
