// SuperAdminDashboard — Premium Cross-Campus Institutional Control Deck
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Briefcase,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Ban,
  Activity,
  Layers,
} from "lucide-react";
import { useSuperAdminStore } from "./superAdminStore";
import { format } from "date-fns";
import {
  AnimatedWords,
  SuperAdminTickerRibbon,
  LiveStatusBeacon,
  StaggerGrid,
  StaggerCard,
  GlassCard,
  AnimatedCounter,
  RevealOnScroll,
} from "../../components/common/MotionKit";

const ICON_MAP = {
  green: { Icon: Plus, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  amber: { Icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  blue: { Icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200" },
  red: { Icon: Ban, color: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-200" },
};

export default function SuperAdminDashboard() {
  const colleges = useSuperAdminStore((s) => s.colleges);
  const featureRequests = useSuperAdminStore((s) => s.featureRequests);
  const activity = useSuperAdminStore((s) => s.activity);
  const navigate = useNavigate();

  const totalColleges = colleges.length;
  const totalStudents = colleges.reduce((sum, c) => sum + (c.students || 0), 0);
  const totalTPOs = colleges.reduce((sum, c) => sum + (c.tpos || 0), 0);
  const totalDrives = colleges.reduce((sum, c) => sum + (c.drives || 0), 0);
  const pendingRequests = featureRequests.filter(
    (r) => r.status === "pending" || r.status === "pending_review"
  ).length;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── Title Banner with Kinetic Words & Live Status Beacon ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold shadow-md shadow-indigo-500/20">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <AnimatedWords
                  text="SuperAdmin Command Deck"
                  className="text-2xl font-bold tracking-tight text-slate-900 font-heading"
                />
                <LiveStatusBeacon label="ACTIVE FEDERATION" color="indigo" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Global institutional ecosystem governance, cross-campus licensing, and multi-tenant oversight.
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/superadmin/colleges")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 size={14} className="text-blue-600" />
            <span>Colleges Directory</span>
          </button>
          <button
            onClick={() => navigate("/superadmin/features")}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Manage Add-ons</span>
          </button>
        </div>
      </div>

      {/* ── Live Cross-Campus Telemetry Ribbon ── */}
      <SuperAdminTickerRibbon />

      {/* ── Top-line Luxury KPI Metrics Grid ── */}
      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Colleges */}
        <StaggerCard>
          <GlassCard
            onClick={() => navigate("/superadmin/colleges")}
            className="p-4.5 flex items-center gap-4 cursor-pointer hover:border-indigo-300 transition-all"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/50">
              <Building2 size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Colleges</p>
              <AnimatedCounter
                target={totalColleges}
                className="font-heading text-2xl font-bold text-slate-900"
              />
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded ml-1">
                +2 Qtr
              </span>
            </div>
          </GlassCard>
        </StaggerCard>

        {/* Metric 2: Enrolled Students */}
        <StaggerCard>
          <GlassCard className="p-4.5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/50">
              <GraduationCap size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
              <AnimatedCounter
                target={totalStudents}
                className="font-heading text-2xl font-bold text-slate-900"
              />
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded ml-1">
                Active
              </span>
            </div>
          </GlassCard>
        </StaggerCard>

        {/* Metric 3: Placement Officers */}
        <StaggerCard>
          <GlassCard className="p-4.5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-200/50">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total TPOs</p>
              <AnimatedCounter
                target={totalTPOs}
                className="font-heading text-2xl font-bold text-slate-900"
              />
              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.2 rounded ml-1">
                Verified
              </span>
            </div>
          </GlassCard>
        </StaggerCard>

        {/* Metric 4: Placement Drives */}
        <StaggerCard>
          <GlassCard className="p-4.5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50">
              <Briefcase size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campus Drives</p>
              <AnimatedCounter
                target={totalDrives}
                className="font-heading text-2xl font-bold text-slate-900"
              />
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded ml-1">
                Global
              </span>
            </div>
          </GlassCard>
        </StaggerCard>

        {/* Metric 5: Pending Requests */}
        <StaggerCard>
          <GlassCard
            onClick={() => navigate("/superadmin/features", { state: { tab: "requests" } })}
            className={`p-4.5 flex items-center gap-4 cursor-pointer transition-all ${
              pendingRequests > 0 ? "border-amber-300 ring-2 ring-amber-500/10 bg-amber-50/30" : ""
            }`}
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                pendingRequests > 0
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 animate-pulse"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Action</p>
              <AnimatedCounter
                target={pendingRequests}
                className={`font-heading text-2xl font-bold ${
                  pendingRequests > 0 ? "text-amber-700" : "text-slate-900"
                }`}
              />
              {pendingRequests > 0 ? (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded ml-1">
                  Review
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded ml-1">
                  Clean
                </span>
              )}
            </div>
          </GlassCard>
        </StaggerCard>
      </StaggerGrid>

      {/* ── Recent Activity Feed & Global Alerts ── */}
      <RevealOnScroll delay={0.15}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Global System Activity & Ingestion Feed
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time audit logs across institutional onboarding, feature activations, and drive dispatches.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/superadmin/audit-log")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Full Audit Trail <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 pt-2">
            {activity.slice(0, 8).map((item) => {
              const mapped = ICON_MAP[item.color] || ICON_MAP.blue;
              const { Icon } = mapped;
              return (
                <div
                  key={item.id}
                  className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl ${mapped.bg} ${mapped.color} ring-1 ${mapped.ring} flex items-center justify-center shrink-0`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-700 font-medium truncate">
                      {item.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0">
                    <Clock size={12} />
                    <span>{format(new Date(item.time), "MMM d, yyyy")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
}
