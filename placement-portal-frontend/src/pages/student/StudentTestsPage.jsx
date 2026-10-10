import React, { useState, useMemo } from "react";
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
  BookOpen,
  Brain,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
  InteractiveTabSwitcher,
  InteractiveSearchBox,
  RevealOnScroll
} from "../../components/common/MotionKit";

export default function StudentTestsPage() {
  const [activeTab, setActiveTab] = useState("practice");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: testsData, isLoading } = useQuery({
    queryKey: ["student-tests-list-page"],
    queryFn: () => testApi.getStudentTests().then((res) => res.data),
  });

  const practiceTests = testsData?.practice_tests || [];
  const officialTests = testsData?.official_tests || [];

  const activePool = activeTab === "practice" ? practiceTests : officialTests;

  const filteredTests = useMemo(() => {
    return activePool.filter((t) => {
      const q = searchQuery.toLowerCase();
      return (
        (t.title || "").toLowerCase().includes(q) ||
        (t.prompt_config?.topic || "").toLowerCase().includes(q) ||
        (t.prompt_config?.company || "").toLowerCase().includes(q)
      );
    });
  }, [activePool, searchQuery]);

  const tabs = [
    { id: "practice", label: "Self Practice Tests", count: practiceTests.length, icon: Sparkles },
    { id: "official", label: "Drive Assessment Tests", count: officialTests.length, icon: Award },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ════════════ HEADER BANNER ════════════ */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-7 sm:p-9 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>AI Proctoring &amp; Assessment Engine</span>
            <LiveStatusBeacon label="ACTIVE" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            <AnimatedWords text="Placement & Practice Test Center" delay={0.05} />
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Sharpen technical problem-solving with non-evaluative practice drills or launch mandatory proctored tests assigned by the Placement Cell.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 px-5 rounded-2xl border border-white/10 shrink-0 relative z-10">
          <div className="text-center border-r border-white/15 pr-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Practice</p>
            <p className="text-2xl font-extrabold text-blue-400 font-mono">{practiceTests.length}</p>
          </div>
          <div className="text-center pl-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Official</p>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono">{officialTests.length}</p>
          </div>
        </div>
      </div>

      {/* ════════════ STUDENT LIVE TICKER RIBBON ════════════ */}
      <StudentTickerRibbon />

      {/* ════════════ TABS SELECTOR ════════════ */}
      <div className="flex justify-start">
        <InteractiveTabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* ════════════ SEARCH BAR ════════════ */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <InteractiveSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search tests by subject topic or assigned hiring company..."
        />
      </div>

      {/* ════════════ CONTENT SECTION ════════════ */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : activeTab === "practice" ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/80 border border-blue-200/90 rounded-2xl text-xs text-blue-900 flex items-center gap-3">
            <Sparkles size={18} className="text-blue-600 shrink-0" />
            <span>
              <strong>Self Practice Drills:</strong> Practice tests are non-evaluative static tests meant for personal skill diagnostic. Scores do not affect your overall TPO readiness score and are completely private to you.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-3xl col-span-2">
                No practice tests match your search. Check back soon for new questions!
              </div>
            ) : (
              filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Self-Practice Drill
                      </span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 font-mono">
                        <Clock size={13} /> {test.duration_minutes} Mins
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 font-heading leading-snug group-hover:text-blue-700 transition-colors">
                      {test.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Domain Focus: <strong>{test.prompt_config?.topic || "General Technical Aptitude"}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-600 space-x-1.5 font-mono">
                      <span><strong>{test.questions?.length || 10}</strong> Qs</span>
                      <span>·</span>
                      <span>Pass: <strong>{test.min_passing_marks}</strong> pts</span>
                    </div>

                    <Link
                      to={`/student/tests/${test.id}/precheck`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                    >
                      <span>Take Drill</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl text-xs text-emerald-900 flex items-center gap-3">
            <Award size={18} className="text-emerald-600 shrink-0" />
            <span>
              <strong>Official Placement Drive Assessments:</strong> Official rounds are assigned for active recruitment drives. These tests enforce AI proctoring (camera, mic &amp; tab detection) and scores directly determine drive qualification.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-3xl col-span-2">
                No official placement drive assessments assigned at the moment.
              </div>
            ) : (
              filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-200/80 p-6 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Official Assessment Round
                      </span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 font-mono">
                        <Clock size={13} /> {test.duration_minutes} Mins
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 font-heading leading-snug group-hover:text-emerald-700 transition-colors">
                      {test.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Company Drive: <strong>{test.prompt_config?.company || "On-Campus Placement Drive"}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-600 space-x-1.5 font-mono">
                      <span><strong>{test.questions?.length || 5}</strong> Qs</span>
                      <span>·</span>
                      <span>Qualify: <strong>{test.min_passing_marks}</strong> pts</span>
                    </div>

                    <Link
                      to={`/student/tests/${test.id}/precheck`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 active:scale-95"
                    >
                      <span>Launch Assessment</span>
                      <ArrowRight size={14} />
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
