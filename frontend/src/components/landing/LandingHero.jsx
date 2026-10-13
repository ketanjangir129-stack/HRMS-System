import { Link } from "react-router-dom";
import { FiLogIn, FiArrowDown, FiCheckCircle, FiShield, FiClock, FiMapPin, FiCamera } from "react-icons/fi";
import heroImg from "../../assets/hero.png";

export default function LandingHero() {
  return (
    <section id="overview" className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden bg-canvas">
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand/12 via-blue-500/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs sm:text-sm font-medium shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span>HRMS System • Unified Enterprise Workforce Portal</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]">
            Modern Workforce Management,{" "}
            <span className="bg-gradient-to-r from-brand via-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Built for Scale & Precision
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-ink-subtle max-w-3xl mx-auto leading-relaxed">
            Eliminate attendance fraud and payroll friction. Real-time selfie camera punching, GPS geofencing, multi-tier manager approvals, statutory payroll, and end-to-end employee lifecycle management.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              replace
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-brand hover:bg-brand-hover shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/35 transition-all duration-200 cursor-pointer"
            >
              <FiLogIn className="h-5 w-5" />
              <span>Login to Portal</span>
            </Link>

            <a
              href="#attendance"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium text-ink bg-surface hover:bg-surface-raised border border-line shadow-xs transition-colors cursor-pointer"
            >
              <span>Explore Features</span>
              <FiArrowDown className="h-4 w-4 text-ink-subtle" />
            </a>
          </div>

          {/* Key Value Micro-Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
              Mirror-Corrected Live Selfie Punch
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
              Office GPS Geofencing
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
              Automated Statutory Payroll
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <FiShield className="h-4 w-4 text-brand" />
              Role-Based Access Control
            </span>
          </div>

        </div>

        {/* Hero Visual Mockup Container */}
        <div className="mt-14 sm:mt-16 relative max-w-5xl mx-auto">
          
          {/* Main Visual Frame */}
          <div className="relative rounded-2xl p-2 sm:p-3 bg-surface-raised/80 border border-line shadow-2xl backdrop-blur-sm">
            <div className="relative rounded-xl overflow-hidden border border-line/80 bg-surface">
              
              {/* Browser/Window Header Bar */}
              <div className="px-4 py-3 bg-surface-muted border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
                  <span className="ml-3 text-xs font-mono text-ink-faint hidden sm:inline">
                    https://hrms.system/dashboard/attendance
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All Services Live
                </div>
              </div>

              {/* Graphic Preview */}
              <div className="relative aspect-[16/9] w-full bg-surface-muted flex items-center justify-center overflow-hidden">
                <img
                  src={heroImg}
                  alt="HRMS System Dashboard Preview"
                  className="w-full h-full object-cover object-top"
                  loading="eager"
                />

                {/* Overlaid Live Badges */}
                {/* Floating Card 1: Verified Attendance */}
                <div className="absolute top-4 left-4 sm:top-8 sm:left-8 bg-surface/95 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-line shadow-lg hidden sm:flex items-center gap-3 animate-bounce-subtle">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <FiCamera className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-ink">Verified Punch In</span>
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-600 font-semibold px-1.5 py-0.5 rounded">
                        09:12 AM
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-ink-subtle mt-0.5">
                      <FiMapPin className="h-3 w-3 text-brand" />
                      <span>Headquarters • GPS Verified</span>
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: 1-Click Manager Approval */}
                <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 bg-surface/95 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-line shadow-lg hidden sm:flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                    <FiClock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink">Manager Approvals</div>
                    <div className="text-[11px] text-ink-subtle mt-0.5">
                      Photo Audit & Lightbox Review Enabled
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

