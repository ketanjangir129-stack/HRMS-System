import { FiShield, FiLock, FiCloud, FiUsers, FiDatabase, FiCheckCircle } from "react-icons/fi";

export default function LandingArchitecture() {
  const pillars = [
    {
      icon: <FiLock className="h-6 w-6 text-brand" />,
      title: "Granular Role-Based Access (RBAC)",
      desc: "Tailored dashboards and permission sets for Company Owner, HR Administrators, Department Managers, and Employees. Zero unauthorized data leakage.",
    },
    {
      icon: <FiCloud className="h-6 w-6 text-blue-500" />,
      title: "Cloudinary CDN Media Architecture",
      desc: "Instant facial photo transformations, WebP/AVIF compression, and encrypted cloud storage for punch selfies and employee KYC documentation.",
    },
    {
      icon: <FiDatabase className="h-6 w-6 text-emerald-500" />,
      title: "Strict Multi-Tenant Company Scope",
      desc: "Every record, payroll row, and punch coordinate is strictly indexed by unique Company Code, preventing cross-organization visibility.",
    },
    {
      icon: <FiUsers className="h-6 w-6 text-indigo-500" />,
      title: "Tamper-Proof Audit Logging",
      desc: "Complete traceability for attendance alterations, approvals, rejected regularization requests, and salary revisions.",
    },
  ];

  return (
    <section id="security" className="py-20 sm:py-28 bg-surface border-t border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold mb-3">
            <FiShield className="h-3.5 w-3.5" />
            <span>Security & Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Enterprise Security & Reliability by Design
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-subtle">
            Built from the ground up to protect employee privacy, enforce regulatory compliance, and guarantee reliable performance.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((item, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-2xl bg-surface-muted border border-line hover:border-brand/30 hover:shadow-sm transition-all duration-200"
            >
              <div className="p-3 rounded-xl bg-surface border border-line inline-block shadow-2xs mb-5">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">{item.title}</h3>
              <p className="text-sm text-ink-subtle leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Security Checklist Strip */}
        <div className="mt-14 p-6 sm:p-8 rounded-2xl bg-surface-muted/60 border border-line flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <FiCheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">Data Integrity & Privacy Guarantee</h4>
              <p className="text-xs text-ink-subtle">Attendance photos and personal documents are never accessible publicly.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 256-bit TLS Encryption
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" /> ISO-Aligned Practices
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}

