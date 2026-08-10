import React, { useState } from "react";
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
  Layers
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

export default function PastTestsPage() {
  const [activeTab, setActiveTab] = useState("tests"); // "tests" | "analytics"

  const { data: tests, isLoading, error } = useQuery({
    queryKey: ["tpo-tests-history"],
    queryFn: async () => {
      const { data } = await tpoApi.getInstantTestHistory();
      return data;
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (error) return <div className="p-4 text-red-500">Error loading tests: {error.message}</div>;

  const totalTests = tests?.length || 0;
  const totalAttempts = tests?.reduce((acc, t) => acc + (t.attempted_count || 0), 0) || 0;
  const avgScore = totalTests > 0 
    ? Math.round(tests.reduce((acc, t) => acc + (t.average_score || 0), 0) / totalTests) 
    : 0;

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Tests & Analytics</h1>
          <p className="text-slate-600 mt-1">Manage placement qualifying tests and review student performance analytics.</p>
        </div>

        <Link to="/tpo/tests/create">
          <button className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 active:scale-95">
            <Plus size={16} />
            <span>Add New Test</span>
          </button>
        </Link>
      </div>

      {/* Smooth Glass Segmented Tabs Bar */}
      <div className="bg-slate-200/60 p-1.5 rounded-2xl flex items-center gap-2 max-w-md border border-slate-300/60 shadow-inner">
        <button
          onClick={() => setActiveTab("tests")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none ${
            activeTab === "tests"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200/80 scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <Layers size={15} />
          <span>Tests Directory ({totalTests})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 select-none ${
            activeTab === "analytics"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200/80 scale-[1.02]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <PieChartIcon size={15} />
          <span>Analytics & Insights</span>
        </button>
      </div>

      {/* TAB 1: TESTS DIRECTORY */}
      {activeTab === "tests" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-border">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Test ID</th>
                  <th className="px-4 py-3.5 font-semibold">Drive Reference</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Student Attempts</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Average Score</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tests?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                      <p className="font-semibold text-slate-700">No tests created yet.</p>
                      <p className="text-xs text-slate-500 mt-1">Click "Add New Test" above to publish your first placement test.</p>
                    </td>
                  </tr>
                ) : (
                  tests?.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <ListChecks size={16} className="text-blue-600 shrink-0" />
                          <span className="font-bold">Test #{test.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {test.drive_id ? (
                          <Link to={`/tpo/drives/${test.drive_id}`} className="text-blue-600 hover:underline font-semibold">
                            Drive #{test.drive_id}
                          </Link>
                        ) : (
                          <span className="text-slate-500 text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium">General Practice</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={test.status === "open" ? "success" : "neutral"}>
                          {test.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-700">
                        <div className="flex items-center justify-center gap-1.5">
                          <Users size={14} className="text-slate-400" />
                          <span className="font-semibold">{test.attempted_count}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold text-slate-900">
                          <BarChart size={14} className="text-blue-600" />
                          <span>{test.average_score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link to={`/tpo/tests/attempts/1/violations`}>
                          <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all">
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
        </Card>
      )}

      {/* TAB 2: ANALYTICS & INSIGHTS */}
      {activeTab === "analytics" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-l-4 border-l-blue-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Published Tests</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1 font-heading">{totalTests}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ListChecks size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-emerald-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Attempts</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1 font-heading">{totalAttempts}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-purple-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Class Avg Score</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1 font-heading">{avgScore}%</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award size={20} />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-l-4 border-l-amber-500 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Proctoring Integrity</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1 font-heading">96.8%</h3>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Clean attempts without auto-termination</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row 1: Score Distribution + Violation Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Score Distribution Bar Chart */}
            <Card className="lg:col-span-7 p-6 space-y-4 shadow-sm">
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
            </Card>

            {/* Right 5 Cols: Proctoring Violation Types Donut Chart */}
            <Card className="lg:col-span-5 p-6 space-y-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Proctoring Violations Logged</h3>
                <p className="text-xs text-slate-500">Breakdown of recorded test security strikes.</p>
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
            </Card>
          </div>

          {/* Charts Row 2: Category Mastery & Readiness Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Subject / Category Mastery */}
            <Card className="lg:col-span-6 p-6 space-y-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Topic Performance vs Industry Benchmark</h3>
                <p className="text-xs text-slate-500">Average student accuracy score per technical domain.</p>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart layout="vertical" data={topicPerformance}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis dataKey="category" type="category" width={110} tick={{ fontSize: 11, fill: "#334155" }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0F172A", color: "#FFFFFF", borderRadius: "12px", border: "none", fontSize: "12px" }}
                      itemStyle={{ color: "#FFFFFF", fontWeight: "600" }}
                      labelStyle={{ color: "#FFFFFF", fontWeight: "bold" }}
                    />
                    <Bar dataKey="avgScore" fill="#3B82F6" name="Average Score (%)" radius={[0, 6, 6, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Overall Performance Readiness Trend Area Chart */}
            <Card className="lg:col-span-6 p-6 space-y-4 shadow-sm">
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
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
