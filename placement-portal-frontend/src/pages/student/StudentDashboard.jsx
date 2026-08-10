import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "../../api/student.api";
import { testApi } from "../../api/test.api";
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

      {/* Instant Tests & Self-Practice Section */}
      <StudentTestsSection />
    </div>
  );
}

function StudentTestsSection() {
  const [activeTab, setActiveTab] = React.useState("practice");

  const { data: testsData, isLoading } = useQuery({
    queryKey: ["student-tests-list"],
    queryFn: () => testApi.getStudentTests().then((res) => res.data),
  });

  const practiceTests = testsData?.practice_tests || [];
  const officialTests = testsData?.official_tests || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">Proctored Instant Tests</h2>
          <p className="text-xs text-slate-500 mt-0.5">Attempt practice drills or official drive assessments.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("practice")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "practice"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🏋️ Self Practice Tests ({practiceTests.length})
          </button>
          <button
            onClick={() => setActiveTab("official")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "official"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📋 Drive Assessment Tests ({officialTests.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 text-center text-xs text-slate-500"><Spinner /></div>
      ) : activeTab === "practice" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {practiceTests.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 col-span-2">No practice tests available right now.</div>
          ) : (
            practiceTests.map((t) => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md uppercase">
                    Self Practice
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 font-heading mt-2">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.questions?.length || 10} Questions · {t.duration_minutes} Minutes · Private to Student
                  </p>
                </div>

                <Link
                  to={`/student/tests/${t.id}/precheck`}
                  className="w-full text-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
                >
                  Start Practice Test →
                </Link>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {officialTests.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 col-span-2">No official placement drive tests assigned yet.</div>
          ) : (
            officialTests.map((t) => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-amber-50/30 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md uppercase">
                    Official Assessment
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 font-heading mt-2">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.questions?.length || 5} Questions · {t.duration_minutes} Minutes · Pass: {t.min_passing_marks} Marks
                  </p>
                </div>

                <Link
                  to={`/student/tests/${t.id}/precheck`}
                  className="w-full text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-500/20"
                >
                  Start Official Assessment →
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
