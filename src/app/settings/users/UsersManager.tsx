"use client";

import pageStyles from "../settings-page.module.css";
import { CreateUserForm } from "./components/CreateUserForm";
import { UserList } from "./components/UserList";
import type { ManagedUser } from "./user-types";

export function UsersManager({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: ManagedUser[];
}) {
  return (
    <>
      <section className={pageStyles.card} aria-labelledby="add-user-title">
        <div className={pageStyles.cardHeading}>
          <h2 id="add-user-title">Add a user</h2>
          <span className={pageStyles.hint}>
            Access is granted to this workspace; Perminister manages the shared identity.
          </span>
        </div>
        <CreateUserForm />
      </section>
      <UserList users={users} currentUserId={currentUserId} />
    </>
  );
}
