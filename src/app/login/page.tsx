import { loginAction, startPerministerLoginAction } from "./actions";
import { BrandIcon } from "@/app/components/BrandIcon";
import styles from "./login.module.css";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
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
          <span className={styles.pulse} /> Your data stays in your workspace
        </div>
      </section>
      <section className={styles.formSide}>
        <div className={styles.form}>
          <div className="eyebrow">Welcome back</div>
          <h2>Sign in to Visitoring</h2>
          <p className={styles.sub}>Sign in with your account to open your Visitoring projects.</p>
          <form action={startPerministerLoginAction} className={styles.ssoForm}>
            <button type="submit" className={`button buttonQuiet ${styles.ssoButton}`}>
              Sign in with Perminister <span aria-hidden>↗</span>
            </button>
          </form>
          <div className={styles.authDivider}>
            <span>or sign in with email and password</span>
          </div>
          <form action={loginAction} className={styles.credentialsForm}>
            <label htmlFor="email">
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
            <label htmlFor="password">
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
                {error === "unavailable"
                  ? "Sign-in is temporarily unavailable. Please try again shortly."
                  : error === "sso"
                    ? "Perminister sign-in could not be completed. Please try again."
                    : "We couldn't find a match for that email or password, or your account doesn't have Visitoring access."}
              </p>
            ) : null}
            <button type="submit" className="button buttonPrimary">
              Continue <span aria-hidden>↗</span>
            </button>
          </form>
          <p className={styles.foot}>
            Need access? Ask your project administrator to create an account.
          </p>
        </div>
      </section>
    </main>
  );
}
