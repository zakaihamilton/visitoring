import { loginAction } from "./actions";
import styles from "./login.module.css";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <span className="brandMark">v</span>
          <span>Visitoring</span>
        </div>
        <div className={styles.copy}>
          <div className="eyebrow">Private analytics</div>
          <h1>
            Know your traffic.
            <br />
            <em>Keep it simple.</em>
          </h1>
          <p>
            Small, clear analytics for the sites you run. No noisy tracking, no public accounts.
          </p>
        </div>
        <div className={styles.mini}>
          <span className={styles.pulse} /> Your data stays in your workspace
        </div>
      </section>
      <section className={styles.formSide}>
        <form action={loginAction} className={styles.form}>
          <div className="eyebrow">Welcome back</div>
          <h2>Sign in to your workspace</h2>
          <p className={styles.sub}>Use the account provisioned by your administrator.</p>
          <label>
            Workspace slug
            <input name="workspace" autoComplete="organization" required placeholder="acme" />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              Those workspace credentials were not recognized.
            </p>
          ) : null}
          <button type="submit" className="button buttonPrimary">
            Continue <span aria-hidden>↗</span>
          </button>
          <p className={styles.foot}>
            Accounts are provisioned by CLI. Visitoring has no public signup.
          </p>
        </form>
      </section>
    </main>
  );
}
