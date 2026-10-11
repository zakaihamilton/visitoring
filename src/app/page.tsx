import { PublicHeader } from "@/app/components/PublicHeader";
import styles from "./welcome.module.css";
import {
  ClosingCta,
  CustomEventsSection,
  PrivacySection,
  SetupSection,
  WelcomeFooter,
} from "./welcome/WelcomeClosingSections";
import { BenefitsSection, InsightsSection } from "./welcome/WelcomeHighlights";
import { WelcomeHero } from "./welcome/WelcomeHero";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PublicHeader page="welcome" />
        <WelcomeHero />
        <BenefitsSection />
        <InsightsSection />
        <CustomEventsSection />
        <PrivacySection />
        <SetupSection />
        <ClosingCta />
        <WelcomeFooter />
      </div>
    </main>
  );
}
