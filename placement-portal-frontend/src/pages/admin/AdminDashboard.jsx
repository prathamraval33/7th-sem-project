import React, { useState, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import SetupChecklistWidget from "../../components/admin/SetupChecklistWidget";
import SubscriptionBannerCard from "../../components/admin/SubscriptionBannerCard";
import DriveDetailsView from "../../components/drives/DriveDetailsView";
import StatCard from "../../components/common/StatCard";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { showConfirm, showToast } from "../../utils/swal";
import {
  Users,
  Briefcase,
  CheckCircle2,
  Activity,
  TrendingUp,
  BarChart3,
  Building2,
  Calendar,
  MapPin,
  Eye,
  Trash2,
  Search,
  ArrowUpRight,
  Clock,
  Sparkles,
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
import { formatDistanceToNow } from "date-fns";

// --- Helpers ---
function fmtLpa(val) {
  if (val == null) return "—";
  return `₹${val} LPA`;
}

function calcRate(applied, selected) {
  if (!applied || applied === 0) return 0;
  return Math.round((selected / applied) * 100);
}

function PkgTile({ label, value, color, description }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-5 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold font-heading ${color}`}>{value}</p>
      {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1">
      <p className="font-bold text-slate-900 border-b border-border/50 pb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            {p.name}:
          </span>
          <span className="font-semibold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: if route is /admin/analytics or ?tab=overview, default to overview
  const initialTab = location.pathname.includes("/analytics")
    ? "overview"
    : searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Drives sub-state
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [driveSearch, setDriveSearch] = useState("");
  const [driveFilter, setDriveFilter] = useState("all");

  // Queries
  const { data: analytics = {}, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => adminApi.getAnalytics().then((res) => res.data),
  });

  const { data: activities = [], isLoading: isActivityLoading } = useQuery({
    queryKey: ["adminActivity"],
    queryFn: () => adminApi.getActivityFeed().then((res) => res.data),
  });

  const { data: drives = [], isLoading: isDrivesLoading } = useQuery({
    queryKey: ["adminDrivesAll"],
    queryFn: () => adminApi.getDrives().then((res) => res.data),
  });

  const deleteDriveMutation = useMutation({
    mutationFn: (driveId) => adminApi.deleteDrive(driveId),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminDrivesAll"]);
      queryClient.invalidateQueries(["adminAnalytics"]);
      setSelectedDrive(null);
      showToast("Drive removed successfully");
    },
    onError: (err) => {
      showToast(err.response?.data?.detail || "Failed to delete drive", "error");
    },
  });

  const handleDeleteDrive = async (driveId, title) => {
    const confirmed = await showConfirm({
      title: "Delete Placement Drive?",
      text: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      confirmButtonText: "Yes, Delete",
      confirmButtonColor: "#dc2626",
    });
    if (confirmed) {
      deleteDriveMutation.mutate(driveId);
    }
  };

  // Filtered drives
  const filteredDrives = useMemo(() => {
    return drives.filter((d) => {
      const companyName = (d.company_name || d.company?.name || "").toLowerCase();
      const role = (d.role || "").toLowerCase();
      const matchSearch =
        companyName.includes(driveSearch.toLowerCase()) ||
        role.includes(driveSearch.toLowerCase());

      const isActive = d.status === "open" || d.is_active;
      if (driveFilter === "active") return matchSearch && isActive;
      if (driveFilter === "closed") return matchSearch && !isActive;
      return matchSearch;
    });
  }, [drives, driveSearch, driveFilter]);

  if (isAnalyticsLoading || isActivityLoading || isDrivesLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const departmentStats = analytics.department_stats || [];
  const packageStats = analytics.package_stats || {};

  return (
    <div className="space-y-5 w-full">
      {/* ── Top Header & Tab Navigation ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
              Admin Command Center
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time institutional placement intelligence, active recruitment drives, and audit logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shadow-inner self-start md:self-auto">
          <button
            onClick={() => handleTabChange("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <BarChart3 size={16} className={activeTab === "overview" ? "text-accent" : "text-slate-400"} />
            Overview & Analytics
          </button>
          <button
            onClick={() => handleTabChange("drives")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "drives"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Briefcase size={16} className={activeTab === "drives" ? "text-accent" : "text-slate-400"} />
            Placement Drives
            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-normal">
              {drives.length}
            </span>
          </button>
        </div>
      </div>

      {/* Progressive Setup Checklist */}
      <SetupChecklistWidget />

      {/* Institutional Campus License & Subscription Banner */}
      <SubscriptionBannerCard />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 1. Core KPIs Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Enrolled Students"
              value={analytics.total_students?.toString() || "0"}
              icon={Users}
              accent="brand"
            />
            <StatCard
              label="Placed Students"
              value={analytics.placed_students?.toString() || "0"}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label="Active Placement Drives"
              value={analytics.active_drives?.toString() || "0"}
              icon={Briefcase}
              accent="accent"
            />
            <StatCard
              label="Average Readiness Score"
              value={`${Math.round(analytics.average_readiness_score || 0)}%`}
              icon={Activity}
              accent="warning"
            />
          </div>

          {/* 2. CTC Package Statistics Panel */}
          <Card className="p-0 overflow-hidden shadow-sm border-slate-200">
            <div className="px-6 py-3.5 border-b border-border/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-accent" />
                <h2 className="text-sm font-bold tracking-tight text-slate-900 font-heading">
                  Annual Compensation Benchmarks (CTC)
                </h2>
              </div>
              <span className="text-xs text-slate-400">Values in INR (Lakhs per Annum)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <PkgTile
                label="Highest Package"
                value={fmtLpa(packageStats.top)}
                color="text-emerald-600"
                description="Top offer secured this academic cycle"
              />
              <PkgTile
                label="Median Package"
                value={fmtLpa(packageStats.median)}
                color="text-blue-600"
                description="50th percentile across eligible students"
              />
              <PkgTile
                label="Average Package"
                value={fmtLpa(packageStats.average)}
                color="text-violet-600"
                description="Mean placement compensation"
              />
            </div>
          </Card>

          {/* 3. Department Analytics Section (Chart + Table) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart: 7 cols */}
            <Card className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-accent" />
                  <h2 className="text-base font-bold text-slate-900 font-heading">
                    Branch Recruitment Performance
                  </h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {departmentStats.length} Departments
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Comparison between candidates who applied vs candidates selected by visiting recruiters.
              </p>

              {departmentStats.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
                  <BarChart3 size={36} className="text-slate-300 mb-2" />
                  <p className="text-sm">No department recruitment metrics recorded yet.</p>
                </div>
              ) : (
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={departmentStats}
                      margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      barGap={6}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="department"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                        formatter={(val) => (val === "applied" ? "Applied" : "Selected")}
                      />
                      <Bar
                        dataKey="applied"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        name="applied"
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="selected"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        name="selected"
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Department Breakdown Table: 5 cols */}
            <Card className="lg:col-span-5 p-0 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-border/80 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Department Placement Ratios
                </h3>
                <span className="text-[11px] text-slate-500">Rate = Selected / Applied</span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-3 py-3 text-center">Applied</th>
                      <th className="px-3 py-3 text-center">Selected</th>
                      <th className="px-4 py-3 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {departmentStats.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          No department stats available
                        </td>
                      </tr>
                    ) : (
                      departmentStats.map((d, i) => {
                        const rate = calcRate(d.applied, d.selected);
                        const rateColor =
                          rate >= 60
                            ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                            : rate >= 30
                            ? "text-amber-600 bg-amber-50 border-amber-200"
                            : "text-slate-600 bg-slate-50 border-slate-200";

                        return (
                          <tr key={d.department || i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {d.department}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 font-medium">
                              {d.applied}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-900 font-bold">
                              {d.selected}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold border text-[11px] ${rateColor}`}
                              >
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* 4. Real-time Audit & Activity Log */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-accent" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  System Audit & Recent Activity Feed
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Latest {Math.min(activities.length, 8)} recorded events
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Activity size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm">No recent platform activities recorded.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {activities.slice(0, 8).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="px-6 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Activity size={14} />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-800">
                          <span className="font-semibold text-slate-900">
                            {item.actor_email || "System"}
                          </span>{" "}
                          <span className="text-slate-600 font-normal">{item.action || "performed"}</span>{" "}
                          <span className="font-medium text-slate-800">
                            {item.description || item.target_entity || ""}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">
                      {item.created_at || item.timestamp
                        ? formatDistanceToNow(new Date(item.created_at || item.timestamp), {
                            addSuffix: true,
                          })
                        : "Recently"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: PLACEMENT DRIVES MONITOR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "drives" && (
        <div className="space-y-6">
          {/* Drives Quick Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase">Total Drives</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{drives.length}</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-emerald-600 font-medium uppercase">Active Drives</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {drives.filter((d) => d.status === "open" || d.is_active).length}
              </p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium uppercase">Closed Drives</p>
              <p className="text-2xl font-bold text-slate-600 mt-1">
                {drives.filter((d) => d.status !== "open" && !d.is_active).length}
              </p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-accent font-medium uppercase">Total Applications</p>
              <p className="text-2xl font-bold text-accent mt-1">
                {analytics.total_applications || 0}
              </p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by company or role..."
                value={driveSearch}
                onChange={(e) => setDriveSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={driveFilter}
                onChange={(e) => setDriveFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All Drives ({drives.length})</option>
                <option value="active">Active Only</option>
                <option value="closed">Closed Only</option>
              </select>
            </div>
          </div>

          {/* Global Drives Directory Table */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Company / Role</th>
                    <th className="px-4 py-3 text-left">Compensation & Location</th>
                    <th className="px-3 py-3 text-left">Deadline</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredDrives.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-slate-400">
                        <Briefcase className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                        No placement drives match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDrives.map((drive) => {
                      const isActive = drive.status === "open" || drive.is_active;
                      const companyTitle = drive.company_name || drive.company?.name || "Company";

                      return (
                        <tr key={drive.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent font-bold flex items-center justify-center text-xs shrink-0 border border-accent/20">
                                {companyTitle.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{drive.role}</p>
                                <p className="text-[11px] text-slate-500 truncate">{companyTitle}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-2.5">
                            <div className="space-y-0.5 text-[11px] text-slate-600">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <span className="text-slate-400 font-normal">CTC:</span>
                                <span>
                                  ₹{drive.min_ctc || drive.ctc_lpa || "—"}{" "}
                                  {drive.max_ctc ? `- ₹${drive.max_ctc}` : ""} LPA
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-500">
                                <MapPin size={11} className="text-slate-400" />
                                <span className="truncate max-w-[150px]">{drive.company?.location || drive.location || "Remote"}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              <span>
                                {drive.deadline
                                  ? new Date(drive.deadline).toLocaleDateString(undefined, {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "Open"}
                              </span>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {isActive ? (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0.2">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.2">Closed</Badge>
                            )}
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDrive(drive)}
                                className="flex items-center gap-1 text-[11px] px-2 py-0.5 h-6"
                              >
                                <Eye size={12} />
                                <span>Inspect</span>
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteDrive(drive.id, `${drive.role} @ ${companyTitle}`)}
                                isLoading={
                                  deleteDriveMutation.isPending &&
                                  deleteDriveMutation.variables === drive.id
                                }
                                className="p-1 h-6 w-6"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drive Detail Modal */}
          {selectedDrive && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col my-auto border border-border">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 font-heading">
                        Drive Inspection — {selectedDrive.role}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {selectedDrive.company_name || selectedDrive.company?.name} (ID: #{selectedDrive.id})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDrive(null)}
                    className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <DriveDetailsView drive={selectedDrive} company={selectedDrive.company} />
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-slate-50 shrink-0">
                  <Button variant="outline" onClick={() => setSelectedDrive(null)}>
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
