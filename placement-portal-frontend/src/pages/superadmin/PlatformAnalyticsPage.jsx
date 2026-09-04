// PlatformAnalyticsPage — Aggregate metrics + charts (§5.7).
// Top-line KPIs + "Colleges Over Time" area chart + "Feature Adoption" bar chart + Revenue analytics.
import { useQuery } from "@tanstack/react-query";
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
import { superadminApi } from "../../api/superadmin.api";
import KpiCard from "../../components/superadmin/KpiCard";

export default function PlatformAnalyticsPage() {
  const colleges = useSuperAdminStore((s) => s.colleges);
  const collegesOverTime = useSuperAdminStore((s) => s.collegesOverTime);
  const features = useSuperAdminStore((s) => s.features);
  const collegeFeatures = useSuperAdminStore((s) => s.collegeFeatures);

  const { data: analyticsData } = useQuery({
    queryKey: ["superadminAnalytics"],
    queryFn: () => superadminApi.getAnalytics().then((res) => res.data),
    staleTime: 30 * 1000,
  });

  const totalColleges = colleges.length;
  const totalStudents = colleges.reduce((sum, c) => sum + (c.students || 0), 0);
  const totalTPOs = colleges.reduce((sum, c) => sum + (c.tpos || 0), 0);
  const totalDrives = colleges.reduce((sum, c) => sum + (c.drives || 0), 0);

  const totalRevenue = analyticsData?.total_revenue ?? 0;
  const revenueByFeature = analyticsData?.revenue_by_feature ?? [];
  const revenueByCollege = analyticsData?.revenue_by_college ?? [];

  const featureAdoption = features.map((f) => {
    const count = Object.values(collegeFeatures).filter((ids) => ids.includes(f.id)).length;
    return { name: f.name, colleges: count };
  });

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">Platform Analytics & Revenue</h1>
      </div>

      {/* KPI Row */}
      <div className="cd-kpi-grid">
        <KpiCard label="Total Colleges" value={totalColleges} />
        <KpiCard label="Total Students" value={totalStudents} />
        <KpiCard
          label="Total Platform Revenue"
          value={`₹${Number(totalRevenue).toLocaleString("en-IN")}`}
          sublabel="Real paid transactions (excludes BVM auto-grants)"
        />
        <KpiCard label="Active Drives" value={totalDrives} />
      </div>

      {/* Platform Activity Charts Row */}
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
            <div className="cd-panel__header">Feature Adoption by Colleges</div>
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

      {/* Revenue Analytics Row */}
      <div className="cd-mt-lg">
        <div className="cd-chart-grid">
          {/* Revenue by Feature */}
          <div className="cd-panel">
            <div className="cd-panel__header">Revenue by Feature (₹ INR)</div>
            <div style={{ padding: "20px 16px 12px 0", height: 260 }}>
              {revenueByFeature.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>
                  No paid feature transactions yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByFeature}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4ECFC" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={{ stroke: "#E4ECFC" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={{ stroke: "#E4ECFC" }}
                    />
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #E4ECFC",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Revenue by College */}
          <div className="cd-panel">
            <div className="cd-panel__header">Revenue by College (₹ INR)</div>
            <div style={{ padding: "20px 16px 12px 0", height: 260 }}>
              {revenueByCollege.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>
                  No paying colleges yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByCollege}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4ECFC" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={{ stroke: "#E4ECFC" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={{ stroke: "#E4ECFC" }}
                    />
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #E4ECFC",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
