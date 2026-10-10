import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tpoApi } from "../../api/tpo.api";
import {
  Users,
  Briefcase,
  FileText,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  Activity,
  CheckCircle,
  Building,
  Plus,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import {
  AnimatedWords,
  LiveStatusBeacon,
  TpoTickerRibbon,
  StaggerGrid,
  StaggerCard,
  GlassCard,
  AnimatedCounter,
  RevealOnScroll,
} from "../../components/common/MotionKit";

export default function TpoDashboard() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["tpo-dashboard-summary"],
    queryFn: async () => {
      const { data } = await tpoApi.getDashboardSummary();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
        Error loading TPO dashboard: {error.message}
      </div>
    );
  }

  const stats = summary || {};
  const recentDrives = stats.recent_drives || [];
  const totalStudents = stats.total_students || 0;
  const verifiedStudents = stats.fee_verified_students || 0;
  const placedStudents = stats.placed_students || 0;
  const feeVerifiedPct = totalStudents > 0 ? Math.round((verifiedStudents / totalStudents) * 100) : 0;
  const placementRatePct = totalStudents > 0 ? Math.round((placedStudents / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── Top Header Banner with Kinetic Words & Live Status ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20">
              <Briefcase size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <AnimatedWords
                  text="Placement Officer Command Deck"
                  className="text-2xl font-bold tracking-tight text-slate-900 font-heading"
                />
                <LiveStatusBeacon label="CAMPUS DRIVES LIVE" color="emerald" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage recruitment drives, student eligibility gating, test proctoring, and placement analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Link
            to="/tpo/drives"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus size={14} />
            <span>Launch Drive</span>
          </Link>
          <Link
            to="/tpo/fee-verification"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <FileCheck size={14} className="text-emerald-600" />
            <span>Fee Desk</span>
          </Link>
          <Link
            to="/tpo/reports"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck size={14} className="text-indigo-600" />
            <span>NBA Reports</span>
          </Link>
        </div>
      </div>

      {/* ── Live TPO Telemetry Ribbon ── */}
      <TpoTickerRibbon />

      {/* ── High-Impact Metrics Grid (Students & Drives Telemetry) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Student & Institutional Readiness Metrics
          </h2>
          <span className="text-xs text-slate-400 font-mono">Live Roster Telemetry</span>
        </div>

        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Students */}
          <StaggerCard>
            <GlassCard className="p-4.5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/50">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Candidates</p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedCounter
                    target={stats.total_students ?? 0}
                    className="font-heading text-2xl font-bold text-slate-900"
                  />
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                    Roster
                  </span>
                </div>
              </div>
            </GlassCard>
          </StaggerCard>

          {/* Card 2: Fee Verified */}
          <StaggerCard>
            <GlassCard className="p-4.5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50">
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Verified</p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedCounter
                    target={stats.fee_verified_students ?? 0}
                    className="font-heading text-2xl font-bold text-slate-900"
                  />
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                    {feeVerifiedPct}% Gate
                  </span>
                </div>
              </div>
            </GlassCard>
          </StaggerCard>

          {/* Card 3: Placed Students */}
          <StaggerCard>
            <GlassCard className="p-4.5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-200/50">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Placed Candidates</p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedCounter
                    target={stats.placed_students ?? 0}
                    className="font-heading text-2xl font-bold text-slate-900"
                  />
                  <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.2 rounded">
                    {placementRatePct}% Rate
                  </span>
                </div>
              </div>
            </GlassCard>
          </StaggerCard>

          {/* Card 4: Avg Readiness */}
          <StaggerCard>
            <GlassCard className="p-4.5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/50">
                <Activity size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Readiness</p>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedCounter
                    target={Math.round(stats.average_readiness_score || 0)}
                    suffix="%"
                    className="font-heading text-2xl font-bold text-slate-900"
                  />
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                    Index
                  </span>
                </div>
              </div>
            </GlassCard>
          </StaggerCard>
        </StaggerGrid>
      </div>

      {/* ── Drives Statistics Strip ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Placement Drives & Industry Dispatches
          </h2>
          <span className="text-xs text-slate-400 font-mono">Live Drives Telemetry</span>
        </div>

        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StaggerCard>
            <GlassCard className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/50">
                <Briefcase size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Drives</p>
                <AnimatedCounter
                  target={stats.total_drives ?? 0}
                  className="font-heading text-xl font-bold text-slate-900"
                />
              </div>
            </GlassCard>
          </StaggerCard>

          <StaggerCard>
            <GlassCard className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Drives</p>
                <AnimatedCounter
                  target={stats.active_drives ?? 0}
                  className="font-heading text-xl font-bold text-emerald-600"
                />
              </div>
            </GlassCard>
          </StaggerCard>

          <StaggerCard>
            <GlassCard className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/50">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Applications</p>
                <AnimatedCounter
                  target={stats.total_applied ?? 0}
                  className="font-heading text-xl font-bold text-slate-900"
                />
              </div>
            </GlassCard>
          </StaggerCard>

          <StaggerCard>
            <GlassCard className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-200/50">
                <FileCheck size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Selected</p>
                <AnimatedCounter
                  target={stats.total_selected ?? 0}
                  className="font-heading text-xl font-bold text-slate-900"
                />
              </div>
            </GlassCard>
          </StaggerCard>

          <StaggerCard>
            <GlassCard className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/50">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Highest CTC</p>
                <AnimatedCounter
                  target={parseFloat(stats.highest_ctc) || 0}
                  prefix="₹"
                  suffix=" LPA"
                  className="font-heading text-xl font-bold text-amber-700"
                />
              </div>
            </GlassCard>
          </StaggerCard>
        </StaggerGrid>
      </div>

      {/* ── Recent Placement Drives Table with Modern Polish ── */}
      <RevealOnScroll delay={0.1}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Building size={18} />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Recent Campus Placement Drives
                </h3>
                <p className="text-xs text-slate-500">
                  Active recruitment tracks, candidate applications, and application deadlines.
                </p>
              </div>
            </div>
            <Link
              to="/tpo/drives"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Manage All Drives <ArrowRight size={13} />
            </Link>
          </div>

          {recentDrives.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Briefcase size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm">No campus recruitment drives launched yet.</p>
              <Link
                to="/tpo/drives"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <Plus size={13} /> Launch First Drive
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-mono uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Company / Partner</th>
                    <th className="pb-3 font-semibold">Designated Role</th>
                    <th className="pb-3 font-semibold">Compensation (CTC)</th>
                    <th className="pb-3 font-semibold">Drive Status</th>
                    <th className="pb-3 font-semibold">Deadline</th>
                    <th className="pb-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDrives.map((drive) => {
                    const companyName =
                      drive.company?.name ||
                      drive.company_name ||
                      (typeof drive.company === "string" ? drive.company : "Corporate Partner");
                    const isActive = drive.status === "open" || drive.is_active;

                    return (
                      <tr key={drive.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 pr-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                              {companyName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold">{companyName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <Link
                            to={`/tpo/drives/${drive.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {drive.role}
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-700 font-semibold text-xs">
                          {drive.ctc_breakup?.ctc ? `₹${drive.ctc_breakup.ctc} LPA` : "As per role"}
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge variant={isActive ? "success" : "neutral"} className="text-[10px]">
                            {isActive ? "Live / Accepting" : "Closed"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 font-mono text-xs">
                          {drive.deadline ? new Date(drive.deadline).toLocaleDateString() : "Rolling"}
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <Link
                            to={`/tpo/drives/${drive.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View Track &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </RevealOnScroll>
    </div>
  );
}
