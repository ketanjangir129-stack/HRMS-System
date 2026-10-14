import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiShield, FiEye, FiCheckCircle, FiUsers } from "react-icons/fi";

export default function LandingPhilosophy() {
  const [currentIdx, setCurrentIdx] = useState(0);

  const principles = [
    {
      id: "clarity",
      title: "Clarity Over Friction",
      subtitle: "Transparent Visibility for Everyone",
      icon: <FiEye className="w-8 h-8 text-brand" />,
      quote:
        "“HR workflows should be clear for everyone. Give employees an immediate, tamper-proof way to record attendance and view balances, while giving managers instant visual photo audits without endless back-and-forth emails.”",
      badge: "Operational Transparency",
    },
    {
      id: "consistency",
      title: "Consistency in Rules",
      subtitle: "Standardized Policy Governance",
      icon: <FiShield className="w-8 h-8 text-purple-600" />,
      quote:
        "“Eliminate arbitrary exceptions. Statutory deductions (EPF, ESI, TDS), casual/sick leave quotas, and office geofence perimeters are governed by standardized company policies with full audit history.”",
      badge: "Compliance Guarantee",
    },
    {
      id: "accessibility",
      title: "Accessibility Without Hardware",
      subtitle: "Web & Mobile Freedom",
      icon: <FiUsers className="w-8 h-8 text-emerald-600" />,
      quote:
        "“Say goodbye to broken biometric fingerprint machines and expensive reader hardware. Employees clock in securely through any smartphone or laptop webcam with mirror-corrected selfie anti-spoofing.”",
      badge: "Zero Hardware Costs",
    },
    {
      id: "accountability",
      title: "Accountable Lifecycle",
      subtitle: "From Onboarding to Exit",
      icon: <FiCheckCircle className="w-8 h-8 text-amber-500" />,
      quote:
        "“From first-day digital KYC verification to final equipment checklists and NOC issuance, every transition is logged with timestamps, assigned supervisors, and auditable records.”",
      badge: "Complete Audit Trail",
    },
  ];

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev === 0 ? principles.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % principles.length);
  };

  const active = principles[currentIdx];

  return (
    <section id="principles" className="py-12 sm:py-16 bg-canvas overflow-hidden scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header (Section 11 & 12 Requirement) */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight">
            Less Administrative Work. <br className="hidden sm:inline" />
            More Clarity.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-ink-subtle">
            Give employees a better way to manage their requests and help authorized teams handle approvals with greater visibility.
          </p>
        </div>

        {/* 3D Envelope Presentation (Recreating 00:11 - 00:14 Video Style without fake reviews) */}
        <div className="relative max-w-2xl mx-auto py-2">
          
          {/* Angled Envelope Flaps in Background */}
          <div className="absolute -top-6 -left-10 sm:-left-16 w-48 sm:w-64 h-72 rounded-[2.5rem] bg-surface-raised border border-line -rotate-12 pointer-events-none -z-10 shadow-lg opacity-85" />
          <div className="absolute -top-6 -right-10 sm:-right-16 w-48 sm:w-64 h-72 rounded-[2.5rem] bg-surface-raised border border-line rotate-12 pointer-events-none -z-10 shadow-lg opacity-85" />

          {/* Main Envelope Card */}
          <div
            key={active.id}
            className="relative p-8 sm:p-12 rounded-[2.5rem] bg-surface border border-line shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300"
          >
            {/* Top Envelope Accent Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-2 rounded-full bg-brand/40" />

            <div className="flex flex-col items-center text-center">
              
              {/* Principle Icon Badge */}
              <div className="mb-5 p-4 rounded-3xl bg-brand/10 dark:bg-brand/20 text-brand shadow-sm">
                {active.icon}
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-raised border border-line text-brand mb-2">
                {active.badge}
              </span>

              {/* Title & Subtitle */}
              <h3 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                {active.title}
              </h3>
              <p className="text-xs sm:text-sm text-ink-subtle mt-0.5 mb-6">
                {active.subtitle}
              </p>

              {/* Philosophy Quote */}
              <blockquote className="text-sm sm:text-base md:text-lg text-ink-muted leading-relaxed max-w-xl font-normal italic">
                {active.quote}
              </blockquote>

            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={handlePrev}
              className="p-3.5 rounded-full bg-surface hover:bg-surface-raised border border-line text-ink-muted hover:text-ink shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-90"
              aria-label="Previous principle"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            {/* Indicator Dots */}
            <div className="flex items-center gap-2">
              {principles.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIdx === i ? "w-7 bg-brand" : "w-2 bg-line hover:bg-ink-faint"
                  }`}
                  aria-label={`Principle ${i + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="p-3.5 rounded-full bg-surface hover:bg-surface-raised border border-line text-ink-muted hover:text-ink shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-90"
              aria-label="Next principle"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}

