import { cookies } from "next/headers";
import Link from "next/link";
import { BrandIcon } from "@/app/components/BrandIcon";
import { logoutAction } from "@/app/login/actions";
import { requireVisitoringOrganizations } from "@/lib/auth";
import { OrganizationPicker } from "./OrganizationPicker";
import { selectOrganizationAction } from "./actions";
import styles from "./organizations.module.css";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OrganizationsPage({ searchParams }: Props) {
  const [{ organizations }, { error }, cookieStore] = await Promise.all([
    requireVisitoringOrganizations(),
    searchParams,
    cookies(),
  ]);
  const lastOrganizationId = cookieStore.get("visitoring_last_organization")?.value;
  const rememberedOrganizationId = lastOrganizationId?.toLowerCase() ?? "";
  const initialOrganizationId = organizations.some(
    (organization) => organization.organizationId === rememberedOrganizationId,
  )
    ? rememberedOrganizationId
    : "";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Visitoring home">
          <BrandIcon />
          <span>Visitoring</span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="button buttonQuiet">
            Sign out
          </button>
        </form>
      </header>

      <section className={styles.card} aria-labelledby="organizations-title">
        <div className="eyebrow">Your account</div>
        <h1 id="organizations-title">Choose an organization</h1>
        <p className={styles.intro}>
          Select the organization whose Visitoring projects you want to open.
        </p>
        {error === "invalid" ? (
          <p className={styles.error} role="alert">
            That organization is no longer available to your account. Choose an organization from
            the list.
          </p>
        ) : null}
        <OrganizationPicker
          organizations={organizations}
          initialOrganizationId={initialOrganizationId}
          action={selectOrganizationAction}
        />
      </section>
    </main>
  );
}
