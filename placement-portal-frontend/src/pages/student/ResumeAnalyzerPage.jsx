import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resumeApi } from "../../api/resume.api";
import { studentApi } from "../../api/student.api";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";
import {
  FileSearch,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  MessagesSquare,
  ArrowRight,
  Award,
  Tag,
  Copy,
  Check,
  Layers,
  Wand2,
  ChevronRight,
  Target,
  BarChart3,
  Zap,
} from "lucide-react";
import { showToast, showError } from "../../utils/swal";
import { formatResumeLabel } from "../../utils/resumeFormatter";

const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Electronics & Communication",
  "Civil Engineering",
  "Chemical Engineering",
  "General Engineering",
];

/* ── SVG Circular Score Ring ── */
function ScoreRing({ score, size = 140 }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return "#10b981";
    if (s >= 65) return "#3b82f6";
    if (s >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <svg width={size} height={size} className="animate-scale-in stagger-2">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor(score)}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="score-ring-animated"
        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
      />
      <text
        x="50%"
        y="46%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="font-heading"
        style={{ fontSize: "2rem", fontWeight: 800, fill: "#0f172a" }}
      >
        {score.toFixed(0)}
      </text>
      <text
        x="50%"
        y="64%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{ fontSize: "0.7rem", fontWeight: 600, fill: "#94a3b8" }}
      >
        / 100
      </text>
    </svg>
  );
}

