import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tpoApi } from "../../api/tpo.api";
import { Users, Briefcase, FileText, CheckCircle2, FileCheck, TrendingUp, Activity, CheckCircle, Building } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

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
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading dashboard: {error.message}
      </div>
    );
  }

  const stats = summary || {};
  const recentDrives = stats.recent_drives || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">TPO Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of placement activities and student metrics.</p>
      </div>

      {/* Student Overview Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Student Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Students"
            value={stats.total_students ?? 0}
            icon={Users}
            accent="brand"
          />
          <StatCard
            label="Fee Verified"
            value={stats.fee_verified_students ?? 0}
            icon={CheckCircle}
            accent="success"
          />
          <StatCard
            label="Placed Students"
            value={stats.placed_students ?? 0}
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label="Avg Readiness"
            value={`${Math.round(stats.average_readiness_score || 0)}%`}
            icon={Activity}
            accent="warning"
          />
        </div>
      </section>

      {/* Drive Statistics Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Placement Drives</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Drives"
            value={stats.total_drives ?? 0}
            icon={Briefcase}
            accent="brand"
          />
          <StatCard
            label="Active Drives"
            value={stats.active_drives ?? 0}
            icon={Activity}
            accent="accent"
          />
          <StatCard
            label="Total Applications"
            value={stats.total_applied ?? 0}
            icon={FileText}
            accent="accent"
          />
          <StatCard
            label="Total Selected"
            value={stats.total_selected ?? 0}
            icon={FileCheck}
            accent="success"
          />
          <StatCard
            label="Highest CTC (LPA)"
            value={stats.highest_ctc ? `₹${stats.highest_ctc}` : "N/A"}
            icon={TrendingUp}
            accent="warning"
          />
        </div>
      </section>

      {/* Recent Drives Table */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900 font-heading">Recent Drives</h2>
          <Link to="/tpo/drives" className="text-sm font-medium text-accent hover:underline">
            View All Drives &rarr;
          </Link>
        </div>
        
        {recentDrives.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No drives created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-l-lg">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium rounded-r-lg">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDrives.map((drive) => {
                  const companyName = drive.company?.name || drive.company_name || (typeof drive.company === "string" ? drive.company : "Unnamed Company");
                  const isActive = drive.status === "open" || drive.is_active;

                  return (
                    <tr key={drive.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building size={16} className="text-slate-400 shrink-0" />
                          <span>{companyName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/tpo/drives/${drive.id}`} className="font-medium text-accent hover:underline">
                          {drive.role}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isActive ? "success" : "neutral"}>
                          {drive.status ? (drive.status === "open" ? "Active" : drive.status.toUpperCase()) : (isActive ? "Active" : "Closed")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {drive.deadline ? new Date(drive.deadline).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
