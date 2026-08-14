import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tpoApi } from "../../api/tpo.api";
import { Users, Briefcase, FileText, CheckCircle2, FileCheck, TrendingUp, Activity, CheckCircle } from "lucide-react";
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
            value={summary.total_students}
            icon={Users}
            accent="brand"
          />
          <StatCard
            label="Fee Verified"
            value={summary.fee_verified_students}
            icon={CheckCircle}
            accent="success"
          />
          <StatCard
            label="Placed Students"
            value={summary.placed_students}
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label="Avg Readiness"
            value={`${Math.round(summary.average_readiness_score || 0)}%`}
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
            value={summary.total_drives}
            icon={Briefcase}
            accent="brand"
          />
          <StatCard
            label="Active Drives"
            value={summary.active_drives}
            icon={Activity}
            accent="accent"
          />
          <StatCard
            label="Total Applications"
            value={summary.total_applied}
            icon={FileText}
            accent="accent"
          />
          <StatCard
            label="Total Selected"
            value={summary.total_selected}
            icon={FileCheck}
            accent="success"
          />
          <StatCard
            label="Highest CTC (LPA)"
            value={summary.highest_ctc ? `₹${summary.highest_ctc}` : "N/A"}
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
        
        {summary.recent_drives?.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No drives created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-l-lg">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.recent_drives.map((drive) => (
                  <tr key={drive.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/tpo/drives/${drive.id}`} className="font-medium text-slate-900 hover:text-accent">
                        {drive.role}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={drive.status === "open" ? "success" : "neutral"}>
                        {drive.status === "open" ? "Active" : "Closed"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(drive.deadline).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
