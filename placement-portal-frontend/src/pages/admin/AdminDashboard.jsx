import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import { branchesApi } from "../../api/branches.api";
import StatCard from "../../components/common/StatCard";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/ui/Badge";
import { showConfirm, showSuccess, showError, showToast } from "../../utils/swal";
import { Users, Briefcase, FileText, CheckCircle, TrendingUp, Activity, CheckCircle2, GraduationCap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [showBranchModal, setShowBranchModal] = useState(false);

  const { data: analyticsRes, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => adminApi.getAnalytics().then((res) => res.data),
  });

  const { data: activityRes = [], isLoading: isActivityLoading } = useQuery({
    queryKey: ["adminActivity"],
    queryFn: () => adminApi.getActivityFeed().then((res) => res.data),
  });

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches().then((res) => res.data),
  });

  const createBranchMutation = useMutation({
    mutationFn: (newBranch) => branchesApi.createBranch(newBranch),
    onSuccess: () => {
      queryClient.invalidateQueries(["branches"]);
      setShowBranchModal(false);
      showToast("Academic branch added successfully");
    },
    onError: (err) => {
      showError("Add Branch Failed", err.response?.data?.detail || "Failed to add branch");
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (branchId) => branchesApi.deleteBranch(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries(["branches"]);
      showToast("Branch deactivated");
    },
    onError: (err) => {
      showError("Action Failed", err.response?.data?.detail || "Failed to delete branch");
    }
  });

  const handleCreateBranch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createBranchMutation.mutate({
      code: formData.get("code").toUpperCase().trim(),
      name: formData.get("name").trim(),
    });
  };

  const handleDeleteBranch = async (branch) => {
    const confirmed = await showConfirm({
      title: "Deactivate Branch?",
      text: `Are you sure you want to deactivate branch ${branch.code} (${branch.name})?`,
      confirmButtonText: "Yes, deactivate",
      confirmButtonColor: "#dc2626",
    });
    if (confirmed) {
      deleteBranchMutation.mutate(branch.id);
    }
  };

  if (isAnalyticsLoading || isActivityLoading || isBranchesLoading) {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Platform overview and academic branch management.</p>
        </div>
        <Button onClick={() => setShowBranchModal(true)} className="flex items-center gap-2">
          <GraduationCap size={16} /> Add Academic Branch
        </Button>
      </div>

      {/* Academic Branches Management Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <GraduationCap className="text-accent" size={20} /> Academic Branches
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Standardized departments used across Student Profiles and TPO Drives.</p>
          </div>
          <Badge variant="brand">{branches.length} Active Branches</Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-800">
              <span className="font-bold text-accent">{b.code}</span>
              <span className="text-slate-500 font-normal">({b.name})</span>
              <button 
                onClick={() => handleDeleteBranch(b)}
                className="text-slate-400 hover:text-red-500 ml-1 transition-colors"
                title="Deactivate Branch"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </section>

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
            {activities.map((item, idx) => (
              <div key={item.id || idx} className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <div className="mt-0.5 p-2 bg-blue-50 text-blue-600 rounded-full">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold">{item.actor_email || "System"}</span> {item.action || ""} <span className="font-medium text-slate-600">{item.description || item.target_entity || ""}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.created_at || item.timestamp ? formatDistanceToNow(new Date(item.created_at || item.timestamp), { addSuffix: true }) : "Recently"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900 font-heading flex items-center gap-2">
                <GraduationCap className="text-accent" size={18} /> Add New Academic Branch
              </h2>
              <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              <Input label="Branch Code (Short Form)" name="code" required placeholder="e.g. AI, DS, IT, CP" />
              <Input label="Full Branch Name" name="name" required placeholder="e.g. Artificial Intelligence & Data Science" />

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowBranchModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={createBranchMutation.isPending}>Add Branch</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
