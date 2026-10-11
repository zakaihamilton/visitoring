import type { ManagedUser } from "../user-types";
import { UserRow } from "./UserRow";
import pageStyles from "../../settings-page.module.css";
import styles from "../users.module.css";

export function UserList({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  return (
    <section
      className={`${pageStyles.card} ${styles.usersCard}`}
      aria-labelledby="workspace-users-title"
    >
      <div className={pageStyles.cardHeading}>
        <h2 id="workspace-users-title">Workspace members</h2>
        <span className={pageStyles.hint}>
          {users.length} account{users.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className={styles.introCopy}>
        Admins can manage sites and accounts. Viewers can access the dashboard.
      </p>
      <div className={styles.userList}>
        <div className={styles.userListHeader} aria-hidden="true">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {users.map((user) => (
          <UserRow key={user.id} user={user} currentUserId={currentUserId} />
        ))}
      </div>
      <p className={styles.footerNote}>
        User passwords are never shown here. Share new or reset passwords securely.
      </p>
    </section>
  );
}
