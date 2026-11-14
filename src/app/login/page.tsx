import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, AuthShell } from "panel-frame-ui";
import { BrandIcon } from "@/app/components/BrandIcon";
import { ThemeControl } from "@/app/components/ThemeControl";
import { perministerRecoveryUrl } from "@/lib/perminister-origin";
import { safeVisitoringReturnTo } from "@/lib/perminister-sso";
import styles from "./login.module.css";

type Props = {
  searchParams: Promise<{ error?: string | string[]; loggedOut?: string | string[]; next?: string | string[] }>;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const error = first(query.error);
  const loggedOut = first(query.loggedOut) === "1";
  const next = safeVisitoringReturnTo(first(query.next));
  if (!error && !loggedOut) {
    const start = new URLSearchParams();
    if (next) start.set("next", next);
    redirect(`/auth/perminister/start${start.size ? `?${start}` : ""}`);
  }

  const retry = new URLSearchParams();
  if (next) retry.set("next", next);
  retry.set("prompt", "login");
  const recoveryUrl = perministerRecoveryUrl();
  const message = loggedOut
    ? "You’re signed out of Visitoring. Sign in again through Perminister to continue."
    : error === "invalid"
      ? "This Perminister account does not have access to Visitoring. Ask your organization administrator for access."
      : "Perminister sign-in could not be completed. Try again, or reset your Perminister password.";

  return (
    <AuthShell
      brand={
        <Link href="/" className={styles.brand} aria-label="Visitoring home">
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
      }
      aside={
        <div className={styles.copy}>
          <div className="eyebrow">Private website analytics</div>
          <h1>
            Know your traffic.
            <br />
            <em>Keep it simple.</em>
          </h1>
          <p>Private analytics for the sites you run, with no public sign-up.</p>
        </div>
      }
      utility={<ThemeControl />}
      footer={
        <div className={styles.mini}>
          <span className={styles.pulse} /> Your data stays in your project
        </div>
      }
    >
      <AuthCard>
        <div className={styles.form}>
          <div className={styles.formIntro}>
            <div className="eyebrow">Welcome back</div>
          </div>
          <h2>{loggedOut ? "You’re signed out" : "Continue with Perminister"}</h2>
          <p className={styles.sub} role={error || loggedOut ? "alert" : undefined}>
            {message}
          </p>
          <Link
            href={`/auth/perminister/start?${retry}`}
            className={"button buttonPrimary " + styles.ssoButton}
          >
            {loggedOut ? "Sign in again" : "Try again with Perminister"} <span aria-hidden>↗</span>
          </Link>
          {recoveryUrl ? (
            <p className={styles.foot}>
              Need help signing in? <a href={recoveryUrl}>Reset your Perminister password</a>.
            </p>
          ) : null}
        </div>
      </AuthCard>
    </AuthShell>
  );
}
