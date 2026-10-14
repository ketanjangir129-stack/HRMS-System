import { Link } from "react-router-dom";
import { FiLogIn, FiShield, FiArrowRight } from "react-icons/fi";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();
  const companyCode = localStorage.getItem("companyCode");
  const authToken = localStorage.getItem("authToken");
  const isLoggedIn = Boolean(companyCode && authToken);

  const scrollTo = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const navOffset = 80;
      const pos = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
      window.scrollTo({ top: pos, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative bg-surface border-t border-line text-ink-subtle overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 sm:pt-14 sm:pb-10">
        
        {/* Main Grid Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-10">
          
          {/* Brand Col */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-brand to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-brand/20">
                HR
              </div>
              <span className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                HRMS System
              </span>
            </div>

            <p className="text-sm sm:text-base text-ink-subtle max-w-md leading-relaxed">
              Everything HR. One Connected Platform. Manage your people, attendance, leave, policies, approvals, and employee lifecycle from one streamlined HRMS.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production Workforce Services Active</span>
            </div>
          </div>

          {/* Core Modules Links */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-4">
              Core Modules
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#attendance-leave" onClick={(e) => scrollTo(e, "attendance-leave")} className="hover:text-brand transition-colors">
                  Selfie Attendance & GPS
                </a>
              </li>
              <li>
                <a href="#attendance-leave" onClick={(e) => scrollTo(e, "attendance-leave")} className="hover:text-brand transition-colors">
                  Leave & Quota Tracking
                </a>
              </li>
              <li>
                <a href="#audiences" onClick={(e) => scrollTo(e, "audiences")} className="hover:text-brand transition-colors">
                  Statutory Payroll (PF/ESI)
                </a>
              </li>
              <li>
                <a href="#lifecycle" onClick={(e) => scrollTo(e, "lifecycle")} className="hover:text-brand transition-colors">
                  Digital KYC Onboarding
                </a>
              </li>
              <li>
                <a href="#lifecycle" onClick={(e) => scrollTo(e, "lifecycle")} className="hover:text-brand transition-colors">
                  Exit & FnF Settlement
                </a>
              </li>
            </ul>
          </div>

          {/* Platform Navigation */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-4">
              Platform Access
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to={isLoggedIn ? "/dashboard" : "/login"}
                  replace
                  className="inline-flex items-center gap-1.5 text-brand font-semibold hover:text-brand-hover"
                >
                  <FiLogIn className="w-3.5 h-3.5" />
                  <span>Open HRMS Portal</span>
                </Link>
              </li>
              <li>
                <a href="#solutions" onClick={(e) => scrollTo(e, "solutions")} className="hover:text-brand transition-colors">
                  Core Solutions
                </a>
              </li>
              <li>
                <a href="#workflows" onClick={(e) => scrollTo(e, "workflows")} className="hover:text-brand transition-colors">
                  Modular Architecture
                </a>
              </li>
              <li>
                <a href="#principles" onClick={(e) => scrollTo(e, "principles")} className="hover:text-brand transition-colors">
                  Product Principles
                </a>
              </li>
              <li>
                <a href="#overview" onClick={(e) => scrollTo(e, "overview")} className="hover:text-brand transition-colors">
                  Back to Top
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-line/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-subtle">
          <p>© {currentYear} HRMS System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 font-medium">
              <FiShield className="h-3.5 w-3.5 text-brand" />
              Role-Based Access Control & Encrypted Cloudinary Storage
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
