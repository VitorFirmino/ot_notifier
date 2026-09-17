import { Hero } from "@components/Hero";
import { HowItWorks } from "@components/HowItWorks";
import { DashboardPreview } from "@components/DashboardPreview";
import { Features } from "@components/Features";
import { Footer } from "@components/Footer";

export default function App() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <DashboardPreview />
      <Features />
      <Footer />
    </main>
  );
}
