import React from "react";
import { useQuery } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import {
  Briefcase,
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  PieChart,
  Award,
  Sparkles,
  Percent
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import {
  AnimatedWords,
  LiveStatusBeacon,
  TpoTickerRibbon,
  StaggerGrid,
  GlassCard,
  AnimatedCounter,
  RevealOnScroll
} from "../../components/common/MotionKit";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtLpa(val) {
  if (val == null) return "—";
  return `₹${val} LPA`;
}

function placementRate(applied, selected) {
  if (!applied) return "0.0%";
  return `${((selected / applied) * 100).toFixed(1)}%`;
}

// ─── Package tile ─────────────────────────────────────────────────────────────
function PkgTile({ label, value, color, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-6 px-4 text-center group hover:bg-slate-50/60 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        {Icon && <Icon size={14} className="text-slate-400" />}
        <span>{label}</span>
      </div>
      <p className={`text-3xl font-extrabold font-heading font-mono ${color}`}>{value}</p>
    </div>
  );
}

// ─── Custom bar chart tooltip ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white px-4 py-3 shadow-xl text-xs space-y-1">
      <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="capitalize text-slate-400">{p.name}:</span>
          <span className="font-bold font-mono" style={{ color: p.color }}>
            {p.value} students
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tpo-overview-analytics"],
    queryFn: async () => {
      const { data } = await tpoApi.getOverviewAnalytics();
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
        <p className="font-bold">Error loading placement analytics</p>
        <p className="text-xs">{error.message}</p>
      </div>
    );
  }

  const { total_drives, total_applicants, total_selected, department_stats, package_stats } = data;

  // Sort department table descending by placement rate
  const sortedDepts = [...department_stats].sort(
    (a, b) => b.selected / (b.applied || 1) - a.selected / (a.applied || 1)
  );

  const hasData = department_stats.length > 0;
  const overallRate = total_applicants > 0 ? Math.round((total_selected / total_applicants) * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
              <BarChart2 size={13} className="text-blue-600" />
              <span>Institutional Intelligence</span>
            </span>
            <LiveStatusBeacon label="DATA CONSOLIDATED" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Institutional Placement Analytics" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Aggregate institutional statistics, CTC package distributions, and branch-level placement performance.
          </p>
        </div>
      </div>

      {/* ── TPO Live Telemetry Ribbon ── */}
      <TpoTickerRibbon />

      {/* ── Stat strip ── */}
      <StaggerGrid columns="grid-cols-2 lg:grid-cols-4" gap="gap-4">
        <GlassCard className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Drives Run</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Briefcase size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            <AnimatedCounter target={total_drives} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Conducted recruitment events</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applicants</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-indigo-600 font-mono">
            <AnimatedCounter target={total_applicants} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Active drive applications</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Selected</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono">
            <AnimatedCounter target={total_selected} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Corporate placement offers</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Rate</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Percent size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-purple-600 font-mono">
            <AnimatedCounter target={overallRate} />%
          </div>
          <p className="text-xs text-slate-500 mt-1">Applicant conversion ratio</p>
        </GlassCard>
      </StaggerGrid>

      {/* ── Package stats ── */}
      <RevealOnScroll direction="up" delay={0.1}>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Compensation &amp; Package Distribution (₹ CTC)
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verified Offers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <PkgTile
              label="Highest CTC"
              value={fmtLpa(package_stats.top)}
              color="text-emerald-600"
              icon={Award}
            />
            <PkgTile
              label="Median CTC"
              value={fmtLpa(package_stats.median)}
              color="text-blue-600"
              icon={Sparkles}
            />
            <PkgTile
              label="Average CTC"
              value={fmtLpa(package_stats.average)}
              color="text-purple-600"
              icon={TrendingUp}
            />
          </div>
        </div>
      </RevealOnScroll>

      {/* ── Department bar chart ── */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Department-wise Placement Volume
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">Applied vs Selected</span>
        </div>

        {!hasData ? (
          <div className="py-16 text-center text-slate-500">
            <BarChart2 size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No application data logged yet.</p>
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={department_stats}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                barCategoryGap="28%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  formatter={(value) =>
                    value === "applied" ? "Applied Students" : "Selected Students"
                  }
                />
                <Bar dataKey="applied" fill="#3b82f6" radius={[6, 6, 0, 0]} name="applied" />
                <Bar dataKey="selected" fill="#10b981" radius={[6, 6, 0, 0]} name="selected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Placement rate table ── */}
      {hasData && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-0">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Placement Conversion Rate by Department
            </h2>
            <span className="text-xs text-slate-500 font-medium">Ranked by success percentage</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Department Branch</th>
                  <th className="px-6 py-3.5 font-semibold text-center">Applied</th>
                  <th className="px-6 py-3.5 font-semibold text-center">Selected</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Placement Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDepts.map((dept) => {
                  const rate = dept.applied
                    ? (dept.selected / dept.applied) * 100
                    : 0;
                  const rateColor =
                    rate >= 60
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : rate >= 30
                      ? "text-amber-700 bg-amber-50 border-amber-200"
                      : "text-rose-700 bg-rose-50 border-rose-200";
                  return (
                    <tr
                      key={dept.department}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {dept.department}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600 font-mono">
                        {dept.applied}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-900 font-mono font-bold">
                        {dept.selected}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-mono border ${rateColor}`}>
                          {placementRate(dept.applied, dept.selected)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