/* ── Pillar Progress Bar ── */
function PillarBar({ label, score, maxScore = 25, icon: Icon, delay = 0 }) {
  const pct = Math.min(100, (score / maxScore) * 100);
  const getBarColor = (s) => {
    if (s >= 20) return "bg-emerald-500";
    if (s >= 14) return "bg-blue-500";
    if (s >= 10) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className={`animate-slide-up stagger-${delay}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
          {label}
        </span>
        <span className="text-xs font-bold text-slate-900 tabular-nums">
          {score.toFixed(1)}<span className="text-slate-400 font-medium">/{maxScore}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full animate-bar-grow ${getBarColor(score)}`}
          style={{ width: `${pct}%`, animationDelay: `${0.3 + delay * 0.1}s` }}
        />
      </div>
    </div>
  );
}

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlResumeId = searchParams.get("resumeId");

  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(urlResumeId || "");
  const [selectedDepartment, setSelectedDepartment] = useState("Computer Engineering");
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [copiedRewriteIndex, setCopiedRewriteIndex] = useState(null);

  useEffect(() => {
    initPageData();
  }, []);

  const initPageData = async () => {
    try {
      setIsLoadingResumes(true);
      try {
        const profileRes = await studentApi.getProfile();
        if (profileRes.data?.branch) {
          const match = DEPARTMENTS.find(
            (d) => d.toLowerCase() === profileRes.data.branch.toLowerCase()
          );
          setSelectedDepartment(match || profileRes.data.branch);
        }
      } catch (e) {}

      const res = await resumeApi.getHistory();
      const list = res.data || [];
      setResumes(list);

      let targetId = urlResumeId;
      if (!targetId && list.length > 0) {
        const activeRes = list.find((r) => r.is_active) || list[0];
        targetId = activeRes?.id ? String(activeRes.id) : "";
      }
      if (targetId) {
        setSelectedResumeId(targetId);
        loadExistingAnalysis(Number(targetId));
      }
    } catch (err) {
      showError("Fetch Error", "Could not load your uploaded resumes.");
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const loadExistingAnalysis = async (resumeId) => {
    try {
      setIsLoadingAnalysis(true);
      const res = await resumeApi.getAnalysis(resumeId);
      if (res.data) {
        setAnalysisResult(res.data);
        if (res.data.department) setSelectedDepartment(res.data.department);
      } else {
        setAnalysisResult(null);
      }
    } catch {
      setAnalysisResult(null);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleResumeSelect = (newId) => {
    setSelectedResumeId(newId);
    if (newId) loadExistingAnalysis(Number(newId));
    else setAnalysisResult(null);
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!selectedResumeId) {
      showError("Validation Error", "Please select a resume to analyze.");
      return;
    }
    try {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      const res = await resumeApi.analyze(Number(selectedResumeId), selectedDepartment);
      setAnalysisResult(res.data);
      showToast("Resume evaluated successfully!", "success");
    } catch (err) {
      showError("Analysis Failed", err.response?.data?.detail || "Could not analyze resume.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyBullet = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedRewriteIndex(index);
    showToast("Copied!", "success");
    setTimeout(() => setCopiedRewriteIndex(null), 2500);
  };

  const getScoreBand = (score) => {
    if (score >= 80) return { label: "Top Tier — High Placement Readiness", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (score >= 65) return { label: "Competitive — Minor Refinements Needed", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (score >= 50) return { label: "Moderate — Missing Quantified Impact", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "Needs Revision — High ATS Filtering Risk", color: "text-red-700 bg-red-50 border-red-200" };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="animate-slide-down">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <FileSearch className="h-3.5 w-3.5" />
          <span>Career Intelligence</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Resume Analyzer</span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
          AI Resume Analyzer
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 max-w-2xl">
          Objective 100-point calibrated rubric across Impact, Domain Depth, ATS Structure, and Placement Relevance — tuned for any engineering discipline.
        </p>
      </div>

      {/* ── Config Card ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-slide-up stagger-1 card-hover">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-slate-900">Evaluation Settings</h2>
            <p className="text-xs text-slate-500">Select your resume and engineering discipline for domain-calibrated scoring.</p>
          </div>
        </div>

        {isLoadingResumes ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-500 animate-pulse">
            <Spinner className="h-7 w-7 text-indigo-500" />
            <p className="mt-3 text-xs font-medium">Loading resumes…</p>
          </div>
        ) : resumes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 animate-scale-in">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 mb-1 text-sm">No resumes uploaded</h3>
            <p className="text-xs text-slate-500 mb-4">Upload a resume on your Profile page first.</p>
            <Button variant="outline" onClick={() => navigate("/student/profile")}>Go to Profile</Button>
          </div>
        ) : (
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Resume Document</label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => handleResumeSelect(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  required
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{formatResumeLabel(r)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Engineering Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  required
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
                Non-CS candidates are evaluated against industry-specific tools (SolidWorks, STAAD.Pro, MATLAB, etc.) rather than web frameworks.
              </p>
              <Button
                type="submit"
                isLoading={isAnalyzing}
                disabled={isAnalyzing || !selectedResumeId}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.97]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isAnalyzing ? "Evaluating…" : analysisResult ? "Re-Analyze" : "Run Analysis"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {isLoadingAnalysis && (
        <div className="py-16 flex flex-col items-center justify-center animate-pulse">
          <Spinner className="h-8 w-8 text-indigo-500" />
          <p className="mt-4 text-xs font-medium text-slate-400">Retrieving analysis report…</p>
        </div>
      )}

      {/* ── Results ── */}
      {!isLoadingAnalysis && analysisResult && (
        <div className="space-y-6">

          {/* Department chip */}
          <div className="flex items-center gap-2 text-xs text-slate-500 animate-slide-up stagger-1">
            <Target className="h-3.5 w-3.5 text-indigo-500" />
            <span>Calibrated for <strong className="font-bold text-slate-700">{analysisResult.department || selectedDepartment}</strong></span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">4-Pillar Rubric</span>
          </div>

          {/* ── Score Hero + Pillars ── */}
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

            {/* Score ring card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center card-hover animate-slide-up stagger-2">
              <ScoreRing score={analysisResult.score ?? 0} />
              <div className="mt-4 text-center">
                {(() => {
                  const band = getScoreBand(analysisResult.score ?? 0);
                  return (
                    <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold border ${band.color} animate-scale-in stagger-4`}>
                      {band.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Pillar breakdown card */}
            {analysisResult.category_scores && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm card-hover animate-slide-up stagger-3">
                <div className="flex items-center gap-2 mb-5">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <h3 className="font-heading text-sm font-bold text-slate-900">Rubric Breakdown</h3>
                  <span className="ml-auto text-[10px] text-slate-400 font-medium">25 pts each</span>
                </div>
                <div className="space-y-5">
                  <PillarBar label="Impact & Metrics" score={analysisResult.category_scores.impact_and_metrics || 0} icon={BarChart3} delay={3} />
                  <PillarBar label="Technical Depth" score={analysisResult.category_scores.technical_depth || 0} icon={Zap} delay={4} />
                  <PillarBar label="ATS Formatting" score={analysisResult.category_scores.ats_formatting || 0} icon={FileText} delay={5} />
                  <PillarBar label="Placement Readiness" score={analysisResult.category_scores.placement_readiness || 0} icon={Award} delay={6} />
                </div>
              </div>
            )}
          </div>

          {/* ── Stat Mini Cards ── */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Strengths Found", value: analysisResult.strengths?.length || 0, icon: CheckCircle2, accent: "text-emerald-600 bg-emerald-50" },
              { label: "Skill Gaps", value: analysisResult.missing_skills?.length || 0, icon: AlertTriangle, accent: "text-amber-600 bg-amber-50" },
              { label: "Bullet Rewrites", value: analysisResult.suggested_bullet_rewrites?.length || 0, icon: Sparkles, accent: "text-indigo-600 bg-indigo-50" },
            ].map((stat, i) => (
              <div key={stat.label} className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm card-hover animate-slide-up stagger-${i + 4}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${stat.accent}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums animate-count-up" style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── Bullet Rewrites ── */}
          {analysisResult.suggested_bullet_rewrites?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-slide-up stagger-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-heading text-sm font-bold text-slate-900">Before → After Rewrites</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Google X-Y-Z Formula</span>
              </div>

              <div className="space-y-4">
                {analysisResult.suggested_bullet_rewrites.map((rw, idx) => (
                  <div key={idx} className={`rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 animate-slide-up stagger-${Math.min(idx + 5, 8)}`}>
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-slate-200 font-bold text-[9px] text-slate-600 uppercase">Before</span>
                      <p className="line-through italic leading-relaxed">"{rw.original}"</p>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-emerald-600 font-bold text-[9px] text-white uppercase">After</span>
                        <p className="font-medium text-emerald-950 leading-relaxed">{rw.improved}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyBullet(rw.improved, idx)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-95"
                      >
                        {copiedRewriteIndex === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedRewriteIndex === idx ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Strengths + Missing Skills Grid ── */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Strengths */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm card-hover animate-slide-in-left stagger-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h3 className="font-heading text-sm font-bold text-slate-900">Strengths</h3>
              </div>
              {analysisResult.strengths?.length > 0 ? (
                <ul className="space-y-2.5">
                  {analysisResult.strengths.map((str, idx) => (
                    <li key={idx} className={`flex items-start gap-2.5 text-xs text-slate-700 animate-slide-up stagger-${Math.min(idx + 3, 8)}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{str}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No major strengths highlighted.</p>
              )}
            </div>

            {/* Missing Skills */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm card-hover animate-slide-in-right stagger-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-4 w-4 text-amber-500" />
                <h3 className="font-heading text-sm font-bold text-slate-900">Missing Skills</h3>
              </div>
              {analysisResult.missing_skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysisResult.missing_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 animate-scale-in stagger-${Math.min(idx + 3, 8)}`}
                    >
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> No critical gaps detected
                </p>
              )}
            </div>
          </div>

          {/* ── Critical Improvements ── */}
          {analysisResult.critical_improvements?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-slide-up stagger-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-indigo-500" />
                <h3 className="font-heading text-sm font-bold text-slate-900">Priority Action Items</h3>
              </div>
              <div className="space-y-2.5">
                {analysisResult.critical_improvements.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs text-slate-700 animate-slide-up stagger-${Math.min(idx + 4, 8)}`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed pt-0.5">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CTA Bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 animate-slide-up stagger-7">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ready to improve?</h3>
              <p className="text-xs text-slate-500">Enhance your resume or test in a mock interview.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/student/resume-enhancer")}
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-white font-semibold transition-all active:scale-95"
              >
                <Wand2 className="mr-2 h-4 w-4 text-indigo-500" />
                AI Enhancer
              </Button>
              <Button
                onClick={() => selectedResumeId && navigate(`/student/mock-interview?resumeId=${selectedResumeId}`, { state: { resumeId: selectedResumeId, tab: "resume" } })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
              >
                Mock Interview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
