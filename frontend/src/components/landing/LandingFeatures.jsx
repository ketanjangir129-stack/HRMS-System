import { useState } from "react";
import {
  FiCamera,
  FiMapPin,
  FiCheckCircle,
  FiFileText,
  FiUsers,
  FiDollarSign,
  FiCalendar,
  FiShield,
  FiCheck,
  FiX,
  FiUserPlus,
  FiLayers,
} from "react-icons/fi";
import onboardingImg from "../../assets/onboarding.png";

export default function LandingFeatures() {
  const [activeTab, setActiveTab] = useState("attendance");

  const modules = [
    {
      id: "attendance",
      title: "Smart Attendance & GPS",
      icon: <FiCamera className="h-4 w-4" />,
      badge: "Real-time Verification",
      heading: "Biometric-Grade Selfie Punching with Geofence Validation",
      description:
        "Ensure authentic attendance without expensive hardware. Employees punch in using their phone or webcam with live selfie verification and high-precision GPS geofencing.",
      highlights: [
        "Mirror-corrected selfie capture for crystal clear photo audits",
        "Geofenced office perimeter enforcement preventing remote punch fraud",
        "Live work duration tracking and automatic late-in / early-out detection",
        "Dual Punch-In / Punch-Out timestamps with mapped location coordinates",
      ],
      previewType: "attendance",
    },
    {
      id: "approvals",
      title: "Manager Approvals & Audit",
      icon: <FiCheckCircle className="h-4 w-4" />,
      badge: "Streamlined Oversight",
      heading: "Visual Photo Audit & 1-Click Approval Workflows",
      description:
        "Equip managers and HR leads with full transparency. Inspect employee punch selfies in an interactive photo lightbox, verify coordinates on Google Maps, and manage approvals effortlessly.",
      highlights: [
        "High-resolution punch photo thumbnails for instant visual checks",
        "Smart status switching: Approved records display Reject, and vice-versa",
        "Employee ID resolution to human names (e.g. Rahul Gupta instead of EMP012)",
        "Daily regularization requests and automated supervisor notifications",
      ],
      previewType: "approvals",
    },
    {
      id: "payroll",
      title: "Payroll & Statutory Compliance",
      icon: <FiDollarSign className="h-4 w-4" />,
      badge: "Automated Finance",
      heading: "100% Accurate Salary Generation & Statutory Filings",
      description:
        "Say goodbye to manual payroll calculations. HRMS System synchronizes approved attendance days, leaves, and overtime into error-free monthly salary distributions.",
      highlights: [
        "Automated EPF, ESI, TDS, and statutory deduction breakdowns",
        "Custom allowance schemes (HRA, Special Allowance, Performance Bonus)",
        "Downloadable payslips for all team members",
        "Direct Excel & CSV salary register exports for banking uploads",
      ],
      previewType: "payroll",
    },
    {
      id: "onboarding",
      title: "Digital Onboarding",
      icon: <FiUserPlus className="h-4 w-4" />,
      badge: "Paperless Lifecycle",
      heading: "Self-Service Employee Onboarding via Cloudinary",
      description:
        "Deliver a frictionless first-day experience. New hires upload government IDs, certificates, and bank details through a dedicated secure link before stepping into the office.",
      highlights: [
        "Cloudinary CDN document storage with encrypted asset delivery",
        "Custom company code and tokenized invitation security",
        "Automatic employee code generation and department assignment",
        "Centralized employee directory with complete history and records",
      ],
      previewType: "onboarding",
    },
    {
      id: "leaves",
      title: "Leaves & Shift Management",
      icon: <FiCalendar className="h-4 w-4" />,
      badge: "Flexible Operations",
      heading: "Policy-Driven Leave Quotas & Shift Scheduling",
      description:
        "Keep operations running smoothly with automated leave balances, department-specific holidays, and customizable shift rosters.",
      highlights: [
        "Casual, Sick, Earned, and Compensatory leave quota tracking",
        "Multi-level approval hierarchy for manager sign-offs",
        "Company-wide live holiday calendars and team availability views",
        "Instant deduction adjustment in monthly payroll cycles",
      ],
      previewType: "leaves",
    },
  ];

  const currentModule = modules.find((m) => m.id === activeTab) || modules[0];

  return (
    <section id="attendance" className="py-20 sm:py-28 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
            <FiLayers className="h-3.5 w-3.5" />
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Engineered to Power Every Aspect of People Operations
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-subtle">
            Explore the integrated modules inside <strong className="text-ink">HRMS System</strong> that streamline workforce tracking, approvals, payroll, and compliance.
          </p>
        </div>

        {/* Tab Navigation Pill Strip */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-4 gap-2 no-scrollbar mb-10 sm:mb-12 -mx-4 px-4 sm:mx-0 sm:px-0">
          {modules.map((mod) => {
            const isSelected = activeTab === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-brand text-white shadow-sm shadow-brand/30"
                    : "bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised border border-line"
                }`}
              >
                {mod.icon}
                <span>{mod.title}</span>
              </button>
            );
          })}
        </div>

        {/* Detailed Feature Showcase Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-surface p-6 sm:p-10 lg:p-12 rounded-3xl border border-line shadow-sm">
          
          {/* Left Column: Text & Feature Bullets */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand">
              {currentModule.badge}
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight">
              {currentModule.heading}
            </h3>

            <p className="text-sm sm:text-base text-ink-subtle leading-relaxed">
              {currentModule.description}
            </p>

            <div className="space-y-3 pt-2">
              {currentModule.highlights.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
                    <FiCheck className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium text-ink-muted">
                    {bullet}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Visual Interactive UI Mockup */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-line bg-surface-muted p-5 sm:p-7 shadow-xs">
              
              {/* Conditional Mockups based on Tab */}
              {currentModule.previewType === "attendance" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                      Live Punch-In Terminal
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Camera Ready
                    </span>
                  </div>

                  {/* Punch Card Simulator */}
                  <div className="rounded-xl bg-surface border border-line p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                          IN
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">Punch-In Registered</div>
                          <div className="text-[11px] text-ink-subtle">09:14:22 AM IST</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        On Time
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-surface-muted">
                        <span className="text-ink-subtle block text-[10px]">Photo Audit</span>
                        <span className="font-semibold text-ink flex items-center gap-1 mt-0.5">
                          <FiCheckCircle className="h-3 w-3 text-emerald-500" />
                          Selfie Verified
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface-muted">
                        <span className="text-ink-subtle block text-[10px]">Office Geofence</span>
                        <span className="font-semibold text-ink flex items-center gap-1 mt-0.5">
                          <FiMapPin className="h-3 w-3 text-brand" />
                          Within 25m Radius
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-brand/5 border border-brand/15 text-xs text-brand font-medium flex items-center gap-2">
                    <FiShield className="h-4 w-4 shrink-0" />
                    <span>Real-time anti-spoofing and zero mirror-image distortion</span>
                  </div>
                </div>
              )}

              {currentModule.previewType === "approvals" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                      Manager Approval Queue
                    </span>
                    <span className="text-xs font-medium text-ink-muted">
                      Pending: 1 Review
                    </span>
                  </div>

                  {/* Approval Row Card */}
                  <div className="rounded-xl bg-surface border border-line p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          RG
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ink">Rahul Gupta</div>
                          <div className="text-[11px] text-ink-subtle">EMP012 • Engineering</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        Needs Review
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                      <span className="text-ink-subtle">Punch Photos: 2 Attached</span>
                      <div className="flex gap-2">
                        <button className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white flex items-center gap-1">
                          <FiCheck className="h-3 w-3" /> Approve
                        </button>
                        <button className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-600 text-white flex items-center gap-1">
                          <FiX className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-line text-xs text-ink-muted flex items-center gap-2">
                    <span className="font-semibold text-ink">Approver Resolved:</span>
                    <span>Approved by Rahul Gupta (EMP012)</span>
                  </div>
                </div>
              )}

              {currentModule.previewType === "payroll" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                      Monthly Payroll Engine
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      100% Calculated
                    </span>
                  </div>

                  <div className="rounded-xl bg-surface border border-line p-4 space-y-3 shadow-2xs">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-ink-subtle">Total Gross Earnings</span>
                      <span className="font-bold text-ink font-mono">₹ 78,500.00</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-ink-subtle">EPF & ESI Contribution</span>
                      <span className="font-semibold text-red-500 font-mono">- ₹ 4,200.00</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-ink-subtle">TDS Withheld</span>
                      <span className="font-semibold text-red-500 font-mono">- ₹ 2,300.00</span>
                    </div>
                    <div className="pt-2 border-t border-line flex justify-between items-center text-sm font-bold">
                      <span className="text-ink">Net Payable</span>
                      <span className="text-emerald-600 font-mono">₹ 72,000.00</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                    <FiFileText className="h-4 w-4 shrink-0" />
                    <span>Instant export to banking format and downloadable employee salary slips</span>
                  </div>
                </div>
              )}

              {currentModule.previewType === "onboarding" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                      Digital Onboarding Pipeline
                    </span>
                    <span className="text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded">
                      Cloudinary Connected
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-line bg-surface">
                    <img
                      src={onboardingImg}
                      alt="Paperless Employee Onboarding"
                      className="w-full h-44 object-cover object-top"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-surface border border-line">
                      <span className="text-ink-subtle block text-[10px]">Aadhaar / PAN KYC</span>
                      <span className="font-semibold text-emerald-600 mt-0.5 block">Verified</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface border border-line">
                      <span className="text-ink-subtle block text-[10px]">Bank Details</span>
                      <span className="font-semibold text-emerald-600 mt-0.5 block">Auto Validated</span>
                    </div>
                  </div>
                </div>
              )}

              {currentModule.previewType === "leaves" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                      Leave Balances & Roster
                    </span>
                    <span className="text-xs font-medium text-ink-muted">
                      Annual Allocation
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-3 rounded-xl bg-surface border border-line">
                      <span className="text-[10px] text-ink-subtle block">Casual</span>
                      <span className="text-lg font-bold text-ink mt-1 block">8 / 12</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-line">
                      <span className="text-[10px] text-ink-subtle block">Sick</span>
                      <span className="text-lg font-bold text-ink mt-1 block">6 / 8</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-line">
                      <span className="text-[10px] text-ink-subtle block">Earned</span>
                      <span className="text-lg font-bold text-emerald-600 mt-1 block">15</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface border border-line p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-ink block">Upcoming Holiday</span>
                      <span className="text-ink-subtle text-[11px]">Republic Day • National Holiday</span>
                    </div>
                    <span className="px-2 py-1 rounded bg-brand/10 text-brand font-semibold text-[10px]">
                      Jan 26
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

