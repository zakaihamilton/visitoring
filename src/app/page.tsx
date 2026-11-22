import { PublicHeader } from "@/app/components/PublicHeader";
import publicHero from "./styles/public-hero.module.css";
import {
  ClosingCta,
  CustomEventsSection,
  PrivacySection,
  SetupSection,
  WelcomeFooter,
} from "./welcome/WelcomeClosingSections";
import { WelcomeHero } from "./welcome/WelcomeHero";
import { BenefitsSection, InsightsSection } from "./welcome/WelcomeHighlights";
import styles from "./welcome.module.css";

export default function HomePage() {
  return (
    <main className={`${publicHero.page} ${styles.page}`}>
      <div className={publicHero.shell}>
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
