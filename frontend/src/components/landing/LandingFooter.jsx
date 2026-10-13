import { Link } from "react-router-dom";
import { FiLogIn, FiShield } from "react-icons/fi";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t border-line text-ink-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand to-blue-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                HR
              </div>
              <span className="text-xl font-bold text-ink tracking-tight">
                HRMS System
              </span>
            </div>

            <p className="text-sm text-ink-subtle max-w-sm leading-relaxed">
              An enterprise-grade workforce management platform uniting selfie-verified biometric attendance, geofence validation, multi-tier approvals, automated payroll, and digital employee onboarding.
            </p>

            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-4">
              Core Modules
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#attendance" className="hover:text-brand transition-colors">
                  Smart Camera Attendance
                </a>
              </li>
              <li>
                <a href="#attendance" className="hover:text-brand transition-colors">
                  GPS Office Geofencing
                </a>
              </li>
              <li>
                <a href="#payroll" className="hover:text-brand transition-colors">
                  Automated Payroll & Slips
                </a>
              </li>
              <li>
                <a href="#onboarding" className="hover:text-brand transition-colors">
                  Paperless Onboarding
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-brand transition-colors">
                  Role-Based Security
                </a>
              </li>
            </ul>
          </div>

          {/* Portal Access */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-4">
              Portal Access
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" replace className="inline-flex items-center gap-1.5 hover:text-brand transition-colors font-medium">
                  <FiLogIn className="h-3.5 w-3.5" />
                  <span>Company / Employee Login</span>
                </Link>
              </li>
              <li>
                <Link to="/login" replace className="hover:text-brand transition-colors">
                  Forgot Password Help
                </Link>
              </li>
              <li>
                <a href="#overview" className="hover:text-brand transition-colors">
                  Back to Top
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-subtle">
          <p>© {currentYear} HRMS System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              <FiShield className="h-3.5 w-3.5 text-brand" />
              Enterprise Privacy & Security
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}

