import { loginAction } from "./actions";
import { cookies } from "next/headers";
import { BrandIcon } from "@/app/components/BrandIcon";
import { Tooltip } from "@/app/components/Tooltip";
import styles from "./login.module.css";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const [{ error }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const lastProject = cookieStore.get("visitoring_last_project")?.value;
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <BrandIcon />
          <span>Visitoring</span>
        </div>
        <div className={styles.copy}>
          <div className="eyebrow">Private analytics</div>
          <h1>
            Know your traffic.
            <br />
            <em>Keep it simple.</em>
          </h1>
          <p>Private analytics for the sites you run, with no public sign-up.</p>
        </div>
        <div className={styles.mini}>
          <span className={styles.pulse} /> Your data stays in your project
        </div>
      </section>
      <section className={styles.formSide}>
        <form action={loginAction} className={styles.form}>
          <div className="eyebrow">Welcome back</div>
          <h2>Sign in to your project</h2>
          <p className={styles.sub}>
            Use the project name and account provided by your administrator.
          </p>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="workspace">Project</label>
              <Tooltip
                label="Project"
                content="Enter the short project name provided by your administrator, such as acme."
              />
            </div>
            <input
              id="workspace"
              name="workspace"
              autoComplete="organization"
              required
              placeholder="visitoring"
              defaultValue={lastProject}
            />
          </div>
          <label>
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              We couldn't find a match for that project, email, or password.
            </p>
          ) : null}
          <button type="submit" className="button buttonPrimary">
            Continue <span aria-hidden>↗</span>
          </button>
          <p className={styles.foot}>
            Need access? Ask your project administrator to create an account.
          </p>
        </form>
      </section>
    </main>
  );
}
