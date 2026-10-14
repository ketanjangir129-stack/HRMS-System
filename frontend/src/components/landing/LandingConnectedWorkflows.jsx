import { useState, useEffect } from "react";
import {
  FiUsers,
  FiClock,
  FiCalendar,
  FiFileText,
  FiDollarSign,
  FiCheckCircle,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiLayers,
} from "react-icons/fi";

export default function LandingConnectedWorkflows() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const modules = [
    {
      id: "employees",
      name: "Employee Directory",
      tagline: "Centralized employee profiles, documents & department assignments",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      icon: <FiUsers className="w-8 h-8 text-blue-500" />,
    },
    {
      id: "attendance",
      name: "Attendance & Geofencing",
      tagline: "Selfie biometric punch with mirror-corrected photo audit & GPS radius",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      icon: <FiClock className="w-8 h-8 text-amber-500" />,
    },
    {
      id: "leaves",
      name: "Leaves & Holidays",
      tagline: "Casual, sick and earned leave balances with multi-tier manager sign-offs",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      icon: <FiCalendar className="w-8 h-8 text-emerald-500" />,
    },
    {
      id: "payroll",
      name: "Statutory Payroll",
      tagline: "Automated salary slips, EPF, ESI, TDS deductions & banking registers",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      icon: <FiDollarSign className="w-8 h-8 text-purple-500" />,
    },
    {
      id: "policies",
      name: "HR Policies & Documents",
      tagline: "Centralized company guidelines, code of conduct & employee handbooks",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      icon: <FiFileText className="w-8 h-8 text-indigo-500" />,
    },
    {
      id: "resignation",
      name: "Resignation & FnF Settlement",
      tagline: "Equipment return checklist, supervisor review & No Objection Certificate",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      icon: <FiLogOut className="w-8 h-8 text-rose-500" />,
    },
  ];

  // Auto glide through connected modules every 3.5 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % modules.length);
    }, 3400);
    return () => clearInterval(interval);
  }, [isPaused, modules.length]);

  const activeModule = modules[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? modules.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % modules.length);
  };

  return (
    <section id="workflows" className="py-12 sm:py-16 bg-canvas overflow-hidden scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header (Section 9 Requirement) */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3 border border-brand/20">
            <FiLayers className="h-3.5 w-3.5" />
            <span>Modular Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Your People Operations, <br className="hidden sm:inline" />
            Connected.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-ink-subtle">
            Every operational touchpoint—from daily check-ins to statutory payroll—flows through one unified system.
          </p>
        </div>

        {/* 3D Curved Arc Carousel (Recreating 00:07 - 00:10 with real HRMS Modules) */}
        <div
          className="relative max-w-4xl mx-auto py-4 sm:py-6"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Subtle Curved Arc Wire */}
          <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-44 border-t-2 border-dashed border-line/90 rounded-[50%] pointer-events-none -z-10" />

          {/* Module Nodes along Arc */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 pb-10">
            {modules.map((mod, idx) => {
              const isActive = activeIndex === idx;
              const dist = (idx - activeIndex + modules.length) % modules.length;
              const signedDist = dist > modules.length / 2 ? dist - modules.length : dist;
              const yOffset = Math.pow(Math.abs(signedDist), 1.6) * 16;
              const scale = isActive ? 1.25 : Math.max(0.85, 1 - Math.abs(signedDist) * 0.1);
              const opacity = Math.abs(signedDist) > 2 ? 0.35 : 1;

              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    transform: `translateY(${isActive ? -18 : yOffset}px) scale(${scale})`,
                    opacity: opacity,
                  }}
                  className={`relative p-4 sm:p-5 rounded-3xl bg-surface border transition-all duration-500 ease-out cursor-pointer ${
                    isActive
                      ? "ring-4 ring-brand/25 border-brand shadow-2xl z-20"
                      : "border-line shadow-md hover:shadow-xl hover:opacity-100 z-10"
                  }`}
                  aria-label={mod.name}
                >
                  <div className={`p-2.5 sm:p-3 rounded-2xl ${mod.bg} flex items-center justify-center transition-transform duration-300 hover:rotate-3`}>
                    {mod.icon}
                  </div>

                  {isActive && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-brand border-2 border-surface shadow-sm animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Module Banner (Matching Video 00:08 - 00:09) */}
          <div className="text-center max-w-md mx-auto mt-2 px-6 py-4 rounded-3xl bg-surface/90 dark:bg-surface/80 backdrop-blur-xl border border-line shadow-lg transition-all duration-300">
            <h3 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight animate-in fade-in zoom-in-95 duration-200">
              {activeModule.name}
            </h3>
            <p className="text-xs sm:text-sm text-ink-subtle mt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeModule.tagline}
            </p>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={handlePrev}
              className="p-3 rounded-full bg-surface hover:bg-surface-raised border border-line text-ink-muted hover:text-ink shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
              aria-label="Previous module"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {modules.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === i ? "w-7 bg-brand" : "w-2 bg-line hover:bg-ink-faint"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="p-3 rounded-full bg-surface hover:bg-surface-raised border border-line text-ink-muted hover:text-ink shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
              aria-label="Next module"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}

