import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSun, FiMoon, FiMenu, FiX, FiLogIn, FiArrowRight } from "react-icons/fi";
import useTheme from "../../hooks/useTheme";

export default function LandingNavbar() {
  const { isDark, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Check login state
  const companyCode = localStorage.getItem("companyCode");
  const authToken = localStorage.getItem("authToken");
  const isLoggedIn = Boolean(companyCode && authToken);

  const navLinks = [
    { label: "Overview", id: "overview" },
    { label: "Solutions", id: "solutions" },
    { label: "Audiences", id: "audiences" },
    { label: "Attendance", id: "attendance-leave" },
    { label: "Workflows", id: "workflows" },
    { label: "Lifecycle", id: "lifecycle" },
    { label: "Principles", id: "principles" },
  ];

  useEffect(() => {
    // Smooth scroll on initial load if hash is present
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const navOffset = 80;
          const pos = el.getBoundingClientRect().top + window.pageYOffset - navOffset;
          window.scrollTo({ top: Math.max(0, pos), behavior: "smooth" });
          setActiveSection(id);
        }
      }, 150);
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Scroll spy for active section
      const sectionIds = navLinks.map((l) => l.id);
      const scrollPos = window.scrollY + 140;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const navOffset = 80;
      const elementPos = element.getBoundingClientRect().top;
      const offsetPos = elementPos + window.pageYOffset - navOffset;
      window.scrollTo({
        top: Math.max(0, offsetPos),
        behavior: "smooth",
      });
      setActiveSection(targetId);
      window.history.replaceState(null, null, `#${targetId}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-surface/90 backdrop-blur-md shadow-sm border-b border-line"
          : "bg-surface/75 backdrop-blur-sm border-b border-line/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <a
            href="#overview"
            onClick={(e) => handleNavClick(e, "overview")}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
          >
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-brand to-purple-600 flex items-center justify-center text-white shadow-md shadow-brand/25 group-hover:scale-105 transition-transform duration-200">
              <span className="font-extrabold text-sm sm:text-base tracking-tight">HR</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-ink">
                  HRMS System
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand/10 text-brand border border-brand/20">
                  Enterprise
                </span>
              </div>
              <span className="text-[11px] text-ink-subtle -mt-0.5 hidden sm:block">
                Workforce & People Operations
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 bg-surface-raised/60 p-1.5 rounded-2xl border border-line/60">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-surface text-brand font-semibold shadow-xs"
                      : "text-ink-muted hover:text-ink hover:bg-surface/60"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="p-2 sm:p-2.5 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-raised border border-line transition-colors cursor-pointer"
            >
              {isDark ? <FiSun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" /> : <FiMoon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            {/* Login or Dashboard CTA */}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white bg-brand hover:bg-brand-hover shadow-sm shadow-brand/25 transition-all duration-200 cursor-pointer"
              >
                <span>Open HRMS</span>
                <FiArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link
                to="/login"
                replace
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white bg-brand hover:bg-brand-hover shadow-sm shadow-brand/25 hover:shadow-md hover:shadow-brand/35 transition-all duration-200 cursor-pointer hover:scale-105"
              >
                <FiLogIn className="h-3.5 w-3.5" />
                <span>Open HRMS</span>
              </Link>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="xl:hidden p-2 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-raised border border-line transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-line bg-surface/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-brand/10 text-brand font-semibold"
                      : "text-ink-muted hover:text-ink hover:bg-surface-raised"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-line flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-raised border border-line cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {isDark ? <FiSun className="h-4 w-4 text-amber-400" /> : <FiMoon className="h-4 w-4" />}
                <span>{isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}</span>
              </span>
              <span className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">{isDark ? "Dark" : "Light"}</span>
            </button>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/dashboard");
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs sm:text-sm font-semibold text-white bg-brand hover:bg-brand-hover shadow-sm transition-all"
              >
                <span>Open HRMS Dashboard</span>
                <FiArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/login"
                replace
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs sm:text-sm font-semibold text-white bg-brand hover:bg-brand-hover shadow-sm transition-all"
              >
                <FiLogIn className="h-4 w-4" />
                <span>Open HRMS</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
