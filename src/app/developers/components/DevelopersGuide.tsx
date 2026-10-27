import styles from "../developers.module.css";
import { GuideNavigation } from "./GuideNavigation";
import { GuideFooterCallout, PrivacySection, SiteSetupSection } from "./GuideSections";
import { TrackerSection } from "./TrackerSection";

export function DevelopersGuide() {
  return (
    <div className={styles.content}>
      <GuideNavigation />
      <div className={styles.article}>
        <SiteSetupSection />
        <TrackerSection />
        <PrivacySection />
        <GuideFooterCallout />
      </div>
    </div>
  );
}
