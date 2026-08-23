import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resumeApi } from "../../api/resume.api";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
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
  RefreshCw,
  Tag,
} from "lucide-react";
import { showToast, showError } from "../../utils/swal";

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setIsLoadingResumes(true);
      const res = await resumeApi.getHistory();
      const list = res.data || [];
      setResumes(list);

      // Pre-select active resume if available
      const activeRes = list.find((r) => r.is_active) || list[0];
      if (activeRes) {
        setSelectedResumeId(activeRes.id);
      }
    } catch (err) {
      showError("Fetch Error", "Could not load your uploaded resumes.");
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();

    if (!selectedResumeId) {
      showError("Validation Error", "Please select a resume to analyze.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      const res = await resumeApi.analyze(Number(selectedResumeId));
      setAnalysisResult(res.data);
      showToast("Resume analyzed successfully!", "success");
    } catch (err) {
      showError("Analysis Failed", err.response?.data?.detail || "Could not analyze resume. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePracticeMockInterview = () => {
    if (!selectedResumeId) return;
    navigate(`/student/mock-interview?resumeId=${selectedResumeId}`, {
      state: { resumeId: selectedResumeId, tab: "resume" },
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-indigo-900 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-200">
            <span>Placement Readiness Tool</span>
            <span>•</span>
            <span>AI Resume Reviewer</span>
          </div>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSearch className="h-7 w-7 text-teal-300" />
            AI Resume Analyzer
          </h1>
          <p className="mt-1 text-xs text-teal-100">
            Analyze your resume content against industry standards for score evaluation, missing placement skills, and constructive suggestions.
          </p>
        </div>
      </div>

      {/* Resume Selection Form Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Select Resume for Analysis</h2>
            <p className="text-xs text-slate-500">Pick one of your uploaded resumes to perform instant AI analysis.</p>
          </div>
        </div>

        {isLoadingResumes ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <Spinner className="h-8 w-8 text-teal-600" />
            <p className="mt-3 text-xs font-medium">Loading your resumes...</p>
          </div>
        ) : resumes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <FileText className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 mb-1">No uploaded resumes found</h3>
            <p className="text-xs text-slate-500 mb-4">
              Please upload a resume on your Profile page before using the AI Resume Analyzer.
            </p>
            <Button variant="outline" onClick={() => navigate("/student/profile")}>
              Go to Profile Page
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Choose Uploaded Resume *
              </label>
              <select
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  setAnalysisResult(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                required
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {`Resume #${r.id} — ${r.source === "enhanced" ? "AI Enhanced" : "Uploaded"} ${
                      r.is_active ? "(Active)" : ""
                    }`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                isLoading={isAnalyzing}
                disabled={isAnalyzing || !selectedResumeId}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-teal-100"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isAnalyzing ? "Analyzing Resume..." : "Run AI Analysis"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Result Summary Bar / Cards */}
          <div className="grid gap-5 md:grid-cols-3">
            {/* Score Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-teal-600" />
                Resume AI Score
              </span>
              <div className="my-3 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-extrabold text-slate-900">
                  {analysisResult.score !== undefined && analysisResult.score !== null
                    ? analysisResult.score.toFixed(1)
                    : "N/A"}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ 100</span>
              </div>
              <div>
                <span
                  className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold border ${getScoreColor(
                    analysisResult.score
                  )}`}
                >
                  {analysisResult.score >= 80
                    ? "🌟 High Placement Readiness"
                    : analysisResult.score >= 50
                    ? "👍 Moderate Fit — Needs Refinement"
                    : "⚠️ Low Score — Major Revisions Recommended"}
                </span>
              </div>
            </div>

            {/* Missing Skills Count Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Missing Skill Gaps
              </span>
              <div className="my-3 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-extrabold text-slate-900">
                  {analysisResult.missing_skills?.length || 0}
                </span>
                <span className="text-sm font-semibold text-slate-400">Identified Gaps</span>
              </div>
              <p className="text-xs text-slate-500">
                Skills recommended to add based on target company expectations.
              </p>
            </div>

            {/* Suggestions Count Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-indigo-600" />
                Recommendations
              </span>
              <div className="my-3 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-extrabold text-slate-900">
                  {analysisResult.suggestions?.length || 0}
                </span>
                <span className="text-sm font-semibold text-slate-400">Action Items</span>
              </div>
              <p className="text-xs text-slate-500">
                Actionable improvement suggestions for higher ATS shortlist rate.
              </p>
            </div>
          </div>

          {/* Missing Skills Tags Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-600" />
              Missing Skills & Recommended Additions
            </h3>
            {analysisResult.missing_skills && analysisResult.missing_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {analysisResult.missing_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Great job! No major missing skill gaps detected.
              </p>
            )}
          </div>

          {/* Detailed Suggestions Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-indigo-600" />
              AI Recommendations & Feedback List
            </h3>
            {analysisResult.suggestions && analysisResult.suggestions.length > 0 ? (
              <div className="space-y-3 pt-1">
                {analysisResult.suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-800"
                  >
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                      {idx + 1}
                    </div>
                    <p className="leading-relaxed text-slate-800 pt-0.5">{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No specific suggestions provided.</p>
            )}
          </div>

          {/* CTA Box to Practice Mock Interview */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                <MessagesSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-indigo-950">Ready to Test Your Preparation?</h3>
                <p className="text-xs text-indigo-800">
                  Launch a mock interview grounded directly in this analyzed resume content!
                </p>
              </div>
            </div>

            <Button
              onClick={handlePracticeMockInterview}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md"
            >
              Practice This in a Mock Interview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
