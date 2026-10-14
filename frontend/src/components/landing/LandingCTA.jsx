import { Link } from "react-router-dom";
import { FiLogIn, FiArrowRight, FiShield, FiArrowUp } from "react-icons/fi";

export default function LandingCTA() {
  const companyCode = localStorage.getItem("companyCode");
  const authToken = localStorage.getItem("authToken");
  const isLoggedIn = Boolean(companyCode && authToken);

  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-10 sm:py-14 bg-canvas relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="relative rounded-[2.5rem] bg-gradient-to-tr from-brand via-indigo-600 to-purple-700 p-6 sm:p-10 lg:p-12 text-white shadow-2xl overflow-hidden">
          
          {/* Subtle Decorative Background Rings */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/15 blur-2xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white">
              <FiShield className="h-3.5 w-3.5" />
              <span>HRMS System • Enterprise Production Ready</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Make Everyday HR Simpler.
            </h2>

            <p className="text-base sm:text-lg text-indigo-100 max-w-2xl mx-auto leading-relaxed">
              Bring employee information, attendance, leave, policies, and approvals into one organized workspace.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={isLoggedIn ? "/dashboard" : "/login"}
                replace
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold text-brand bg-white hover:bg-slate-50 shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>Open HRMS</span>
                <FiArrowRight className="h-5 w-5" />
              </Link>

              <button
                type="button"
                onClick={scrollToTop}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-base font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/20 transition-all duration-200 cursor-pointer hover:scale-105"
              >
                <FiArrowUp className="h-4 w-4" />
                <span>Back to Top</span>
              </button>
            </div>

            <div className="pt-4 text-xs text-indigo-200 flex flex-wrap items-center justify-center gap-y-2 gap-x-6">
              <span>• Zero Hardware Overhead</span>
              <span>• 100% Mobile & Web Ready</span>
              <span>• Role-Based Access Control</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
