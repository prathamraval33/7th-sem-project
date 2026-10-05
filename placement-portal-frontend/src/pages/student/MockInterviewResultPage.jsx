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
  Tag,
  AlertCircle,
  Gauge,
  ChevronRight,
  Target,
  BarChart3,
  Calendar,
} from "lucide-react";
import { showError } from "../../utils/swal";

const RATING_CONFIG = {
  interview_ready: {
    label: "Interview Ready",
    color: "purple",
    badgeClass: "bg-purple-50 text-purple-900 border-purple-200",
    pillClass: "bg-purple-600 text-white",
    dotClass: "bg-purple-600",
  },
  good: {
    label: "Good",
    color: "yellow",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
    pillClass: "bg-amber-500 text-white",
    dotClass: "bg-amber-400",
  },
  somewhat_closer: {
    label: "Somewhat There",
    color: "green",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-200",
    pillClass: "bg-emerald-600 text-white",
    dotClass: "bg-emerald-500",
  },
  not_relevant: {
    label: "Not Relevant",
    color: "red",
    badgeClass: "bg-rose-50 text-rose-900 border-rose-200",
    pillClass: "bg-rose-600 text-white",
    dotClass: "bg-rose-500",
  },
};

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
      <div className="flex h-96 items-center justify-center animate-pulse">
        <div className="text-center">
          <Spinner className="mx-auto h-10 w-10 text-indigo-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Generating interview performance report…</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center animate-scale-in">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-2" />
        <p className="font-heading text-lg font-bold text-slate-800">Result Not Found</p>
        <p className="mt-1 text-xs text-slate-500">Could not find interview data for this session.</p>
        <Button
          onClick={() => navigate("/student/mock-interview")}
          className="mt-4 bg-slate-900 text-white"
        >
          Back to Mock Interviews
        </Button>
      </div>
    );
  }

  const {
    company_name,
    mode,
    difficulty_level,
    overall_score,
    weak_areas,
    questions,
    answers,
    created_at,
    rating_distribution,
  } = result;

  // Map answers to questions by matching question_id or array order
  const questionAnswerPairs = (questions || []).map((q, idx) => {
    const ans = (answers || []).find((a) => a.question_id === q.id) || answers?.[idx];
    return { question: q, answer: ans };
  });

  // Calculate rating distribution counts
  const counts = rating_distribution || {
    interview_ready: 0,
    good: 0,
    somewhat_closer: 0,
    not_relevant: 0,
  };

  if (!rating_distribution) {
    (answers || []).forEach((a) => {
      if (a?.rating && counts[a.rating] !== undefined) {
        counts[a.rating]++;
      }
    });
  }

  const totalAnswered = questionAnswerPairs.filter((p) => p.answer).length || 1;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="animate-slide-down">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" />
          <span>Placement Practice</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Performance Report</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Award className="h-7 w-7 text-indigo-600" />
              Interview Performance Report
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Target className="h-3.5 w-3.5 text-indigo-500" />
                Target: {company_name || "General Placement"}
              </span>
              <span className="text-slate-300">·</span>
              <span className="capitalize font-medium text-slate-600">
                Level: {difficulty_level || "Fresher"}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Completed {new Date(created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/student/mock-interview")}
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              New Practice Session
            </Button>
          </div>
        </div>
      </div>

      {/* ── Overview Cards Grid ── */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Rating Distribution Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between card-hover animate-slide-up stagger-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Rating Distribution
          </span>

          <div className="my-3 space-y-2">
            {/* Visual stacked distribution bar */}
            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100">
              <div
                style={{ width: `${(counts.interview_ready / totalAnswered) * 100}%` }}
                className="bg-purple-600 transition-all duration-500"
                title={`${counts.interview_ready} Interview Ready`}
              />
              <div
                style={{ width: `${(counts.good / totalAnswered) * 100}%` }}
                className="bg-amber-400 transition-all duration-500"
                title={`${counts.good} Good`}
              />
              <div
                style={{ width: `${(counts.somewhat_closer / totalAnswered) * 100}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`${counts.somewhat_closer} Somewhat There`}
              />
              <div
                style={{ width: `${(counts.not_relevant / totalAnswered) * 100}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`${counts.not_relevant} Not Relevant`}
              />
            </div>

            {/* Counts list */}
            <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-900 border border-purple-200">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                {counts.interview_ready} Ready
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {counts.good} Good
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {counts.somewhat_closer} There
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-rose-50 text-rose-900 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {counts.not_relevant} Review
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {counts.interview_ready >= 6
              ? "🌟 Outstanding performance! Consistently demonstrated interview-ready understanding."
              : counts.interview_ready + counts.good >= 5
              ? "👍 Solid round. Deepen architectural tradeoffs to reach top tier."
              : "💪 Good effort. Review actionable evaluator feedback below."}
          </p>
        </div>

        {/* Total Questions Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between card-hover animate-slide-up stagger-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-600" />
            Session Scope
          </span>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-extrabold text-slate-900">
                {questionAnswerPairs.length}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 10 Questions Evaluated</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                Mode: {mode?.toUpperCase() || "FULL"}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                Level: {difficulty_level?.toUpperCase() || "FRESHER"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">All questions checked for company calibration & deduplication.</p>
        </div>

        {/* Weak Areas Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between card-hover animate-slide-up stagger-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Identified Growth Areas
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
                No major concept gaps detected!
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Automatically tracked in your Weak Areas Dashboard.</p>
        </div>
      </div>

      {/* ── Detailed Question & Answer Breakdown ── */}
      <div className="space-y-4 animate-slide-up stagger-4">
        <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-indigo-600" />
          Question Breakdown & Evaluator Reviews
        </h2>

        <div className="space-y-3">
          {questionAnswerPairs.map((pair, idx) => {
            const { question, answer } = pair;
            const isExpanded = expandedIndex === idx;
            const ratingConfig = answer?.rating ? RATING_CONFIG[answer.rating] : null;

            return (
              <div
                key={question.id || idx}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all card-hover"
              >
                {/* Accordion Card Header */}
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex cursor-pointer items-center justify-between gap-4 p-4 md:p-5 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-800 shrink-0">
                      Q{idx + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {question.q_type}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500 capitalize">{question.difficulty}</span>

                        {question.resume_reference && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {question.resume_reference}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">
                        {question.question_text}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {ratingConfig && (
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${ratingConfig.badgeClass}`}>
                        {ratingConfig.label}
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 text-xs animate-scale-in">
                    {/* Full Question Text */}
                    <div className="rounded-xl bg-white p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800">Interview Question:</p>
                        {question.resume_reference && (
                          <span className="text-[11px] text-slate-500">
                            Resume anchor: <span className="font-semibold text-slate-700">{question.resume_reference}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 text-sm leading-relaxed whitespace-pre-wrap">
                        {question.question_text}
                      </p>
                    </div>

                    {/* Candidate Answer */}
                    <div className="rounded-xl bg-slate-900 text-white p-4 shadow-sm">
                      <p className="font-semibold text-slate-300 mb-1">Your Submitted Response:</p>
                      <pre className="font-sans text-xs whitespace-pre-wrap text-slate-100 leading-relaxed overflow-x-auto">
                        {answer?.answer_text || "(No response recorded)"}
                      </pre>
                    </div>

                    {/* AI Feedback */}
                    {answer?.ai_feedback && (
                      <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                            Interviewer Feedback:
                          </p>
                          {ratingConfig && (
                            <span className={`rounded px-2 py-0.5 text-xs font-bold border ${ratingConfig.badgeClass}`}>
                              {ratingConfig.label}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                          {answer.ai_feedback}
                        </p>
                      </div>
                    )}

                    {/* What was missing */}
                    {answer?.what_was_missing && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900">
                        <p className="font-semibold text-amber-950 mb-0.5 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          To reach the next level:
                        </p>
                        <p className="text-amber-800 text-xs leading-relaxed">{answer.what_was_missing}</p>
                      </div>
                    )}

                    {/* Interviewer Note Reveal */}
                    {answer?.interviewer_note_reveal && (
                      <div className="rounded-xl bg-slate-100 border border-slate-200 p-3 text-slate-900">
                        <p className="font-semibold text-slate-950 mb-0.5 flex items-center gap-1.5">
                          <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                          What a strong answer covers:
                        </p>
                        <p className="text-slate-700 text-xs leading-relaxed">{answer.interviewer_note_reveal}</p>
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
