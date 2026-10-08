import { asc, eq } from "drizzle-orm";
import { Topbar } from "@/app/components/Topbar";
import { db } from "@/db";
import { users } from "@/db/schema";
import { listPerministerWorkspaceMembers, usesPerministerAuth } from "@/lib/perminister";
import { requireAdmin } from "@/lib/auth";
import { SettingsNavigation } from "../SettingsNavigation";
import pageStyles from "../settings-page.module.css";
import { UsersManager } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function SettingsUsersPage() {
  const admin = await requireAdmin();
  const centralAuth = usesPerministerAuth();
  const members = centralAuth
    ? await listPerministerWorkspaceMembers(admin.workspaceId)
    : await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.workspaceId, admin.workspaceId))
        .orderBy(asc(users.email));

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
          workspaceSlug={admin.workspaceSlug}
          centralAuth={centralAuth}
          users={members.map((member) => ({
            ...member,
            role: member.role === "admin" ? "admin" : "viewer",
          }))}
        />
      </main>
    </>
  );
}
