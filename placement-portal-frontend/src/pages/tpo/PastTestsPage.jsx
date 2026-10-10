import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tpoApi } from "../../api/tpo.api";
import { 
  ListChecks, 
  Users, 
  BarChart, 
  Plus, 
  ShieldAlert, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  AlertTriangle,
  Brain,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from "recharts";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StaggerGrid,
  GlassCard,
  AnimatedCounter,
  InteractiveSearchBox,
  InteractiveTabSwitcher,
  RevealOnScroll
} from "../../components/common/MotionKit";

export default function PastTestsPage() {
  const [activeTab, setActiveTab] = useState("tests"); // "tests" | "analytics"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: tests, isLoading, error } = useQuery({
    queryKey: ["tpo-tests-history"],
    queryFn: async () => {
      const { data } = await tpoApi.getInstantTestHistory();
      return data;
    },
  });

  const totalTests = tests?.length || 0;
  const totalAttempts = tests?.reduce((acc, t) => acc + (t.attempted_count || 0), 0) || 0;
  const avgScore = totalTests > 0 
    ? Math.round(tests.reduce((acc, t) => acc + (t.average_score || 0), 0) / totalTests) 
    : 0;

  // Filter tests
  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((test) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        `test #${test.id}`.toLowerCase().includes(q) ||
        (test.drive_id && `drive #${test.drive_id}`.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === "open") return test.status === "open";
      if (statusFilter === "closed") return test.status !== "open";

      return true;
    });
  }, [tests, searchQuery, statusFilter]);

  const testFilterChips = [
    { id: "all", label: "All Tests", count: totalTests },
    { id: "open", label: "Open / Active", count: tests?.filter(t => t.status === "open").length || 0 },
    { id: "closed", label: "Completed", count: tests?.filter(t => t.status !== "open").length || 0 },
  ];

  const tabs = [
    { id: "tests", label: "Tests Directory", count: totalTests, icon: Layers },
    { id: "analytics", label: "Analytics & Benchmarks", icon: PieChartIcon },
  ];

  // Mock analytics data computed for visualization
  const scoreDistribution = [
    { range: "90-100%", count: 18, fill: "#10B981" },
    { range: "75-89%", count: 34, fill: "#3B82F6" },
    { range: "60-74%", count: 22, fill: "#8B5CF6" },
    { range: "40-59%", count: 12, fill: "#F59E0B" },
    { range: "<40%", count: 5, fill: "#EF4444" },
  ];

  const topicPerformance = [
    { category: "Algorithms", avgScore: 82, benchmark: 75 },
    { category: "Data Structures", avgScore: 76, benchmark: 70 },
    { category: "DBMS / SQL", avgScore: 88, benchmark: 72 },
    { category: "Quantitative Aptitude", avgScore: 68, benchmark: 65 },
    { category: "Logical Reasoning", avgScore: 74, benchmark: 68 },
    { category: "Python Programming", avgScore: 85, benchmark: 75 },
  ];

  const violationBreakdown = [
    { name: "Tab Switching / Blur", value: 38, color: "#F59E0B" },
    { name: "Headpose / Looking Away", value: 28, color: "#3B82F6" },
    { name: "Microphone Noise", value: 18, color: "#10B981" },
    { name: "DevTools Shortcuts", value: 10, color: "#8B5CF6" },
    { name: "Copying Text", value: 6, color: "#EF4444" },
  ];

  const readinessTrend = [
    { date: "Test #1", score: 65, integrity: 98 },
    { date: "Test #2", score: 71, integrity: 96 },
    { date: "Test #3", score: 68, integrity: 99 },
    { date: "Test #4", score: 78, integrity: 95 },
    { date: "Test #5", score: 82, integrity: 97 },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3">
        <AlertTriangle size={20} />
        <div>
          <p className="font-bold">Error loading placement tests</p>
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ════════════ TOPBAR & KINETIC HEADER ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
              <Brain size={13} className="text-blue-600" />
              <span>Assessment & Integrity Deck</span>
            </span>
            <LiveStatusBeacon label="PROCTORING ENGINE READY" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Placement Tests & AI Analytics" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Administer qualifying technical & aptitude rounds, audit AI proctoring telemetry, and track cohort skill trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/tpo/tests/create">
            <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95">
              <Plus size={16} />
              <span>Create New Test</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ════════════ TOP 4 KPI SUMMARY CARDS ════════════ */}
      <StaggerGrid columns="grid-cols-2 lg:grid-cols-4" gap="gap-4">
        <GlassCard className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Published Tests</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ListChecks size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            <AnimatedCounter target={totalTests} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Campus assessments</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Attempts</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono">
            <AnimatedCounter target={totalAttempts} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Submissions evaluated</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Average</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Award size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-purple-600 font-mono">
            <AnimatedCounter target={avgScore} />%
          </div>
          <p className="text-xs text-slate-500 mt-1">Cohort benchmark score</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Proctoring Reliability</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            96.8%
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">Zero auto-terminations</p>
        </GlassCard>
      </StaggerGrid>

      {/* ════════════ SEGMENTED TABS SWITCHER ════════════ */}
      <div className="flex justify-start">
        <InteractiveTabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* ════════════ TAB 1: TESTS DIRECTORY ════════════ */}
      {activeTab === "tests" && (
        <div className="space-y-6">
          <RevealOnScroll direction="up" delay={0.05}>
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <InteractiveSearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search tests by test number or drive ID..."
                chips={testFilterChips}
                activeChip={statusFilter}
                onChipClick={setStatusFilter}
              />
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing <strong>{filteredTests.length}</strong> placement tests
                </span>
                <span>Proctoring audit tracks audio, tab switches, and eye contact violations</span>
              </div>
            </div>
          </RevealOnScroll>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-blue-50/40 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Test Specification</th>
                    <th className="px-5 py-4 font-semibold">Linked Recruitment Drive</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold text-center">Student Attempts</th>
                    <th className="px-5 py-4 font-semibold text-center">Class Average</th>
                    <th className="px-5 py-4 font-semibold text-right">Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTests.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ListChecks size={36} className="text-slate-400" />
                          <p className="font-semibold text-slate-800">No tests match your current search.</p>
                          <p className="text-xs text-slate-500">
                            Click "Create New Test" above to publish your first placement qualifying test.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTests.map((test) => (
                      <tr key={test.id} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="px-5 py-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200 shrink-0">
                              #{test.id}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                Qualifying Test #{test.id}
                              </div>
                              <div className="text-xs text-slate-500">AI Proctoring Enabled</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {test.drive_id ? (
                            <Link
                              to={`/tpo/drives/${test.drive_id}`}
                              className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
                            >
                              <span>Drive #{test.drive_id}</span>
                              <ArrowRight size={12} />
                            </Link>
                          ) : (
                            <span className="text-slate-500 text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                              General Practice
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge variant={test.status === "open" ? "success" : "neutral"}>
                            {test.status}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-center text-slate-700">
                          <div className="flex items-center justify-center gap-1.5 font-mono">
                            <Users size={14} className="text-slate-400" />
                            <span className="font-bold">{test.attempted_count}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 font-bold font-mono text-slate-900">
                            <BarChart size={14} className="text-blue-600" />
                            <span>{test.average_score}%</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link to={`/tpo/tests/attempts/1/violations`}>
                            <button className="px-3.5 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs active:scale-95">
                              <ShieldAlert size={14} className="text-amber-600" />
                              <span>Proctoring Audit</span>
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ TAB 2: ANALYTICS & INSIGHTS ════════════ */}
      {activeTab === "analytics" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Charts Row 1: Score Distribution + Violation Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Score Distribution Bar Chart */}
            <div className="lg:col-span-7 bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Score Distribution Bands</h3>
                <p className="text-xs text-slate-500">Percentage distribution of student scores across all tests.</p>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={scoreDistribution}>
                    <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", color: "#FFFFFF", borderRadius: "12px", border: "none", fontSize: "12px" }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: "600" }}
                      labelStyle={{ color: "#FFFFFF", fontWeight: "bold", marginBottom: "4px" }}
                    />
                    <Bar dataKey="count" name="Students" radius={[8, 8, 0, 0]}>
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right 5 Cols: Proctoring Violation Types Donut Chart */}
            <div className="lg:col-span-5 bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Proctoring Violations Logged</h3>
                <p className="text-xs text-slate-500">Breakdown of recorded test security strikes across sessions.</p>
              </div>

              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={violationBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {violationBreakdown.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", color: "#FFFFFF", borderRadius: "12px", border: "none", fontSize: "12px" }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: "600" }}
                      labelStyle={{ color: "#FFFFFF", fontWeight: "bold" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {violationBreakdown.map((v, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: v.color }} />
                      <span>{v.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{v.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Category Mastery & Readiness Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Subject / Category Mastery */}
            <div className="lg:col-span-6 bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Topic Performance vs Industry Benchmark</h3>
                <p className="text-xs text-slate-500">Average student accuracy score per technical domain.</p>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart layout="vertical" data={topicPerformance}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis dataKey="category" type="category" width={120} tick={{ fontSize: 11, fill: "#334155" }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", color: "#FFFFFF", borderRadius: "12px", border: "none", fontSize: "12px" }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: "600" }}
                      labelStyle={{ color: "#FFFFFF", fontWeight: "bold" }}
                    />
                    <Bar dataKey="avgScore" fill="#3B82F6" name="Average Score (%)" radius={[0, 6, 6, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overall Performance Readiness Trend Area Chart */}
            <div className="lg:col-span-6 bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Placement Readiness Trend</h3>
                <p className="text-xs text-slate-500">Progression of student scores across sequential placement tests.</p>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={readinessTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis domain={[40, 100]} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", color: "#FFFFFF", borderRadius: "12px", border: "none", fontSize: "12px" }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: "600" }}
                      labelStyle={{ color: "#FFFFFF", fontWeight: "bold" }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#10B981" fill="#D1FAE5" name="Class Average (%)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
