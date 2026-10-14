import { useState, useEffect } from "react";
import {
  FiBarChart2,
  FiTrendingUp,
  FiFileText,
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiCheck,
  FiShield,
  FiClock,
  FiUserCheck,
  FiBriefcase,
} from "react-icons/fi";

export default function LandingAudienceFeatures() {
  const [activeAudience, setActiveAudience] = useState("employees");
  const [managerTab, setManagerTab] = useState("insights");
  const [activeBar, setActiveBar] = useState(3);

  const audienceDetails = {
    employees: {
      title: "For Employees",
      badge: "Self-Service Experience",
      bullets: [
        "Live selfie clock-in with geofenced office validation",
        "Apply for casual, sick, or earned leaves with instant balance check",
        "View upcoming national holidays and company HR policies",
        "Submit equipment returns and track resignation status",
      ],
    },
    managers: {
      title: "For Managers",
      badge: "Operational Oversight",
      bullets: [
        "Inspect high-resolution employee punch photos in an audit lightbox",
        "1-click Approve or Reject for attendance and leave requests",
        "Strict departmental scope enforcement (only see your assigned teams)",
        "Provide clear structured rejection reasons when modifying requests",
      ],
    },
    hr: {
      title: "For HR & Administrators",
      badge: "Enterprise Governance",
      bullets: [
        "End-to-end digital onboarding with Cloudinary KYC encryption",
        "Automated statutory payroll calculations (EPF, ESI, TDS)",
        "Generate and download monthly payslips and banking Excel registers",
        "Complete Full & Final (FnF) exit settlements and NOC generation",
      ],
    },
  };

  const managerTabs = [
    { id: "insights", label: "Access Real-Time Insights", metric: "1.2 hrs", labelText: "Average Approval Speed" },
    { id: "decisions", label: "Make Data-Driven Decisions", metric: "99.8%", labelText: "Geofence Accuracy" },
    { id: "performance", label: "Track Performance in Real Time", metric: "99.4%", labelText: "On-time Punch Rate" },
  ];

  const bars = [
    { day: "M", height: "82%", rate: "94%" },
    { day: "T", height: "92%", rate: "97%" },
    { day: "W", height: "80%", rate: "92%" },
    { day: "T", height: "98%", rate: "99%" },
    { day: "F", height: "88%", rate: "95%" },
  ];

  return (
    <section id="audiences" className="py-12 sm:py-16 bg-canvas scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header (Section 6 Requirement) */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight">
            Built for Every Stage of the <br className="hidden sm:inline" />
            Employee Journey.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-ink-subtle">
            Give employees, managers, and HR teams a clearer way to manage everyday work.
          </p>

          {/* Audience Filter Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "employees", label: "For Employees", icon: <FiUsers className="w-4 h-4" /> },
              { id: "managers", label: "For Managers", icon: <FiUserCheck className="w-4 h-4" /> },
              { id: "hr", label: "For HR & Admins", icon: <FiBriefcase className="w-4 h-4" /> },
            ].map((aud) => {
              const isActive = activeAudience === aud.id;
              return (
                <button
                  key={aud.id}
                  onClick={() => setActiveAudience(aud.id)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-brand text-white shadow-md shadow-brand/25 scale-105"
                      : "bg-surface text-ink-muted hover:text-ink hover:bg-surface-raised border border-line"
                  }`}
                >
                  {aud.icon}
                  <span>{aud.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Audience Highlights Banner */}
        <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-surface border border-line shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-2">
                {audienceDetails[activeAudience].badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-ink">
                {audienceDetails[activeAudience].title}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:max-w-2xl">
              {audienceDetails[activeAudience].bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-ink-muted font-medium">
                  <FiCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bento Grid Visuals (Recreating 00:04 - 00:06 Visual Excellence) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Card 1: Attendance Report Bar Chart */}
          <div className="group flex flex-col justify-between p-6 sm:p-8 rounded-[2rem] bg-surface border border-line shadow-sm hover:shadow-xl hover:border-brand/30 transition-all duration-300">
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-muted border border-line/80 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                    <FiBarChart2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-ink block">Attendance Report</span>
                    <span className="text-[10px] text-ink-subtle">Weekly Verification</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  98.4% Present
                </span>
              </div>

              {/* Animated Interactive Bars */}
              <div className="flex items-end justify-between h-32 pt-4 px-2 border-b border-line gap-2 sm:gap-3">
                {bars.map((bar, i) => {
                  const isHovered = activeBar === i;
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setActiveBar(i)}
                      className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group/bar"
                    >
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-ink text-surface transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
                        {bar.rate}
                      </span>
                      <div
                        style={{ height: bar.height }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${isHovered ? "bg-brand scale-y-105" : "bg-brand/75 hover:bg-brand"}`}
                      />
                      <span className="text-[10px] font-medium text-ink-subtle">{bar.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-ink">For HR Professionals</h3>
              <p className="mt-2 text-sm text-ink-subtle leading-relaxed">
                Use a single unified system for employees, attendance audit photos, and HR lifecycle workflows.
              </p>
            </div>
          </div>

          {/* Card 2: Interactive Manager Metric Insights */}
          <div className="group flex flex-col justify-between p-6 sm:p-8 rounded-[2rem] bg-surface border border-line shadow-sm hover:shadow-xl hover:border-brand/30 transition-all duration-300">
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-muted border border-line/80 mb-6 flex flex-col justify-between min-h-[180px]">
              <div className="flex flex-col gap-1.5 mb-3">
                {managerTabs.map((tab) => {
                  const isCurrent = managerTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setManagerTab(tab.id)}
                      className={`text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? "bg-brand text-white shadow-sm scale-102"
                          : "text-ink-muted hover:text-ink hover:bg-surface"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {isCurrent && <FiCheck className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-line flex items-center justify-between transition-all duration-300">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-ink-subtle block font-semibold">
                    {managerTabs.find((t) => t.id === managerTab)?.labelText}
                  </span>
                  <span className="text-xl font-extrabold text-ink font-mono mt-0.5 block">
                    {managerTabs.find((t) => t.id === managerTab)?.metric}
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <FiTrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-ink">For Managers & Leads</h3>
              <p className="mt-2 text-sm text-ink-subtle leading-relaxed">
                Stay updated with live team data, review punch selfies, and streamline regularization approvals.
              </p>
            </div>
          </div>

          {/* Card 3: Statutory Policies & Documents */}
          <div className="group flex flex-col justify-between p-6 sm:p-8 rounded-[2rem] bg-surface border border-line shadow-sm hover:shadow-xl hover:border-brand/30 transition-all duration-300">
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-muted border border-line/80 mb-6 flex flex-col justify-center min-h-[180px] space-y-3">
              <div className="p-3.5 rounded-xl bg-surface border border-line shadow-xs flex items-center justify-between transition-transform duration-300 hover:scale-102">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                    <FiFileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Statutory PF, ESI & TDS</div>
                    <div className="text-[10px] text-ink-subtle">Automated Compliance Rules</div>
                  </div>
                </div>
                <FiCheckCircle className="h-4 w-4 text-emerald-500" />
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-line shadow-xs flex items-center justify-between transition-transform duration-300 hover:scale-102">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-brand flex items-center justify-center font-bold">
                    <FiShield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Encrypted KYC Vault</div>
                    <div className="text-[10px] text-ink-subtle">Aadhaar, PAN & Bank Details</div>
                  </div>
                </div>
                <FiCheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-ink">For Legal & Compliance</h3>
              <p className="mt-2 text-sm text-ink-subtle leading-relaxed">
                Streamline statutory obligations, employee contracts, and company-wide HR policies with audit trails.
              </p>
            </div>
          </div>

          {/* Card 4: All Employee Data at Once (Directory + Training Line) */}
          <div className="lg:col-span-2 group flex flex-col justify-between p-6 sm:p-8 rounded-[2rem] bg-surface border border-line shadow-sm hover:shadow-xl hover:border-brand/30 transition-all duration-300">
            <div className="p-4 sm:p-6 rounded-2xl bg-surface-muted border border-line/80 mb-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block mb-2">
                  Employee Directory
                </span>
                {[
                  { name: "Albert Cole", role: "Product Manager", status: "Active", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
                  { name: "Sarah Jenkins", role: "Senior Developer", status: "On Duty", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
                  { name: "Rahul Gupta", role: "UI Designer", status: "Checked In", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" },
                ].map((emp, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-line/60 hover:bg-surface-raised transition-colors">
                    <div className="flex items-center gap-2.5">
                      <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-bold text-ink">{emp.name}</div>
                        <div className="text-[10px] text-ink-subtle">{emp.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {emp.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-between p-4 rounded-xl bg-surface border border-line/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Training Participation</span>
                  <span className="text-[10px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                    +24% this month
                  </span>
                </div>

                <div className="h-28 w-full flex items-center justify-center my-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 240 80" fill="none">
                    <path
                      d="M0 65 Q 40 50 80 40 T 160 30 T 240 10"
                      stroke="var(--color-brand)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="animate-draw-line"
                    />
                    <path
                      d="M0 65 Q 40 50 80 40 T 160 30 T 240 10 L 240 80 L 0 80 Z"
                      fill="url(#audienceAreaGradient)"
                      opacity="0.18"
                    />
                    <defs>
                      <linearGradient id="audienceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-brand)" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-ink-subtle font-medium">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>

            </div>

            <div>
              <h3 className="text-xl font-bold text-ink">All Employee Data at Once</h3>
              <p className="mt-2 text-sm text-ink-subtle leading-relaxed">
                Contact information, past and unpaid leave balances, career history, departments, and payroll records unified.
              </p>
            </div>
          </div>

          {/* Card 5: Circular Team Availability Orbit */}
          <div className="group flex flex-col justify-between p-6 sm:p-8 rounded-[2rem] bg-surface border border-line shadow-sm hover:shadow-xl hover:border-brand/30 transition-all duration-300">
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-muted border border-line/80 mb-6 flex items-center justify-center min-h-[190px] relative overflow-hidden">
              <div className="relative z-10 w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/40 group-hover:scale-110 transition-transform">
                <FiCalendar className="h-6 w-6" />
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-38 h-38 rounded-full border border-dashed border-brand/35 animate-spin" style={{ animationDuration: "20s" }}>
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="animate-counter-spin" style={{ animationDuration: "20s" }}>
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                        alt="Employee"
                        className="w-8 h-8 rounded-full object-cover border-2 border-surface shadow-md"
                      />
                    </div>
                  </div>
                  <div className="absolute top-1/2 -right-3.5 -translate-y-1/2">
                    <div className="animate-counter-spin" style={{ animationDuration: "20s" }}>
                      <img
                        src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80"
                        alt="Employee"
                        className="w-8 h-8 rounded-full object-cover border-2 border-surface shadow-md"
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2">
                    <div className="animate-counter-spin" style={{ animationDuration: "20s" }}>
                      <img
                        src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=80"
                        alt="Employee"
                        className="w-8 h-8 rounded-full object-cover border-2 border-surface shadow-md"
                      />
                    </div>
                  </div>
                  <div className="absolute top-1/2 -left-3.5 -translate-y-1/2">
                    <div className="animate-counter-spin" style={{ animationDuration: "20s" }}>
                      <img
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80"
                        alt="Employee"
                        className="w-8 h-8 rounded-full object-cover border-2 border-surface shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-ink">For Teams & Colleagues</h3>
              <p className="mt-2 text-sm text-ink-subtle leading-relaxed">
                Connect to know who is going to be out of office, check leave balances, and stay aware of upcoming events.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

