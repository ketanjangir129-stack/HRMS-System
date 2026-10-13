import { FiCheckCircle, FiShield, FiTrendingUp, FiZap } from "react-icons/fi";

export default function LandingStats() {
  const stats = [
    {
      value: "99.9%",
      label: "Punch Accuracy",
      desc: "Mirror-corrected selfie capture with GPS coordinate validation",
      icon: <FiCheckCircle className="h-5 w-5 text-emerald-500" />,
    },
    {
      value: "10x",
      label: "Faster Payroll Run",
      desc: "Automated calculations for EPF, ESI, TDS, and deductions",
      icon: <FiZap className="h-5 w-5 text-amber-500" />,
    },
    {
      value: "100%",
      label: "Paperless Lifecycle",
      desc: "Cloudinary encrypted document storage & digital onboarding",
      icon: <FiTrendingUp className="h-5 w-5 text-brand" />,
    },
    {
      value: "5 Levels",
      label: "Granular RBAC",
      desc: "Owner, Admin, HR, Manager, and Employee scoped security",
      icon: <FiShield className="h-5 w-5 text-blue-500" />,
    },
  ];

  return (
    <section className="py-12 bg-surface border-y border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-surface-muted border border-line hover:border-brand/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="p-2.5 rounded-xl bg-surface border border-line shadow-2xs">
                  {stat.icon}
                </span>
                <span className="text-3xl font-extrabold text-ink tracking-tight font-mono">
                  {stat.value}
                </span>
              </div>
              <h3 className="text-base font-bold text-ink mb-1">{stat.label}</h3>
              <p className="text-xs text-ink-subtle leading-relaxed">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

