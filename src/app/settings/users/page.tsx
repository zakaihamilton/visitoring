import { Topbar } from "@/app/components/Topbar";
import { listPerministerWorkspaceMembers } from "@/lib/perminister";
import { requireAdmin } from "@/lib/auth";
import { SettingsNavigation } from "../SettingsNavigation";
import pageStyles from "../settings-page.module.css";
import { UsersManager } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function SettingsUsersPage() {
  const admin = await requireAdmin();
  const members = await listPerministerWorkspaceMembers(admin.workspaceId);

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
        <UsersManager
          currentUserId={admin.id}
          users={members.map((member) => ({
            ...member,
            role: member.role === "admin" ? "admin" : "viewer",
          }))}
        />
      </main>
    </>
  );
}
