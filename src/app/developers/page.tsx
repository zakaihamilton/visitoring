import type { Metadata } from "next";
import { PublicHeader } from "@/app/components/PublicHeader";
import { DevelopersGuide } from "./components/DevelopersGuide";
import { DeveloperHero } from "./components/DeveloperHero";
import styles from "./developers.module.css";

export const metadata: Metadata = {
  title: "Developers — Visitoring",
  description: "Add Visitoring analytics to your website in a few simple steps.",
  openGraph: {
    type: "website",
    siteName: "Visitoring",
    url: "/developers",
    title: "Developers — Visitoring",
    description: "Add Visitoring analytics to your website in a few simple steps.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Visitoring — know your traffic, keep it simple.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developers — Visitoring",
    description: "Add Visitoring analytics to your website in a few simple steps.",
    images: ["/og-image.png"],
  },
};

export default function DevelopersPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PublicHeader page="developers" />
        <DeveloperHero />
        <DevelopersGuide />
      </div>
    </main>
  );
}
