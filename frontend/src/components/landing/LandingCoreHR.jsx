import { useState } from "react";
import { FiUsers, FiArrowRight, FiCheckCircle, FiClock, FiShield, FiFileText } from "react-icons/fi";

export default function LandingCoreHR() {
  const [hoveredTile, setHoveredTile] = useState(null);

  const tiles = [
    {
      id: 1,
      name: "Employee Management",
      role: "Central Directory & History",
      tag: "All Records",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=280&auto=format&fit=crop&q=80",
      position: "top-4 left-4 sm:top-6 sm:left-12 lg:left-20",
      anim: "animate-float-slow",
    },
    {
      id: 2,
      name: "Attendance Tracking",
      role: "Selfie Punch & Geofencing",
      tag: "On-Time Verified",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=280&auto=format&fit=crop&q=80",
      position: "top-44 left-2 sm:top-48 sm:left-6 lg:left-10",
      anim: "animate-float-delayed",
    },
    {
      id: 3,
      name: "Leave Workflows",
      role: "Casual, Sick & Earned",
      tag: "Balance Synchronized",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=280&auto=format&fit=crop&q=80",
      position: "bottom-4 left-4 sm:bottom-8 sm:left-16 lg:left-24",
      anim: "animate-float-horizontal",
    },
    {
      id: 4,
      name: "Manager Approvals",
      role: "Photo Audit & Sign-off",
      tag: "1-Click Review",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=280&auto=format&fit=crop&q=80",
      position: "top-4 right-4 sm:top-6 sm:right-12 lg:right-20",
      anim: "animate-float-delayed",
    },
    {
      id: 5,
      name: "Statutory Payroll",
      role: "EPF, ESI & TDS Breakdown",
      tag: "Direct Excel Export",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=280&auto=format&fit=crop&q=80",
      position: "top-44 right-2 sm:top-48 sm:right-6 lg:right-10",
      anim: "animate-float-slow",
    },
    {
      id: 6,
      name: "Lifecycle & Exit",
      role: "Equipment & FnF Settlement",
      tag: "NOC Issued",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=280&auto=format&fit=crop&q=80",
      position: "bottom-4 right-4 sm:bottom-8 sm:right-16 lg:right-24",
      anim: "animate-float-horizontal",
    },
  ];

  return (
    <section id="solutions" className="relative py-12 sm:py-16 overflow-hidden bg-canvas scroll-mt-24">
      {/* Background Soft Glow */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-brand/10 dark:bg-brand/15 rounded-full blur-[160px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Stage: Floating Feature Tiles & Central Typography (Section 5) */}
        <div className="relative min-h-[480px] sm:min-h-[520px] lg:min-h-[550px] flex items-center justify-center">
          
          {/* Floating Avatar Tiles with Live Product Capabilities */}
          <div className="absolute inset-0 pointer-events-none">
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className={`absolute pointer-events-auto ${tile.position} ${tile.anim} transition-all duration-300 ${
                  hoveredTile === tile.id ? "z-30 scale-108 -translate-y-2" : "z-10"
                }`}
                onMouseEnter={() => setHoveredTile(tile.id)}
                onMouseLeave={() => setHoveredTile(null)}
              >
                <div className="p-2 sm:p-2.5 rounded-3xl bg-surface/90 dark:bg-surface/80 backdrop-blur-xl border border-line shadow-lg hover:shadow-2xl transition-all duration-300 w-32 sm:w-40 md:w-48 cursor-pointer group">
                  <div className="aspect-[4/4.5] w-full rounded-2xl overflow-hidden bg-surface-muted relative mb-2">
                    <img
                      src={tile.avatar}
                      alt={tile.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-0.5 rounded-lg bg-surface/90 dark:bg-surface/90 backdrop-blur-sm text-[9px] sm:text-[10px] font-semibold text-emerald-600 flex items-center justify-between shadow-xs">
                      <span className="truncate">{tile.tag}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    </div>
                  </div>
                  <div className="px-1 text-left">
                    <div className="text-xs sm:text-sm font-bold text-ink truncate">
                      {tile.name}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-ink-subtle truncate">
                      {tile.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Central Content Block (Section 5 Headline & Copy) */}
          <div className="relative z-20 text-center max-w-lg mx-auto px-6 py-10 bg-surface/85 dark:bg-surface/65 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-2xl">
            
            {/* Top Silhouette Icon */}
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-brand/10 dark:bg-brand/20 text-brand mb-6 shadow-sm">
              <FiUsers className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
              Core HR, Without <br />
              the Complexity.
            </h2>

            {/* Subtitle */}
            <p className="mt-4 text-sm sm:text-base md:text-lg text-ink-subtle max-w-sm mx-auto leading-relaxed">
              Bring everyday people operations into one organized, accessible workspace.
            </p>

            {/* Learn More Pill Button */}
            <div className="mt-7">
              <a
                href="#audiences"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white bg-brand hover:bg-brand-hover shadow-lg shadow-brand/30 hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>Learn more</span>
                <FiArrowRight className="h-4 w-4" />
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

