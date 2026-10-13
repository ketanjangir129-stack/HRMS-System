import { useEffect } from "react";
import LandingNavbar from "../../components/landing/LandingNavbar";
import LandingHero from "../../components/landing/LandingHero";
import LandingStats from "../../components/landing/LandingStats";
import LandingFeatures from "../../components/landing/LandingFeatures";
import LandingArchitecture from "../../components/landing/LandingArchitecture";
import LandingFAQ from "../../components/landing/LandingFAQ";
import LandingCTA from "../../components/landing/LandingCTA";
import LandingFooter from "../../components/landing/LandingFooter";

export default function LandingPage() {
  useEffect(() => {
    document.title = "HRMS System | Workforce & Operations Platform";
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-brand/20 selection:text-brand">
      {/* Sticky Navigation */}
      <LandingNavbar />

      {/* Main Page Flow */}
      <main className="flex-1">
        <LandingHero />
        <LandingStats />
        <LandingFeatures />
        <LandingArchitecture />
        <LandingFAQ />
        <LandingCTA />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

