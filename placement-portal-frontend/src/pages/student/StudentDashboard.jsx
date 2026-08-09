import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "../../api/student.api";
import InsightsWidget from "../../components/insights/InsightsWidget";
import { BookOpen, Briefcase, FileCheck, BrainCircuit } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import Spinner from "../../components/ui/Spinner";

export default function StudentDashboard() {
  const { user } = useAuth();
  
  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ["studentAnalyticsMe"],
    queryFn: () => studentApi.getAnalyticsMe().then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const readinessScore = Math.round(analyticsRes?.readiness_score || 0);
  const activeApplications = analyticsRes?.total_applications || 0;
  const testsAttempted = analyticsRes?.interviews_taken || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {user?.email?.split('@')?.[0] || "Student"}!</p>
        </div>
      </div>



      {/* Readiness Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Placement Readiness" 
          value={`${readinessScore}%`} 
          icon={BrainCircuit} 
          accent="accent"
        />
        <StatCard 
          label="Active Applications" 
          value={activeApplications.toString()} 
          icon={Briefcase} 
          accent="brand"
        />
        <StatCard 
          label="Tests Attempted" 
          value={testsAttempted.toString()} 
          icon={FileCheck} 
          accent="success"
        />
        <div className="md:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-slate-200 text-sm">Learning</h3>
            <BookOpen className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-4">
            <Link to="/student/resources" className="text-sm font-medium text-white hover:text-slate-200 flex items-center">
              Browse Resources &rarr;
            </Link>
          </div>
        </div>
      </div>

      <InsightsWidget />
    </div>
  );
}
