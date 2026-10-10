import React from "react";
import {
  AnimatedWords,
  RevealOnScroll,
  StaggerGrid,
  StaggerCard,
  AnimatedCounter,
  InteractiveSearchBox,
  AdminTickerRibbon,
  LiveStatusBeacon,
  InteractiveTabSwitcher,
  GlassCard,
} from "../admin/AdminMotion";

export {
  AnimatedWords,
  RevealOnScroll,
  StaggerGrid,
  StaggerCard,
  AnimatedCounter,
  InteractiveSearchBox,
  AdminTickerRibbon,
  LiveStatusBeacon,
  InteractiveTabSwitcher,
  GlassCard,
};

/* ═══════════════════════════════════════════════════════════════════════════
   TPO LIVE TICKER RIBBON (RECRUITMENT & DRIVES TELEMETRY)
   ═══════════════════════════════════════════════════════════════════════════ */
export function TpoTickerRibbon({ items = null, className = "" }) {
  const defaultItems = [
    "💼 Campus Partner Recruitment Drives: Online & Active",
    "🛡️ AI Proctoring Integrity Engine: 99.8% Nominal",
    "🎓 Student Fee OCR Automated Verification: Operational",
    "📊 NBA & NAAC Criteria-5 Placement Audit: Auto-Sync Ready",
    "⚡ Intelligent Student Shortlisting: Multi-Branch Enforced",
    "🚀 Digital Offer Letter Verification Pipeline: Active",
  ];

  const displayItems = items || defaultItems;

  return (
    <div
      className={`py-2 px-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl overflow-hidden shadow-inner border border-blue-900/40 relative select-none ${className}`}
    >
      <div className="flex items-center gap-8 whitespace-nowrap text-xs font-mono tracking-wider uppercase font-semibold animate-marquee will-change-transform">
        {[...displayItems, ...displayItems].map((item, idx) => (
          <span key={idx} className="flex items-center gap-3 shrink-0">
            <span className="text-blue-300 font-bold">{item}</span>
            <span className="text-slate-600">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUPERADMIN LIVE PLATFORM TICKER RIBBON (CROSS-INSTITUTIONAL TELEMETRY)
   ═══════════════════════════════════════════════════════════════════════════ */
export function SuperAdminTickerRibbon({ items = null, className = "" }) {
  const defaultItems = [
    "🏛️ Multi-Tenant Institutional Federation: All Campus Nodes Healthy",
    "🛡️ Cross-College Isolation: 100% Strict RBAC Enforced",
    "⚡ Feature Flag Propagation Engine: Zero Latency Synced",
    "💳 Razorpay Institutional Subscription Gateway: 99.98% Uptime",
    "📊 National Placement Benchmarks: Real-Time Stream Active",
    "🔒 Automated Audit Trails & Security Logs: Real-Time Ingestion",
  ];

  const displayItems = items || defaultItems;

  return (
    <div
      className={`py-2 px-3 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl overflow-hidden shadow-inner border border-indigo-900/40 relative select-none ${className}`}
    >
      <div className="flex items-center gap-8 whitespace-nowrap text-xs font-mono tracking-wider uppercase font-semibold animate-marquee will-change-transform">
        {[...displayItems, ...displayItems].map((item, idx) => (
          <span key={idx} className="flex items-center gap-3 shrink-0">
            <span className="text-indigo-300 font-bold">{item}</span>
            <span className="text-slate-600">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STUDENT LIVE TICKER RIBBON (CAREER PREP & RECRUITMENT TELEMETRY)
   ═══════════════════════════════════════════════════════════════════════════ */
export function StudentTickerRibbon({ items = null, className = "" }) {
  const defaultItems = [
    "🚀 Campus Recruitment Drives: Open & Accepting Applications",
    "🎯 AI Career Readiness Quotient: Real-Time Calibrated",
    "📄 Smart Resume ATS Screening: Groq AI Powered",
    "🤖 Realistic AI Voice Mock Interviews: Instant Feedback Active",
    "⚡ Adaptive Diagnostic & Skill Tests: Available 24/7",
    "🏆 Top Corporate Tier-1 & Tier-2 Tracks: Live for Cohort",
  ];

  const displayItems = items || defaultItems;

  return (
    <div
      className={`py-2 px-3 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl overflow-hidden shadow-inner border border-emerald-900/40 relative select-none ${className}`}
    >
      <div className="flex items-center gap-8 whitespace-nowrap text-xs font-mono tracking-wider uppercase font-semibold animate-marquee will-change-transform">
        {[...displayItems, ...displayItems].map((item, idx) => (
          <span key={idx} className="flex items-center gap-3 shrink-0">
            <span className="text-emerald-300 font-bold">{item}</span>
            <span className="text-slate-600">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}


