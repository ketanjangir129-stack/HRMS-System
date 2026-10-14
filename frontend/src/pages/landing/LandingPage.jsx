import { useEffect } from "react";
import LandingNavbar from "../../components/landing/LandingNavbar";
import LandingHero from "../../components/landing/LandingHero";
import LandingCoreHR from "../../components/landing/LandingCoreHR";
import LandingAudienceFeatures from "../../components/landing/LandingAudienceFeatures";
import LandingProductUI from "../../components/landing/LandingProductUI";
import LandingConnectedWorkflows from "../../components/landing/LandingConnectedWorkflows";
import LandingEmployeeLifecycle from "../../components/landing/LandingEmployeeLifecycle";
import LandingPhilosophy from "../../components/landing/LandingPhilosophy";
import LandingFAQ from "../../components/landing/LandingFAQ";
import LandingCTA from "../../components/landing/LandingCTA";
import LandingFooter from "../../components/landing/LandingFooter";

export default function LandingPage() {
  useEffect(() => {
    document.title = "HRMS System | Everything HR. One Connected Platform.";
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-brand/20 selection:text-brand scroll-smooth">
      {/* Floating Header Navigation */}
      <LandingNavbar />

      {/* Main SaaS Product Story Flow */}
      <main className="flex-1">
        {/* Section 3: Animated Hero Hub (00:00 Video Reference) */}
        <LandingHero />

        {/* Section 5: Core HR Solutions with Floating Avatar Cards (00:01 - 00:03) */}
        <LandingCoreHR />

        {/* Section 6: Audience-Specific Features & Bento Grid (00:04 - 00:06) */}
        <LandingAudienceFeatures />

        {/* Section 7 & 8: Attendance and Leave Management (Actual UI Previews) */}
        <LandingProductUI />

        {/* Section 9: Connected HR Workflows (Curved Arc Carousel — 00:07 - 00:10) */}
        <LandingConnectedWorkflows />

        {/* Section 10: From Everyday HR to Employee Transitions (Lifecycle Timeline) */}
        <LandingEmployeeLifecycle />

        {/* Section 11 & 12: Philosophy & Product Principles (Envelope 3D Style — 00:11 - 00:14) */}
        <LandingPhilosophy />

        {/* FAQ Accordion */}
        <LandingFAQ />

        {/* Section 13: Final Call to Action */}
        <LandingCTA />
      </main>

      {/* Section 14: Modern Watermark Footer (00:15 - 00:17) */}
      <LandingFooter />
    </div>
  );
}
