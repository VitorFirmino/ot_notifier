import { Hero } from "@components/Hero";
import { HowItWorks } from "@components/HowItWorks";
import { DashboardPreview } from "@components/DashboardPreview";
import { Features } from "@components/Features";
import { Footer } from "@components/Footer";
import { GridPingBackground } from "@components/GridPingBackground";
import { Header } from "@components/Header";
import { PrivacyPolicy } from "@components/PrivacyPolicy";
import { TermsOfService } from "@components/TermsOfService";

const LEGAL_PAGES: Record<string, React.FC> = {
  "/privacidade": PrivacyPolicy,
  "/termos": TermsOfService,
};

export default function App() {
  const LegalPage = LEGAL_PAGES[window.location.pathname];

  return (
    <>
      <GridPingBackground />
      <Header />
      <main>
        {LegalPage ? (
          <LegalPage />
        ) : (
          <>
            <Hero />
            <HowItWorks />
            <DashboardPreview />
            <Features />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
