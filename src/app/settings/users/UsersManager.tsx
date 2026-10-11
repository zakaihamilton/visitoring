import pageStyles from "../settings-page.module.css";
import { CreateUserForm } from "./components/CreateUserForm";

export function UsersManager() {
  return (
    <section className={pageStyles.card} aria-labelledby="add-user-title">
      <div className={pageStyles.cardHeading}>
        <h2 id="add-user-title">Add a user</h2>
        <span className={pageStyles.hint}>
          Access is granted to this workspace; Perminister manages the shared identity.
        </span>
      </div>
      <CreateUserForm />
    </section>
  );
}
