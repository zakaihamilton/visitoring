import Link from "next/link";
import { BrandIcon } from "./BrandIcon";
import styles from "./public-header.module.css";

export function PublicHeader({ page }: { page: "welcome" | "developers" }) {
  const secondaryLink =
    page === "welcome"
      ? { href: "/developers", label: "Developers" }
      : { href: "/", label: "Home" };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Visitoring home">
        <BrandIcon />
        <span>Visitoring</span>
      </Link>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href={secondaryLink.href} className="button buttonQuiet">
          {secondaryLink.label}
        </Link>
        <Link href="/login" className="button buttonPrimary">
          Log in <span aria-hidden>↗</span>
        </Link>
      </nav>
    </header>
  );
}
