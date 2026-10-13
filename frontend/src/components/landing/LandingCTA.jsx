import { Link } from "react-router-dom";
import { FiLogIn, FiArrowRight, FiShield } from "react-icons/fi";

export default function LandingCTA() {
  return (
    <section className="py-20 sm:py-24 bg-surface relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="relative rounded-3xl bg-gradient-to-tr from-brand via-blue-600 to-indigo-700 p-8 sm:p-14 lg:p-16 text-white shadow-2xl overflow-hidden">
          
          {/* Subtle Decorative Background Rings */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/10 blur-2xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white">
              <FiShield className="h-3.5 w-3.5" />
              <span>HRMS System • Ready for Deployment</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Transform Your Workforce Operations Today
            </h2>

            <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Experience seamless selfie attendance verification, effortless manager approvals, and compliant statutory payroll—all in one unified platform.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/login"
                replace
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-brand bg-white hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              >
                <FiLogIn className="h-5 w-5" />
                <span>Login to Portal</span>
              </Link>
            </div>

            <div className="pt-2 text-xs text-blue-200 flex items-center justify-center gap-4">
              <span>• No Hardware Required</span>
              <span>• Instant Activation</span>
              <span>• Cloud-Backed Security</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

