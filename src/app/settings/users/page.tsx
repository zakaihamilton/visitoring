import { MembersSkeleton } from "../SettingsLoading";
import { Suspense } from "react";
import { Topbar } from "@/app/components/Topbar";
import { listPerministerWorkspaceMembers } from "@/lib/perminister";
import { requireAdmin } from "@/lib/auth";
import { SettingsNavigation } from "../SettingsNavigation";
import pageStyles from "../settings-page.module.css";
import { UsersManager } from "./UsersManager";
import { UserList } from "./components/UserList";
import type { ManagedUser } from "./user-types";

export const dynamic = "force-dynamic";

async function WorkspaceUsers({
  workspaceId,
  organizationId,
  currentUserId,
}: {
  workspaceId: string;
  organizationId: string;
  currentUserId: string;
}) {
  const members = await listPerministerWorkspaceMembers(workspaceId, organizationId);
  const users: ManagedUser[] = members.map((member) => ({
    ...member,
    role: member.role === "admin" ? "admin" : "viewer",
  }));
  return <UserList users={users} currentUserId={currentUserId} />;
}

export default async function SettingsUsersPage() {
  const admin = await requireAdmin();

  return (
    <>
      <Topbar user={admin} section="settings" />
      <SettingsNavigation active="users" />
      <main className={pageStyles.page}>
        <div className={pageStyles.intro}>
          <div>
            <div className={pageStyles.eyebrow}>Settings · Users</div>
            <h1>Manage users</h1>
            <p>Add people to your project and control their access to its dashboard.</p>
          </div>
        </div>
        <UsersManager />
        <Suspense fallback={<MembersSkeleton />}>
          <WorkspaceUsers
            workspaceId={admin.workspaceId}
            organizationId={admin.organizationId}
            currentUserId={admin.id}
          />
        </Suspense>
      </main>
    </>
  );
}
