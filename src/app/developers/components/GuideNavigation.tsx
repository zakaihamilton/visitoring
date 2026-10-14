"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../developers.module.css";

const guideSections = [
  { id: "setup", number: "01", label: "Set up a site" },
  { id: "tracker", number: "02", label: "Add the tracker" },
  { id: "events", number: "03", label: "Track an action" },
  { id: "privacy", number: "04", label: "Privacy and behavior" },
] as const;

type GuideSectionId = (typeof guideSections)[number]["id"];

export function GuideNavigation() {
  const [activeSection, setActiveSection] = useState<GuideSectionId | null>(null);

  useEffect(() => {
    const sections = guideSections.flatMap(({ id }) => {
      const section = document.getElementById(id);
      return section ? [{ id, element: section }] : [];
    });
    let frameId: number | null = null;
    const updateActiveSection = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const readingLine = window.innerHeight * 0.35;
        const currentSection = sections.find(({ element }) => {
          const bounds = element.getBoundingClientRect();
          return bounds.top <= readingLine && bounds.bottom >= readingLine;
        });

        setActiveSection(currentSection?.id ?? null);
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <nav className={styles.toc} aria-label="On this page">
      <span className={styles.tocLabel}>On this page</span>
      {guideSections.map(({ id, number, label }) => (
        <a key={id} href={`#${id}`} aria-current={activeSection === id ? "location" : undefined}>
          <span>{number}</span> {label}
        </a>
      ))}
      <div className={styles.tocHelp}>
        <span>Already set up?</span>
        <Link href="/login">
          Open your dashboard <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </nav>
  );
}
