import React from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import StatCard from "../../components/common/StatCard";
import Spinner from "../../components/ui/Spinner";
import { Users, Briefcase, FileText, CheckCircle, TrendingUp, Activity, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data: analyticsRes, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => adminApi.getAnalytics().then((res) => res.data),
  });

  const { data: activityRes, isLoading: isActivityLoading } = useQuery({
    queryKey: ["adminActivity"],
    queryFn: () => adminApi.getActivityFeed().then((res) => res.data),
  });

  if (isAnalyticsLoading || isActivityLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const analytics = analyticsRes || {};
  const activities = activityRes || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">Platform overview and recent activity.</p>
      </div>

      {/* Student Overview Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Student Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            label="Total Students" 
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
            label="Avg Readiness" 
            value={`${Math.round(analytics.average_readiness_score || 0)}%`} 
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
            value={analytics.total_drives?.toString() || "0"} 
            icon={Briefcase} 
            accent="brand"
          />
          <StatCard 
            label="Active Drives" 
            value={analytics.active_drives?.toString() || "0"} 
            icon={Activity} 
            accent="accent"
          />
          <StatCard 
            label="Total Applications" 
            value={analytics.total_applications?.toString() || "0"} 
            icon={FileText} 
            accent="accent"
          />
          <StatCard 
            label="Total Selected" 
            value={analytics.total_selected?.toString() || "0"} 
            icon={CheckCircle} 
            accent="success"
          />
          <StatCard 
            label="Highest CTC (LPA)" 
            value={analytics.package_stats?.top ? `₹${analytics.package_stats.top}` : "N/A"} 
            icon={TrendingUp} 
            accent="warning"
          />
        </div>
      </section>

      {/* Activity Feed */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 font-heading">Recent Activity</h3>
        
        {activities.length === 0 ? (
          <p className="text-slate-500 text-sm">No recent activity found.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((item) => (
              <div key={item.id} className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <div className="mt-0.5 p-2 bg-blue-50 text-blue-600 rounded-full">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{item.actor_email}</span> {item.action} <span className="font-medium text-slate-600">{item.target_entity}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
