import {
  deactivateUserAction,
  deleteUserAction,
  resetUserPasswordAction,
} from "../actions";
import type { ManagedUser } from "../user-types";
import { ReactivateUserForm } from "./ReactivateUserForm";
import { UserActionDialog } from "./UserActionDialog";
import { UserRoleForm } from "./UserRoleForm";
import styles from "../users.module.css";

export function UserRow({ user, currentUserId }: { user: ManagedUser; currentUserId: string }) {
  const isCurrentUser = user.id === currentUserId;

  return (
    <article className={styles.userRow}>
      <div className={styles.userIdentity}>
        <span className={styles.cellLabel}>User</span>
        <strong>{user.email ?? "No email on file"}</strong>
        {isCurrentUser ? <span className={styles.currentUser}>You</span> : null}
      </div>
      <div className={styles.userRole}>
        <span className={styles.cellLabel}>Role</span>
        {isCurrentUser ? (
          <span className={styles.roleText}>{user.role === "admin" ? "Admin" : "Viewer"}</span>
        ) : (
          <UserRoleForm user={user} />
        )}
      </div>
      <div className={styles.userStatus}>
        <span className={styles.cellLabel}>Status</span>
        <span className={user.isActive ? styles.activeStatus : styles.inactiveStatus}>
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className={styles.userActions}>
        <span className={styles.cellLabel}>Actions</span>
        {isCurrentUser ? (
          <span className={styles.selfNote}>Your own account can’t be changed here.</span>
        ) : (
          <div className={styles.actionList}>
            <UserActionDialog
              action={resetUserPasswordAction}
              user={user}
              triggerLabel="Reset password"
              title="Reset this user’s password?"
              description="They will be signed out everywhere and must use the new password the next time they sign in."
              confirmLabel="Reset password"
              tone="quiet"
              password
            />
            {user.isActive ? (
              <UserActionDialog
                action={deactivateUserAction}
                user={user}
                triggerLabel="Deactivate"
                title="Deactivate this workspace membership?"
                description="This user will lose access to this workspace until an admin reactivates their membership. Access to other workspaces is unchanged."
                confirmLabel="Deactivate user"
                tone="quiet"
              />
            ) : (
              <ReactivateUserForm user={user} />
            )}
            <UserActionDialog
              action={deleteUserAction}
              user={user}
              triggerLabel="Remove"
              title="Remove this user from the workspace?"
              description="This removes the user’s Visitoring access to this workspace. Their shared Perminister identity and access to other workspaces remain."
              confirmLabel="Remove user"
              tone="danger"
            />
          </div>
        )}
      </div>
    </article>
  );
}
