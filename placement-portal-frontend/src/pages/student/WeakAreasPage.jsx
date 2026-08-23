import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentApi } from "../../api/student.api";
import Button from "../../components/common/Button";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import {
  TrendingDown,
  AlertTriangle,
  Clock,
  BrainCircuit,
  ListChecks,
  MessagesSquare,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Tag,
  Repeat,
  RotateCcw,
} from "lucide-react";
import { showError } from "../../utils/swal";

export default function WeakAreasPage() {
  const navigate = useNavigate();

  const [data, setData] = useState({ timeline: [], recurring: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeakAreas();
  }, []);

  const fetchWeakAreas = async () => {
    try {
      setIsLoading(true);
      const res = await studentApi.getWeakAreas();
      setData(res.data || { timeline: [], recurring: [] });
    } catch (err) {
      showError("Error Loading Weak Areas", err.response?.data?.detail || "Could not fetch your weak areas analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeSkill = (skillName) => {
    navigate(`/student/mock-interview?skill=${encodeURIComponent(skillName)}`, {
      state: { skill: skillName, tab: "manual" },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-10 w-10 text-rose-600" />
          <p className="mt-3 text-sm font-medium text-slate-600">Analyzing your performance history & skill gaps...</p>
        </div>
      </div>
    );
  }

  const { recurring = [], timeline = [] } = data;
  const sortedRecurring = [...recurring].sort((a, b) => b.occurrences - a.occurrences);
  const isEmpty = sortedRecurring.length === 0 && timeline.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-900 via-rose-800 to-indigo-900 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-rose-200">
            <span>Placement Performance Tracking</span>
            <span>•</span>
            <span>Skill Diagnostics</span>
          </div>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingDown className="h-7 w-7 text-rose-300" />
            Weak Areas & Skill Gaps
          </h1>
          <p className="mt-1 text-xs text-rose-100">
            Identified weaknesses aggregated from your AI Mock Interviews and Practice Test attempts. Focus on recurring gaps to boost readiness.
          </p>
        </div>

        <Button
          onClick={fetchWeakAreas}
          variant="outline"
          className="border-rose-300/40 text-white hover:bg-white/10"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Refresh Analysis
        </Button>
      </div>

      {/* Encouraging Empty State */}
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-heading text-lg font-bold text-slate-900">No Weak Areas Found Yet!</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Complete a mock interview or practice test to see your weak areas, recurring gaps, and targeted practice recommendations here.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate("/student/mock-interview")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md"
            >
              <BrainCircuit className="mr-2 h-4 w-4" />
              Start Mock Interview
            </Button>

            <Button
              onClick={() => navigate("/student/tests")}
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Take Practice Test
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Recurring Weaknesses */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Repeat className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Recurring Weaknesses
                  </h2>
                  <p className="text-xs text-slate-500">
                    Topics flagged 2 or more times across multiple tests and mock interviews.
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">
                {sortedRecurring.length} Recurring Topics
              </span>
            </div>

            {sortedRecurring.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedRecurring.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm transition hover:border-rose-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                          <h3 className="font-heading text-sm font-bold text-slate-900">
                            {item.weak_area}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Appeared in {item.occurrences} different evaluation sessions.
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                          item.occurrences >= 3
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {item.occurrences}x Flagged
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handlePracticeSkill(item.weak_area)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm"
                      >
                        <MessagesSquare className="mr-1.5 h-3.5 w-3.5" />
                        Practice This
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>No recurring weak areas detected yet! All identified topics have appeared only once.</span>
              </div>
            )}
          </div>

          {/* Section 2: Weakness Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">
                    Weakness Timeline Feed
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chronological stream of all weak area records flagged during interviews & practice tests.
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                {timeline.length} Total Records
              </span>
            </div>

            {timeline.length > 0 ? (
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 py-2">
                {timeline.map((entry, idx) => {
                  const isMock = entry.source === "mock_interview";
                  const SourceIcon = isMock ? BrainCircuit : ListChecks;

                  return (
                    <div key={idx} className="relative pl-6">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${
                          isMock ? "bg-purple-600" : "bg-blue-600"
                        }`}
                      />

                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                        {/* Header metadata line */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                isMock
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              <SourceIcon className="h-3.5 w-3.5" />
                              {isMock ? "Mock Interview" : "Instant Test"}
                            </span>

                            {entry.related_to && (
                              <span className="text-xs font-semibold text-slate-700">
                                {entry.related_to}
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Weak areas list tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {entry.weak_areas && entry.weak_areas.length > 0 ? (
                            entry.weak_areas.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800"
                              >
                                <Tag className="h-3 w-3 text-rose-600" />
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No specific weak areas recorded.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                No timeline records available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
