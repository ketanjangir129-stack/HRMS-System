import { useState } from "react";
import {
  FiUserPlus,
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiLogOut,
  FiArrowRight,
  FiCheck,
} from "react-icons/fi";

export default function LandingEmployeeLifecycle() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: "onboarding",
      number: "01",
      title: "Digital Onboarding & KYC",
      subtitle: "Paperless First Day",
      icon: <FiUserPlus className="w-6 h-6 text-brand" />,
      bullets: [
        "Cloudinary encrypted document storage (Aadhaar & PAN)",
        "Bank detail validation & automatic employee code creation",
        "Company invitation link with tokenized security",
      ],
      previewBadge: "Cloudinary CDN Verified",
    },
    {
      id: "attendance",
      number: "02",
      title: "Daily Attendance & Tracking",
      subtitle: "Biometric Precision",
      icon: <FiClock className="w-6 h-6 text-amber-500" />,
      bullets: [
        "Mirror-corrected live selfie camera punch",
        "Office GPS geofencing radius validation",
        "Dual IN/OUT timestamps with duration tracking",
      ],
      previewBadge: "Zero Hardware Costs",
    },
    {
      id: "policies",
      number: "03",
      title: "Leaves, Policies & Rosters",
      subtitle: "Operational Harmony",
      icon: <FiFileText className="w-6 h-6 text-emerald-500" />,
      bullets: [
        "Real-time casual, sick, and earned balance counters",
        "Company-wide holiday calendars and shift rosters",
        "Instant policy handbooks and departmental notices",
      ],
      previewBadge: "Policy-Driven Quotas",
    },
    {
      id: "approvals",
      number: "04",
      title: "Manager Oversight & Approvals",
      subtitle: "Visual Transparency",
      icon: <FiCheckCircle className="w-6 h-6 text-purple-500" />,
      bullets: [
        "Audit employee selfies in an interactive photo lightbox",
        "1-click Approve / Reject with structured supervisor reasons",
        "Departmental scope restriction to authorized managers",
      ],
      previewBadge: "1-Click Approvals",
    },
    {
      id: "exit",
      number: "05",
      title: "Resignation & FnF Settlement",
      subtitle: "Graceful Offboarding",
      icon: <FiLogOut className="w-6 h-6 text-rose-500" />,
      bullets: [
        "Hardware & equipment return checklist submission",
        "Automated No Objection Certificate (NOC) generation",
        "Comprehensive Full & Final (FnF) salary distribution",
      ],
      previewBadge: "Compliant Asset Clearance",
    },
  ];

  return (
    <section id="lifecycle" className="py-12 sm:py-16 bg-canvas overflow-hidden scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header (Section 10 Requirement) */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            From Everyday HR to <br className="hidden sm:inline" />
            Employee Transitions.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-ink-subtle">
            Manage the entire employee relationship from first-day onboarding to final exit settlement.
          </p>
        </div>

        {/* Horizontal Timeline Step Strip (Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {steps.map((step, idx) => {
            const isSelected = activeStep === idx;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`relative p-4 sm:p-5 rounded-3xl border text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-surface border-brand shadow-lg scale-102 ring-2 ring-brand/20 z-10"
                    : "bg-surface/60 border-line hover:bg-surface hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-extrabold ${isSelected ? "text-brand" : "text-ink-subtle"}`}>
                    {step.number}
                  </span>
                  <div className={`p-2 rounded-xl ${isSelected ? "bg-brand/10 text-brand" : "bg-surface-muted text-ink-subtle"}`}>
                    {step.icon}
                  </div>
                </div>

                <div className="text-sm font-bold text-ink leading-tight mb-1">
                  {step.title}
                </div>
                <div className="text-[11px] text-ink-subtle">
                  {step.subtitle}
                </div>

                {/* Active Indicator Underline */}
                {isSelected && (
                  <div className="absolute bottom-0 left-6 right-6 h-1 bg-brand rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Detailed Active Step Showcase Card */}
        <div className="p-8 sm:p-12 rounded-[2.5rem] bg-surface border border-line shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold">
                {steps[activeStep].previewBadge}
              </span>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                {steps[activeStep].title}
              </h3>

              <p className="text-sm sm:text-base text-ink-subtle leading-relaxed">
                Standardized, compliant, and auditable employee milestones designed for operational speed.
              </p>

              <div className="pt-2 space-y-3">
                {steps[activeStep].bullets.map((bullet, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-medium text-ink-muted">
                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-600">
                      <FiCheck className="w-4 h-4" />
                    </div>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-3xl bg-surface-muted border border-line">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-line pb-2">
                  <span className="font-bold text-ink uppercase tracking-wider text-[10px]">Lifecycle Gate</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <FiCheckCircle className="w-3.5 h-3.5" /> Stage Ready
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line/80 flex items-center justify-between">
                  <span className="text-ink-subtle">Audit Trail</span>
                  <span className="font-semibold text-ink">Encrypted & Timely</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line/80 flex items-center justify-between">
                  <span className="text-ink-subtle">Role Permission</span>
                  <span className="font-semibold text-ink">Supervised Access</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line/80 flex items-center justify-between">
                  <span className="text-ink-subtle">Compliance Check</span>
                  <span className="font-semibold text-emerald-600">100% Verified</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

