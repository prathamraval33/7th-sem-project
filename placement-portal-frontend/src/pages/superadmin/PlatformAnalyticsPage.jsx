// PlatformAnalyticsPage — Aggregate metrics + charts (§5.7).
// 4 top-line KPIs + "Colleges Over Time" area chart + "Feature Adoption" bar chart.
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSuperAdminStore } from "./superAdminStore";
import KpiCard from "../../components/superadmin/KpiCard";

export default function PlatformAnalyticsPage() {
  const colleges = useSuperAdminStore((s) => s.colleges);
  const collegesOverTime = useSuperAdminStore((s) => s.collegesOverTime);
  const features = useSuperAdminStore((s) => s.features);
  const collegeFeatures = useSuperAdminStore((s) => s.collegeFeatures);

  const totalColleges = colleges.length;
  const totalStudents = colleges.reduce((sum, c) => sum + (c.students || 0), 0);
  const totalTPOs = colleges.reduce((sum, c) => sum + (c.tpos || 0), 0);
  const totalDrives = colleges.reduce((sum, c) => sum + (c.drives || 0), 0);

  const featureAdoption = features.map((f) => {
    const count = Object.values(collegeFeatures).filter((ids) => ids.includes(f.id)).length;
    return { name: f.name, colleges: count };
  });

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">Platform Analytics</h1>
      </div>

      {/* KPI Row */}
      <div className="cd-kpi-grid">
        <KpiCard label="Total Colleges" value={totalColleges} />
        <KpiCard label="Total Students" value={totalStudents} />
        <KpiCard label="Total TPOs" value={totalTPOs} />
        <KpiCard label="Total Drives" value={totalDrives} />
      </div>

      {/* Charts Row */}
      <div className="cd-mt-lg">
        <div className="cd-chart-grid">
          {/* Colleges Over Time */}
          <div className="cd-panel">
            <div className="cd-panel__header">Colleges Over Time</div>
            <div style={{ padding: "20px 16px 12px 0", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={collegesOverTime}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4ECFC" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "#475569", fontFamily: "'Roboto', 'Inter', sans-serif" }}
                    axisLine={{ stroke: "#E4ECFC" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#475569", fontFamily: "'Roboto', 'Inter', sans-serif" }}
                    axisLine={{ stroke: "#E4ECFC" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E4ECFC",
                      borderRadius: 8,
                      fontFamily: "'Roboto', 'Inter', sans-serif",
                      fontSize: 13,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#areaGrad)"
                    name="Colleges"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feature Adoption */}
          <div className="cd-panel">
            <div className="cd-panel__header">Feature Adoption</div>
            <div style={{ padding: "20px 16px 12px 0", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureAdoption} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4ECFC" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#475569", fontFamily: "'Roboto', 'Inter', sans-serif" }}
                    axisLine={{ stroke: "#E4ECFC" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12, fill: "#475569", fontFamily: "'Roboto', 'Inter', sans-serif" }}
                    axisLine={{ stroke: "#E4ECFC" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E4ECFC",
                      borderRadius: 8,
                      fontFamily: "'Roboto', 'Inter', sans-serif",
                      fontSize: 13,
                    }}
                  />
                  <Bar
                    dataKey="colleges"
                    fill="#2563EB"
                    radius={[0, 4, 4, 0]}
                    name="Colleges"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
