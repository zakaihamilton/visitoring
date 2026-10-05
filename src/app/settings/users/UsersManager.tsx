"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { UserActionState } from "./actions";
import {
  changeUserRoleAction,
  createUserAction,
  deactivateUserAction,
  deleteUserAction,
  reactivateUserAction,
  resetUserPasswordAction,
} from "./actions";
import pageStyles from "../settings-page.module.css";
import styles from "./users.module.css";

type ManagedUser = {
  id: string;
  email: string;
  role: "admin" | "viewer";
  isActive: boolean;
};

type UserAction = (previousState: UserActionState, formData: FormData) => Promise<UserActionState>;

const initialState: UserActionState = { message: "" };

function ActionFeedback({ state }: { state: UserActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={state.error ? styles.errorMessage : styles.successMessage}
      role={state.error ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

function CreateUserForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingRef = useRef(false);
  const [role, setRole] = useState<"admin" | "viewer">("viewer");

  useEffect(() => {
    if (pendingRef.current && !pending && !state.error && state.message) {
      formRef.current?.reset();
      setRole("viewer");
    }
    pendingRef.current = pending;
  }, [pending, state.error, state.message]);

  return (
    <form action={action} className={styles.createForm} ref={formRef}>
      <div className={styles.field}>
        <label htmlFor="new-user-email">Email</label>
        <input
          id="new-user-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          placeholder="person@example.com"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="new-user-password">Initial password</label>
        <input
          id="new-user-password"
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={1024}
          autoComplete="new-password"
          aria-describedby="new-user-password-help"
        />
        <small id="new-user-password-help" className={styles.helpText}>
          At least 12 characters. Share it securely; they sign in to “{workspaceSlug}”.
        </small>
      </div>
      <div className={styles.field}>
        <label htmlFor="new-user-role">Role</label>
        <select
          id="new-user-role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.currentTarget.value as "admin" | "viewer")}
        >
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button type="submit" className="button buttonPrimary" disabled={pending}>
        {pending ? "Adding…" : "Add user"}
      </button>
      <div className={styles.formFeedback}>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

function RoleForm({ user }: { user: ManagedUser }) {
  const [state, action, pending] = useActionState(changeUserRoleAction, initialState);
  const [role, setRole] = useState<"admin" | "viewer">(user.role);
  const roleId = `role-${user.id}`;

  useEffect(() => setRole(user.role), [user.role]);

  return (
    <form action={action} className={styles.roleForm}>
      <input type="hidden" name="userId" value={user.id} />
      <label className={styles.screenReaderOnly} htmlFor={roleId}>
        Role for {user.email}
      </label>
      <select
        id={roleId}
        name="role"
        value={role}
        onChange={(event) => setRole(event.currentTarget.value as "admin" | "viewer")}
        disabled={pending}
      >
        <option value="viewer">Viewer</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" className="button buttonQuiet" disabled={pending || role === user.role}>
        {pending ? "Saving…" : "Save"}
      </button>
      <div className={styles.formFeedback}>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

function UserActionDialog({
  action,
  user,
  triggerLabel,
  title,
  description,
  confirmLabel,
  tone,
  password = false,
}: {
  action: UserAction;
  user: ManagedUser;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "quiet" | "danger";
  password?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingRef = useRef(false);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (pendingRef.current && !pending) {
      setShowFeedback(true);
      if (!state.error && state.message) {
        formRef.current?.reset();
        setOpen(false);
      }
    }
    pendingRef.current = pending;
  }, [pending, state.error, state.message]);

  const closeDialog = () => {
    formRef.current?.reset();
    setOpen(false);
    setShowFeedback(false);
  };

  return (
    <div className={styles.actionDialogRoot}>
      <button
        type="button"
        className={`button ${tone === "danger" ? "buttonDanger" : "buttonQuiet"}`}
        aria-haspopup="dialog"
        onClick={() => {
          setShowFeedback(false);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.confirmDialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => setOpen(false)}
      >
        <form action={formAction} ref={formRef}>
          <input type="hidden" name="userId" value={user.id} />
          <h3 id={`${id}-title`} className={styles.confirmTitle}>
            {title}
          </h3>
          <p id={`${id}-description`} className={styles.confirmCopy}>
            {description}
          </p>
          {password ? (
            <div className={`${styles.field} ${styles.dialogPassword}`}>
              <label htmlFor={`${id}-password`}>New password</label>
              <input
                id={`${id}-password`}
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={1024}
                autoComplete="new-password"
                autoFocus
              />
              <small className={styles.helpText}>At least 12 characters.</small>
            </div>
          ) : null}
          {open && showFeedback ? <ActionFeedback state={state} /> : null}
          <div className={styles.confirmActions}>
            <button
              type="button"
              className="button buttonQuiet"
              autoFocus={!password}
              onClick={closeDialog}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`button ${tone === "danger" ? "buttonDanger" : "buttonPrimary"}`}
              disabled={pending}
            >
              {pending ? "Saving…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
      {!open && showFeedback ? <ActionFeedback state={state} /> : null}
    </div>
  );
}

function ReactivateForm({ user }: { user: ManagedUser }) {
  const [state, action, pending] = useActionState(reactivateUserAction, initialState);
  return (
    <form action={action} className={styles.inlineAction}>
      <input type="hidden" name="userId" value={user.id} />
      <button type="submit" className="button buttonQuiet" disabled={pending}>
        {pending ? "Restoring…" : "Reactivate"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function UsersManager({
  currentUserId,
  workspaceSlug,
  users,
}: {
  currentUserId: string;
  workspaceSlug: string;
  users: ManagedUser[];
}) {
  return (
    <>
      <section className={pageStyles.card} aria-labelledby="add-user-title">
        <div className={pageStyles.cardHeading}>
          <h2 id="add-user-title">Add a user</h2>
          <span className={pageStyles.hint}>Accounts are created for this project only.</span>
        </div>
        <CreateUserForm workspaceSlug={workspaceSlug} />
      </section>
      <section
        className={`${pageStyles.card} ${styles.usersCard}`}
        aria-labelledby="project-users-title"
      >
        <div className={pageStyles.cardHeading}>
          <h2 id="project-users-title">Project users</h2>
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
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            return (
              <article className={styles.userRow} key={user.id}>
                <div className={styles.userIdentity}>
                  <span className={styles.cellLabel}>User</span>
                  <strong>{user.email}</strong>
                  {isCurrentUser ? <span className={styles.currentUser}>You</span> : null}
                </div>
                <div className={styles.userRole}>
                  <span className={styles.cellLabel}>Role</span>
                  {isCurrentUser ? (
                    <span className={styles.roleText}>
                      {user.role === "admin" ? "Admin" : "Viewer"}
                    </span>
                  ) : (
                    <RoleForm user={user} />
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
                          title="Deactivate this account?"
                          description="This user will be signed out immediately and will not be able to sign in until an admin reactivates the account."
                          confirmLabel="Deactivate user"
                          tone="quiet"
                        />
                      ) : (
                        <ReactivateForm user={user} />
                      )}
                      <UserActionDialog
                        action={deleteUserAction}
                        user={user}
                        triggerLabel="Delete"
                        title="Delete this account permanently?"
                        description="This permanently removes the user account and ends its sessions. Project analytics will remain available. This cannot be undone."
                        confirmLabel="Delete account"
                        tone="danger"
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className={styles.footerNote}>
          User passwords are never shown here. Share new or reset passwords securely.
        </p>
      </section>
    </>
  );
}
