import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { interviewApi } from "../../api/interview.api";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import {
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  FileText,
  Code2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { showError } from "../../utils/swal";

export default function MockInterviewResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    fetchResult();
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      setIsLoading(true);
      const res = await interviewApi.getResult(sessionId);
      setResult(res.data);
    } catch (err) {
      showError("Error Loading Results", err.response?.data?.detail || "Could not fetch interview results.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-10 w-10 text-indigo-600" />
          <p className="mt-3 text-sm font-medium text-slate-600">Generating interview score report...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-2" />
        <p className="font-heading text-lg font-bold text-slate-800">Result Not Found</p>
        <p className="mt-1 text-xs text-slate-500">Could not find interview data for session #{sessionId}.</p>
        <Button
          onClick={() => navigate("/student/mock-interview")}
          className="mt-4 bg-indigo-600 text-white"
        >
          Back to Mock Interviews
        </Button>
      </div>
    );
  }

  const { company_name, mode, overall_score, weak_areas, questions, answers, created_at } = result;

  // Map answers to questions by matching question_id or array order
  const questionAnswerPairs = (questions || []).map((q, idx) => {
    const ans = (answers || []).find((a) => a.question_id === q.id) || answers?.[idx];
    return { question: q, answer: ans };
  });

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-200">
            <span>Mock Interview Report</span>
            <span>•</span>
            <span className="capitalize">Target: {company_name || "General"}</span>
          </div>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="h-7 w-7 text-amber-300" />
            Interview Results & Feedback
          </h1>
          <p className="mt-1 text-xs text-indigo-200">
            Session #{sessionId} • Completed on {new Date(created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => navigate("/student/mock-interview")}
            variant="outline"
            className="border-indigo-300/40 text-white hover:bg-white/10"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            New Practice Session
          </Button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Overall Score Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Overall Score
          </span>
          <div className="my-3 flex items-baseline gap-2">
            <span className="font-heading text-4xl font-extrabold text-slate-900">
              {overall_score !== null && overall_score !== undefined ? overall_score.toFixed(1) : "N/A"}
            </span>
            <span className="text-sm font-semibold text-slate-400">/ 100</span>
          </div>
          <p className="text-xs text-slate-500">
            {overall_score >= 80
              ? "🌟 Excellent performance! Ready for top technical interviews."
              : overall_score >= 50
              ? "👍 Solid effort. Review weak areas below for improvements."
              : "💪 Needs practice. Focus on core concepts and clarity."}
          </p>
        </div>

        {/* Total Questions Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-indigo-600" />
            Questions Evaluated
          </span>
          <div className="my-3 flex items-baseline gap-2">
            <span className="font-heading text-4xl font-extrabold text-slate-900">
              {questionAnswerPairs.length}
            </span>
            <span className="text-sm font-semibold text-slate-400">Questions</span>
          </div>
          <p className="text-xs text-slate-500">
            Mode: <span className="font-semibold text-slate-700 uppercase">{mode || "Standard"}</span>
          </p>
        </div>

        {/* Weak Areas Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Areas for Growth
          </span>
          <div className="my-2 flex flex-wrap gap-1.5">
            {weak_areas && weak_areas.length > 0 ? (
              weak_areas.map((area, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800"
                >
                  {area}
                </span>
              ))
            ) : (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                No major weak areas detected!
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Identified by AI based on response evaluations.</p>
        </div>
      </div>

      {/* Detailed Question & Answer Breakdown */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-indigo-600" />
          Question Breakdown & AI Feedback
        </h2>

        <div className="space-y-4">
          {questionAnswerPairs.map((pair, idx) => {
            const { question, answer } = pair;
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={question.id || idx}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition"
              >
                {/* Accordion Card Header */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex cursor-pointer items-center justify-between gap-4 p-4 md:p-5 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                      Q{idx + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-indigo-600">
                          {question.q_type}
                        </span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-xs text-slate-500 capitalize">{question.difficulty}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">
                        {question.question_text}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {answer?.score !== undefined && answer?.score !== null && (
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${getScoreColor(
                          answer.score
                        )}`}
                      >
                        Score: {answer.score}/100
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 text-xs">
                    {/* Full Question Text */}
                    <div className="rounded-xl bg-white p-4 border border-slate-200">
                      <p className="font-semibold text-slate-700 mb-1">Full Question:</p>
                      <p className="text-slate-900 text-sm leading-relaxed whitespace-pre-wrap">
                        {question.question_text}
                      </p>
                    </div>

                    {/* Candidate Answer */}
                    <div className="rounded-xl bg-indigo-900 text-white p-4 shadow-sm">
                      <p className="font-semibold text-indigo-200 mb-1">Your Submitted Answer:</p>
                      <pre className="font-mono text-xs whitespace-pre-wrap text-indigo-100 leading-relaxed overflow-x-auto">
                        {answer?.answer_text || "(No response recorded)"}
                      </pre>
                    </div>

                    {/* AI Feedback */}
                    {answer?.ai_feedback && (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-1">
                        <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                          AI Evaluator Feedback:
                        </p>
                        <p className="text-emerald-900 text-xs leading-relaxed whitespace-pre-wrap pt-1">
                          {answer.ai_feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
