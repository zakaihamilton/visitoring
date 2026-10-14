import styles from "../developers.module.css";
import { GuideNavigation } from "./GuideNavigation";
import {
  CustomEventsSection,
  GuideFooterCallout,
  PrivacySection,
  SiteSetupSection,
} from "./GuideSections";
import { TrackerSection } from "./TrackerSection";

export function DevelopersGuide() {
  return (
    <div className={styles.content}>
      <GuideNavigation />
      <div className={styles.article}>
        <SiteSetupSection />
        <TrackerSection />
        <CustomEventsSection />
        <PrivacySection />
        <GuideFooterCallout />
      </div>
    </div>
  );
}
