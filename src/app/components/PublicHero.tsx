import type { ReactNode } from "react";
import publicHero from "@/app/styles/public-hero.module.css";

type HeroClassNames = {
  hero?: string;
  heroCopy?: string;
  eyebrow?: string;
  heroActions?: string;
  heroPrimary?: string;
  heroSecondary?: string;
  heroVisual?: string;
};

function joinClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Shared two-column hero layout for public marketing and developer guide pages. */
export function PublicHero({
  titleId,
  classNames = {},
  eyebrow,
  title,
  description,
  actions,
  footer,
  visual,
}: {
  titleId: string;
  classNames?: HeroClassNames;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions: (classes: { primary: string; secondary: string }) => ReactNode;
  footer?: ReactNode;
  visual: ReactNode;
}) {
  return (
    <section className={joinClasses(publicHero.hero, classNames.hero)} aria-labelledby={titleId}>
      <div className={joinClasses(publicHero.heroCopy, classNames.heroCopy)}>
        <div className={joinClasses(publicHero.eyebrow, classNames.eyebrow)}>
          <span className={publicHero.eyebrowDot} aria-hidden="true" />
          {eyebrow}
        </div>
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
        <div className={joinClasses(publicHero.heroActions, classNames.heroActions)}>
          {actions({
            primary: joinClasses(
              "button buttonPrimary",
              publicHero.heroPrimary,
              classNames.heroPrimary,
            ),
            secondary: joinClasses(publicHero.heroSecondary, classNames.heroSecondary),
          })}
        </div>
        {footer}
      </div>

      <div className={joinClasses(publicHero.heroVisual, classNames.heroVisual)} aria-hidden="true">
        {visual}
      </div>
    </section>
  );
}
