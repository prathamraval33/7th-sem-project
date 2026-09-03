import React from "react";
import { useQuery } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import {
  Briefcase,
  Users,
  CheckCircle2,
  TrendingUp,
  BarChart2,
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
import StatCard from "../../components/common/StatCard";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";

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
function PkgTile({ label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-5 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold font-heading ${color}`}>{value}</p>
    </div>
  );
}

// ─── Custom bar chart tooltip ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-900 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
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

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );

  if (error)
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading analytics: {error.message}
      </div>
    );

  const { total_drives, total_applicants, total_selected, department_stats, package_stats } = data;

  // Sort department table descending by placement rate
  const sortedDepts = [...department_stats].sort(
    (a, b) => b.selected / (b.applied || 1) - a.selected / (a.applied || 1)
  );

  const hasData = department_stats.length > 0;

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Placement Analytics
        </h1>
        <p className="text-slate-600 mt-1">
          Aggregate statistics across all placement drives.
        </p>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Drives Run"
          value={total_drives}
          icon={Briefcase}
          accent="brand"
        />
        <StatCard
          label="Total Applicants"
          value={total_applicants}
          icon={Users}
          accent="accent"
        />
        <StatCard
          label="Total Placed"
          value={total_selected}
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      {/* ── Package stats ── */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" />
          <h2 className="text-base font-semibold text-slate-900 font-heading">
            Package Statistics (₹ LPA)
          </h2>
        </div>
        <div className="flex divide-x divide-border">
          <PkgTile
            label="Highest CTC"
            value={fmtLpa(package_stats.top)}
            color="text-emerald-600"
          />
          <PkgTile
            label="Median CTC"
            value={fmtLpa(package_stats.median)}
            color="text-blue-600"
          />
          <PkgTile
            label="Average CTC"
            value={fmtLpa(package_stats.average)}
            color="text-violet-600"
          />
        </div>
      </Card>

      {/* ── Department bar chart ── */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 size={16} className="text-accent" />
          <h2 className="text-base font-semibold text-slate-900 font-heading">
            Department-wise Placement
          </h2>
        </div>

        {!hasData ? (
          <div className="py-16 text-center text-slate-500">
            <BarChart2 size={40} className="mx-auto text-slate-300 mb-3" />
            No application data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={department_stats}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              barCategoryGap="30%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                formatter={(value) =>
                  value === "applied" ? "Applied" : "Selected"
                }
              />
              <Bar dataKey="applied" fill="#3b82f6" radius={[4, 4, 0, 0]} name="applied" />
              <Bar dataKey="selected" fill="#10b981" radius={[4, 4, 0, 0]} name="selected" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Placement rate table ── */}
      {hasData && (
        <Card>
          <h2 className="text-base font-semibold text-slate-900 font-heading mb-4">
            Placement Rate by Department
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium text-center">Applied</th>
                  <th className="px-4 py-3 font-medium text-center">Selected</th>
                  <th className="px-4 py-3 font-medium text-center">
                    Placement %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedDepts.map((dept) => {
                  const rate = dept.applied
                    ? (dept.selected / dept.applied) * 100
                    : 0;
                  const rateColor =
                    rate >= 60
                      ? "text-emerald-600"
                      : rate >= 30
                      ? "text-amber-600"
                      : "text-red-500";
                  return (
                    <tr
                      key={dept.department}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {dept.department}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {dept.applied}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {dept.selected}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold ${rateColor}`}>
                        {placementRate(dept.applied, dept.selected)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
