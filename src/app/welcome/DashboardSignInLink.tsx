import Link from "next/link";

export function DashboardSignInLink({ className }: { className: string }) {
  return (
    <Link href="/login" className={className}>
      Sign in to your dashboard. <span aria-hidden="true">↗</span>
    </Link>
  );
}
