import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { testApi } from "../../api/test.api";
import { ShieldAlert, AlertTriangle, ArrowLeft, User } from "lucide-react";
import Spinner from "../../components/ui/Spinner";

export default function TpoTestAuditPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const { data: audit, isLoading } = useQuery({
    queryKey: ["test-audit", attemptId],
    queryFn: () => testApi.getAttemptViolations(attemptId).then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={14} className="mr-1" /> Back
      </button>

      {/* Header Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <ShieldAlert size={16} /> Proctoring Audit Log
          </div>
          <h1 className="text-xl font-bold font-heading mt-1">{audit?.student_name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{audit?.student_email}</p>
        </div>

        <div className="bg-white/10 p-3 rounded-xl text-center min-w-[120px]">
          <p className="text-[11px] text-slate-300 uppercase font-semibold">Total Strikes</p>
          <p className="text-2xl font-extrabold text-amber-400 font-heading">{audit?.total_violations} / 5</p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-heading border-b pb-2">
          Detected Proctoring Events
        </h2>

        {audit?.violations?.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No proctoring violations recorded for this attempt.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {audit?.violations?.map((v) => (
              <div key={v.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 capitalize">
                      {v.violation_type?.replace("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      Strike #{v.strike_number} · Detected at {new Date(v.detected_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  {JSON.stringify(v.meta || {})}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
