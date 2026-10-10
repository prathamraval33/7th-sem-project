import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "../../api/student.api";
import { testApi } from "../../api/test.api";
import InsightsWidget from "../../components/insights/InsightsWidget";
import { 
  BookOpen, 
  Briefcase, 
  FileCheck, 
  BrainCircuit, 
  Sparkles, 
  Award, 
  GraduationCap, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
  StaggerGrid,
  GlassCard,
  AnimatedCounter,
  InteractiveTabSwitcher,
  RevealOnScroll
} from "../../components/common/MotionKit";

export default function StudentDashboard() {
  const { user } = useAuth();
  
  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ["studentAnalyticsMe"],
    queryFn: () => studentApi.getAnalyticsMe().then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const readinessScore = Math.round(analyticsRes?.readiness_score || 0);
  const activeApplications = analyticsRes?.total_applications || 0;
  const testsAttempted = analyticsRes?.interviews_taken || 0;

  const displayName = user?.email?.split('@')?.[0] || "Student";
  const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ════════════ TOPBAR & KINETIC HEADER ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <GraduationCap size={13} className="text-emerald-600" />
              <span>Student Placement Command Deck</span>
            </span>
            <LiveStatusBeacon label="CAREER PORTAL ACTIVE" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text={`Welcome back, ${formattedName}`} delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Track your corporate placement readiness, browse matched drives, take proctored assessments, and optimize your ATS resume.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/student/drives">
            <button className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95">
              <Briefcase size={16} />
              <span>Explore Active Drives</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ════════════ STUDENT LIVE TICKER RIBBON ════════════ */}
      <StudentTickerRibbon />

      {/* ════════════ TELEMETRY KPI SUMMARY CARDS ════════════ */}
      <StaggerGrid columns="grid-cols-2 lg:grid-cols-4" gap="gap-4">
        {/* Placement Readiness */}
        <GlassCard className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Placement Readiness</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <BrainCircuit size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1 font-mono">
            <span className="text-3xl font-extrabold text-emerald-600">
              <AnimatedCounter target={readinessScore} />
            </span>
            <span className="text-xl font-bold text-emerald-700">%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(readinessScore, 100)}%` }}
            />
          </div>
        </GlassCard>

        {/* Active Applications */}
        <GlassCard className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Applications</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Briefcase size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            <AnimatedCounter target={activeApplications} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Drives in recruitment funnel</p>
        </GlassCard>

        {/* Tests Attempted */}
        <GlassCard className="p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tests Attempted</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileCheck size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-purple-600 font-mono">
            <AnimatedCounter target={testsAttempted} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Evaluated drill sessions</p>
        </GlassCard>

        {/* Curated Learning Resources */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700/60 flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Study Resources</span>
            <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
              <BookOpen size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-slate-300 mb-2">Curated notes, PYQs &amp; interview prep tracks</p>
            <Link 
              to="/student/resources" 
              className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              <span>Browse Library</span>
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </StaggerGrid>

      {/* ════════════ AI CAREER INSIGHTS WIDGET ════════════ */}
      <RevealOnScroll direction="up" delay={0.05}>
        <InsightsWidget />
      </RevealOnScroll>

      {/* ════════════ PROCTORED INSTANT TESTS SECTION ════════════ */}
      <RevealOnScroll direction="up" delay={0.1}>
        <StudentTestsSection />
      </RevealOnScroll>
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

  const tabs = [
    { id: "practice", label: "Self Practice Tests", count: practiceTests.length, icon: Sparkles },
    { id: "official", label: "Drive Assessment Tests", count: officialTests.length, icon: Award },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            <span>Proctored Assessments &amp; Skill Drills</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Attempt non-evaluative practice tests or mandatory drive qualifying assessments.
          </p>
        </div>

        <InteractiveTabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500 flex justify-center">
          <Spinner />
        </div>
      ) : activeTab === "practice" ? (
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center gap-2.5">
            <Sparkles size={16} className="text-blue-600 shrink-0" />
            <span>
              <strong>Private Practice Drills:</strong> Practice tests are safe self-assessment drills. Scores do not affect your institutional placement score and are visible only to you.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceTests.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 col-span-2 border border-dashed border-slate-200 rounded-2xl">
                No practice tests available right now.
              </div>
            ) : (
              practiceTests.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-md flex flex-col justify-between space-y-4 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Self Practice
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {t.duration_minutes} min
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-heading mt-2.5 group-hover:text-blue-700 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.questions?.length || 10} Questions · AI Proctoring Disabled · Private Result
                    </p>
                  </div>

                  <Link
                    to={`/student/tests/${t.id}/precheck`}
                    className="w-full text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Start Practice Test</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
            <Award size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Mandatory Assessment Rounds:</strong> Official assessments are monitored by AI Proctoring. Violations (tab switching, blur, head pose) are reported directly to the TPO.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {officialTests.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 col-span-2 border border-dashed border-slate-200 rounded-2xl">
                No official placement drive tests assigned to your branch yet.
              </div>
            ) : (
              officialTests.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-amber-200/90 bg-amber-50/20 hover:border-amber-400 hover:shadow-md flex flex-col justify-between space-y-4 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Official Assessment
                      </span>
                      <span className="text-xs text-amber-800 font-mono font-bold">
                        Pass: {t.min_passing_marks} pts
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-heading mt-2.5 group-hover:text-amber-800 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.questions?.length || 5} Questions · {t.duration_minutes} Minutes · Proctored Session
                    </p>
                  </div>

                  <Link
                    to={`/student/tests/${t.id}/precheck`}
                    className="w-full text-center py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Launch Official Assessment</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
