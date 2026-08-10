import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { testApi } from "../../api/test.api";
import { 
  FileCheck, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  Award, 
  Sparkles,
  ArrowRight,
  BookOpen
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";

export default function StudentTestsPage() {
  const [activeTab, setActiveTab] = useState("practice");

  const { data: testsData, isLoading } = useQuery({
    queryKey: ["student-tests-list-page"],
    queryFn: () => testApi.getStudentTests().then((res) => res.data),
  });

  const practiceTests = testsData?.practice_tests || [];
  const officialTests = testsData?.official_tests || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldCheck size={14} /> AI & Proctored Test Center
          </div>
          <h1 className="text-2xl font-bold font-heading mt-2">Placement & Practice Tests</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Test your technical preparedness with non-evaluative practice drills or take official drive assessments assigned by the TPO.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 px-4 rounded-xl border border-white/10 shrink-0">
          <div className="text-center border-r border-white/15 pr-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Practice</p>
            <p className="text-lg font-extrabold text-blue-400 font-heading">{practiceTests.length}</p>
          </div>
          <div className="text-center pl-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">Official</p>
            <p className="text-lg font-extrabold text-emerald-400 font-heading">{officialTests.length}</p>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("practice")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "practice"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles size={16} />
          Practice Tests ({practiceTests.length})
        </button>

        <button
          onClick={() => setActiveTab("official")}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "official"
              ? "border-emerald-600 text-emerald-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Award size={16} />
          Official Placement Tests ({officialTests.length})
        </button>
      </div>

      {/* Content Section */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : activeTab === "practice" ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600 shrink-0" />
            <span>
              <strong>Practice Tests Info:</strong> Practice tests are non-evaluative static tests meant for self-assessment. Scores do not affect your overall TPO readiness score and are visible only to you.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceTests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl col-span-2">
                No practice tests currently seeded. Check back soon!
              </div>
            ) : (
              practiceTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase">
                        Self-Practice Test
                      </span>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={13} /> {test.duration_minutes} Mins
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 font-heading leading-snug">
                      {test.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {test.prompt_config?.topic || "General Technical Aptitude"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-600 space-x-2">
                      <span><strong>{test.questions?.length || 10}</strong> Questions</span>
                      <span>·</span>
                      <span>Min Pass: <strong>{test.min_passing_marks}</strong> Marks</span>
                    </div>

                    <Link
                      to={`/student/tests/${test.id}/precheck`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
                    >
                      Take Test <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <Award size={16} className="text-emerald-600 shrink-0" />
            <span>
              <strong>Official Placement Tests Info:</strong> Official tests are assigned by the TPO for specific placement drives. These tests are strictly proctored and scores count towards placement eligibility.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {officialTests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl col-span-2">
                No official placement drive tests assigned at the moment.
              </div>
            ) : (
              officialTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full uppercase">
                        Official Drive Assessment
                      </span>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={13} /> {test.duration_minutes} Mins
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 font-heading leading-snug">
                      {test.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Company Drive: {test.prompt_config?.company || "On-Campus Placement Drive"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-600 space-x-2">
                      <span><strong>{test.questions?.length || 5}</strong> Questions</span>
                      <span>·</span>
                      <span>Passing Score: <strong>{test.min_passing_marks}</strong> Marks</span>
                    </div>

                    <Link
                      to={`/student/tests/${test.id}/precheck`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20"
                    >
                      Start Assessment <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
