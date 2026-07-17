import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import InsightsWidget from "../../components/insights/InsightsWidget";
import { BookOpen, Briefcase, FileCheck, BrainCircuit } from "lucide-react";
import StatCard from "../../components/common/StatCard";

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {user?.email?.split('@')?.[0] || "Student"}!</p>
        </div>
      </div>

      {!user?.fee_verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <h3 className="font-semibold text-amber-900">Placement Fee Verification Pending</h3>
            <p className="text-sm text-amber-800 mt-1">
              You must upload your fee receipt to unlock drive applications.
            </p>
          </div>
          <Link 
            to="/student/fee-receipt" 
            className="mt-4 sm:mt-0 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Upload Receipt
          </Link>
        </div>
      )}

      {/* Readiness Score (mocking a score for Phase 6, wired up properly in Phase 7) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Placement Readiness" 
          value="75%" 
          icon={BrainCircuit} 
          accent="accent"
        />
        <StatCard 
          label="Active Applications" 
          value="3" 
          icon={Briefcase} 
          accent="brand"
        />
        <StatCard 
          label="Tests Attempted" 
          value="2" 
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
