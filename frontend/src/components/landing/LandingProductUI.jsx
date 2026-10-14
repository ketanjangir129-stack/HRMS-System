import { useState } from "react";
import {
  FiCamera,
  FiMapPin,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiCheck,
  FiX,
  FiFileText,
  FiShield,
  FiArrowRight,
} from "react-icons/fi";

export default function LandingProductUI() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflowSteps = [
    { title: "1. Selfie Attendance", desc: "Employee captures live punch selfie with GPS coordinates" },
    { title: "2. Leave Application", desc: "Apply for leaves with live quota balance verification" },
    { title: "3. Manager Sign-off", desc: "Photo audit in lightbox and 1-click status decision" },
    { title: "4. Payroll Sync", desc: "Approved attendance days automatically fed into salary slips" },
  ];

  return (
    <section id="attendance-leave" className="py-12 sm:py-16 bg-canvas overflow-hidden scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header (Section 8 Requirement) */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3 border border-brand/20">
            <FiClock className="h-3.5 w-3.5" />
            <span>Core Workflow Synchronization</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            Attendance and Leave, <br className="hidden sm:inline" />
            Working Together.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-ink-subtle">
            Connect daily attendance, leave requests, approval status, and attendance history in a more organized employee experience.
          </p>

          {/* Workflow Step Bar */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 text-left">
            {workflowSteps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => setActiveWorkflowStep(idx)}
                className={`p-3 rounded-2xl border text-xs transition-all duration-200 cursor-pointer ${
                  activeWorkflowStep === idx
                    ? "bg-surface border-brand shadow-sm font-semibold text-brand"
                    : "bg-surface/50 border-line text-ink-subtle hover:bg-surface"
                }`}
              >
                <div className="font-bold text-ink mb-0.5">{step.title}</div>
                <div className="text-[11px] text-ink-subtle leading-tight">{step.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Realistic Interactive Product UI Mockups (Section 7) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-surface p-6 sm:p-10 lg:p-12 rounded-[2.5rem] border border-line shadow-xl">
          
          {/* Left Column: Real-time Selfie Terminal Simulation */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle block">
                  Simulated Terminal
                </span>
                <span className="text-base font-extrabold text-ink">
                  Biometric Selfie Clock-in
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                GPS Geofence Locked
              </span>
            </div>

            {/* Selfie Camera Preview Frame */}
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 border border-line shadow-inner flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
                alt="Live Camera Verification"
                className="w-full h-full object-cover opacity-85"
              />

              {/* Overlaid Facial Guide Reticle */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border border-emerald-400/40 animate-ping" />
              </div>

              {/* Status HUD Overlays */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <FiCamera className="h-3.5 w-3.5" />
                <span>UN-MIRRORED CAPTURE</span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-white">
                    <span>Rahul Gupta (EMP012)</span>
                    <span className="text-[10px] bg-emerald-500 text-white font-semibold px-1.5 py-0.2 rounded">
                      VERIFIED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
                    <FiMapPin className="h-3 w-3 text-cyan-400" />
                    <span>Headquarters Perimeter • 14m to Center</span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-400 text-sm">
                  09:14:22 AM
                </div>
              </div>
            </div>

            {/* Security Guarantee Banner */}
            <div className="p-3.5 rounded-2xl bg-brand/5 border border-brand/15 text-xs text-brand font-medium flex items-center gap-2.5">
              <FiShield className="h-4 w-4 shrink-0" />
              <span>Zero hardware overhead. Works seamlessly across phone webcams and desktop browsers.</span>
            </div>
          </div>

          {/* Right Column: Manager Approval Queue & Leave Balances */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Manager Approval Card (Direct replica of existing ApprovalRow in app) */}
            <div className="p-5 rounded-2xl bg-surface-muted border border-line space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                  Manager Lightbox Review
                </span>
                <span className="text-xs font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Pending Sign-off
                </span>
              </div>

              {/* Employee Row */}
              <div className="p-3.5 rounded-xl bg-surface border border-line shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      RG
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink">Rahul Gupta</div>
                      <div className="text-xs text-ink-subtle">Software Engineer • Engineering Dept</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-ink">Today, 09:14 AM</span>
                </div>

                {/* Audit Thumbnails & Decision Controls */}
                <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-line">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                        alt="Punch In Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] text-ink-subtle font-medium">Punch Selfie Audited</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1 shadow-xs hover:bg-emerald-700 transition-colors">
                      <FiCheck className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white flex items-center gap-1 shadow-xs hover:bg-rose-700 transition-colors">
                      <FiX className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Balances Grid (Casual, Sick, Earned) */}
            <div className="p-5 rounded-2xl bg-surface-muted border border-line space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-ink-subtle">
                  Annual Leave Quotas
                </span>
                <span className="text-emerald-600 font-semibold">Active Cycle 2026</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <span className="text-[10px] text-ink-subtle block">Casual Leave</span>
                  <span className="text-lg font-bold text-ink mt-0.5 block">8 / 12</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <span className="text-[10px] text-ink-subtle block">Sick Leave</span>
                  <span className="text-lg font-bold text-ink mt-0.5 block">6 / 8</span>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <span className="text-[10px] text-ink-subtle block">Earned Leave</span>
                  <span className="text-lg font-bold text-emerald-600 mt-0.5 block">15 Days</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-line text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiCalendar className="h-4 w-4 text-brand" />
                  <span className="font-semibold text-ink">Upcoming Republic Day</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold text-[10px]">
                  National Holiday
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

