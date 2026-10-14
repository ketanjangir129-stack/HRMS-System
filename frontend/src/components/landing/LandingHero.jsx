import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheck,
  FiZap,
  FiMapPin,
  FiEye,
  FiArrowRight,
  FiLogIn,
  FiShield,
  FiFileText,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";

export default function LandingHero() {
  const [activeNode, setActiveNode] = useState(null);

  // Authenticated state
  const companyCode = localStorage.getItem("companyCode");
  const authToken = localStorage.getItem("authToken");
  const isLoggedIn = Boolean(companyCode && authToken);

  const operationalNodes = [
    {
      id: "attendance",
      title: "Selfie Punch-In",
      desc: "Live camera facial verification",
      icon: <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />,
      bg: "bg-amber-100 dark:bg-amber-950/60",
      border: "border-amber-400/40",
      boxShadow: "0 10px 25px -5px rgba(245, 158, 11, 0.25)",
      position: "-top-3 left-2 sm:top-2 sm:left-8 md:top-3 md:left-20",
      anim: "animate-float-slow",
      tag: "9:14 AM • On Time",
    },
    {
      id: "geofence",
      title: "GPS Geofencing",
      desc: "Office perimeter validation",
      icon: <FiMapPin className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />,
      bg: "bg-cyan-100 dark:bg-cyan-950/60",
      border: "border-cyan-400/40",
      boxShadow: "0 10px 25px -5px rgba(6, 182, 212, 0.25)",
      position: "bottom-10 left-2 sm:bottom-14 sm:left-10 md:bottom-12 md:left-24",
      anim: "animate-float-delayed",
      tag: "Within 25m Radius",
    },
    {
      id: "approvals",
      title: "Leave Approvals",
      desc: "Multi-tier manager sign-off",
      icon: <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />,
      bg: "bg-rose-100 dark:bg-rose-950/60",
      border: "border-rose-400/40",
      boxShadow: "0 10px 25px -5px rgba(244, 63, 94, 0.25)",
      position: "-top-4 right-2 sm:top-2 sm:right-8 md:top-3 md:right-20",
      anim: "animate-float-horizontal",
      tag: "1-Click Approvals",
    },
    {
      id: "payroll",
      title: "Statutory Payroll",
      desc: "EPF, ESI & TDS automated",
      icon: <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />,
      bg: "bg-emerald-100 dark:bg-emerald-950/60",
      border: "border-emerald-400/40",
      boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.25)",
      position: "bottom-10 right-2 sm:bottom-14 sm:right-10 md:bottom-12 md:right-24",
      anim: "animate-float-slow",
      tag: "100% Calculated",
    },
  ];

  return (
    <section id="overview" className="relative pt-20 sm:pt-24 pb-10 sm:pb-14 overflow-hidden bg-canvas scroll-mt-24">
      {/* Background Soft Glows */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[950px] h-[480px] bg-gradient-to-tr from-brand/12 via-purple-500/8 to-transparent blur-[140px] rounded-full opacity-70" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Animated Central Node & Radiating Operational Nodes (Section 3 Visual) */}
        <div className="relative max-w-3xl mx-auto h-[280px] sm:h-[330px] md:h-[360px] flex items-center justify-center mb-5 sm:mb-6">
          
          {/* Curved Radiating SVG Connector Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            viewBox="0 0 700 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="glowLine1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="50%" stopColor="var(--color-brand)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="glowLine2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="50%" stopColor="var(--color-brand)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="glowLine3" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="glowLine4" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Arcs connecting Center (350, 210) to 4 corner icons */}
            <path d="M350 210 Q 240 140 150 70" stroke="url(#glowLine1)" strokeWidth="2.5" className="beam-animated" />
            <path d="M350 210 Q 240 270 160 330" stroke="url(#glowLine2)" strokeWidth="2.5" className="beam-animated" />
            <path d="M350 210 Q 460 140 540 65" stroke="url(#glowLine3)" strokeWidth="2.5" className="beam-animated" />
            <path d="M350 210 Q 460 280 540 335" stroke="url(#glowLine4)" strokeWidth="2.5" className="beam-animated" />
          </svg>

          {/* Central HR Core Hub */}
          <div className="relative z-20 flex items-center justify-center">
            {/* Glowing Aura Ring */}
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-brand via-purple-500 to-indigo-500 opacity-30 blur-2xl animate-pulse-ring" />
            
            {/* Hub Card */}
            <div className="relative p-2.5 rounded-[2.2rem] bg-surface/85 dark:bg-surface/65 backdrop-blur-xl border border-white/80 dark:border-white/15 shadow-2xl transition-all duration-300 hover:scale-105 group cursor-pointer">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-brand via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand/40 group-hover:rotate-3 transition-transform duration-300">
                {/* <FiCheck className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" /> */}
                <h1 className="text-2xl sm:text-2xl font-extrabold tracking-tight">HRMS</h1>
              </div>
            </div>
          </div>

          {/* 4 Connected Floating Operational Nodes */}
          {operationalNodes.map((node) => (
            <div
              key={node.id}
              className={`absolute z-20 ${node.position} ${node.anim}`}
              onMouseEnter={() => setActiveNode(node.id)}
              onMouseLeave={() => setActiveNode(null)}
            >
              <div
                style={{ boxShadow: node.boxShadow }}
                className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-surface/90 dark:bg-surface/80 border ${node.border} backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer ${
                  activeNode === node.id ? "scale-110 ring-2 ring-brand" : ""
                }`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${node.bg} flex items-center justify-center shrink-0`}>
                  {node.icon}
                </div>
                <div className="hidden sm:block text-left pr-2">
                  <div className="text-xs font-bold text-ink leading-tight">{node.title}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">{node.tag}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Floating Avatar Badges at Left and Right */}
          <div className="absolute top-24 left-1 sm:left-4 md:left-6 z-15 animate-float-delayed">
            <div className="p-1 rounded-2xl bg-surface/90 dark:bg-surface/80 backdrop-blur-md border border-line shadow-lg hover:scale-110 transition-transform">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Employee Avatar"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover"
              />
            </div>
          </div>

          <div className="absolute bottom-24 right-1 sm:right-4 md:right-6 z-15 animate-float-slow">
            <div className="p-1 rounded-2xl bg-surface/90 dark:bg-surface/80 backdrop-blur-md border border-line shadow-lg hover:scale-110 transition-transform">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="Employee Avatar"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover"
              />
            </div>
          </div>

        </div>

        {/* Hero Headline & Supporting Copy (Exact Section 3 Requirement) */}
        <div className="text-center max-w-4xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-ink tracking-tight leading-[1.08]">
            Everything HR. <br />
            <span className="bg-gradient-to-r from-brand via-purple-600 to-indigo-500 bg-clip-text text-transparent">
              One Connected Platform.
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-ink-subtle max-w-2xl mx-auto leading-relaxed">
            Manage your people, attendance, leave, policies, approvals, and employee lifecycle from one streamlined HRMS.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={isLoggedIn ? "/dashboard" : "/login"}
              replace
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-white bg-brand hover:bg-brand-hover shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>Open HRMS</span>
              <FiArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#solutions"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-base font-semibold text-ink bg-surface hover:bg-surface-raised border border-line shadow-sm hover:shadow transition-all duration-200 cursor-pointer hover:scale-105"
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* Value Micro-Pills */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-ink-subtle">
            <span className="flex items-center gap-1.5 font-medium">
              <FiCheck className="text-emerald-500 h-4 w-4" /> Biometric Selfie Verification
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <FiCheck className="text-emerald-500 h-4 w-4" /> GPS Geofence Perimeter
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <FiCheck className="text-emerald-500 h-4 w-4" /> Multi-Tier Approvals
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <FiShield className="text-brand h-4 w-4" /> Role-Based Access
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}
