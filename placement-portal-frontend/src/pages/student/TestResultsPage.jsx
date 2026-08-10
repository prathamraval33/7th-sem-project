import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { testApi } from "../../api/test.api";
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  BookOpen, 
  RotateCcw,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";

export default function TestResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ["test-results", id],
    queryFn: () => testApi.getAttemptResults(id).then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  const passed = results?.passed;
  const isPractice = results?.is_practice;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className={`p-8 rounded-2xl border ${passed ? "bg-emerald-900 text-white border-emerald-800" : "bg-slate-900 text-white border-slate-800"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${isPractice ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"}`}>
                {isPractice ? "Self Practice Test" : "Official Drive Assessment"}
              </span>
              {results?.ended_reason === "violation_limit" && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-500/30 text-red-300 flex items-center gap-1">
                  <ShieldAlert size={12} /> Force Ended
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold font-heading">{results?.test_title}</h1>
            <p className="text-sm text-slate-300">
              Completed on {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Score Badge */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-center border border-white/10 min-w-[140px]">
            <p className="text-xs uppercase font-semibold text-slate-300">Total Score</p>
            <p className="text-3xl font-extrabold font-heading mt-0.5">
              {results?.score} <span className="text-sm font-normal text-slate-400">/ {results?.total_possible}</span>
            </p>
            <p className={`text-xs font-bold mt-1 ${passed ? "text-emerald-400" : "text-rose-400"}`}>
              {results?.percentage}% ({passed ? "PASSED" : "FAILED"})
            </p>
          </div>
        </div>
      </div>

      {/* Weak Areas Revision Callout */}
      {results?.weak_areas?.length > 0 && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 font-heading">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Weak Topics Identified for Revision
            </h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {results.weak_areas.map((topic, idx) => (
                <span key={idx} className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-xs font-semibold">
                  {topic}
                </span>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/student/resources")}
            className="border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
          >
            <BookOpen size={14} className="mr-1.5" /> Revise in Library
          </Button>
        </div>
      )}

      {/* Detailed Question Review */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 font-heading border-b pb-3">
          Question Answer Breakdown
        </h2>

        <div className="space-y-4">
          {results?.review_questions?.map((q, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Question {idx + 1}</span>
                {q.is_correct ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 size={13} /> Correct (+{q.marks || 1})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <XCircle size={13} /> Incorrect (0)
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-slate-900">{q.question_text}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.options?.map((opt, oIdx) => {
                  let optStyle = "bg-white border-slate-200 text-slate-700";
                  if (oIdx === q.correct_shuffled_index) {
                    optStyle = "bg-emerald-100 border-emerald-300 text-emerald-900 font-bold";
                  } else if (oIdx === q.user_selected_index && !q.is_correct) {
                    optStyle = "bg-rose-100 border-rose-300 text-rose-900 font-semibold line-through";
                  }

                  return (
                    <div key={oIdx} className={`p-2.5 rounded-lg border flex items-center space-x-2 ${optStyle}`}>
                      <span className="font-mono text-[10px] uppercase font-bold">{String.fromCharCode(65 + oIdx)}:</span>
                      <span>{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="ghost" onClick={() => navigate("/student/dashboard")}>
          Back to Dashboard
        </Button>
        <Button variant="primary" onClick={() => navigate("/student/drives")}>
          View Active Drives <ArrowRight size={14} className="ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
