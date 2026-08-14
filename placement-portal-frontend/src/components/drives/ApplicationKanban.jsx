import { useMemo, useState } from "react";
import { ArrowRight, IndianRupee, UserX } from "lucide-react";

export const KANBAN_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "eligible", label: "Eligible" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "test_cleared", label: "Proctored Test Cleared" },
  { key: "technical_round", label: "Technical Round" },
  { key: "hr_round", label: "HR Round" },
  { key: "offered", label: "Offered (Selected)" },
];

const STATUS_BY_STAGE = {
  applied: "applied",
  eligible: "eligible",
  shortlisted: "shortlisted",
  test_cleared: "shortlisted",
  technical_round: "shortlisted",
  hr_round: "shortlisted",
  offered: "selected",
};

export function getStageStatus(stageKey) {
  return STATUS_BY_STAGE[stageKey] || "applied";
}

export function getNextStage(stageKey) {
  const index = KANBAN_STAGES.findIndex((stage) => stage.key === stageKey);
  if (index < 0 || index >= KANBAN_STAGES.length - 1) return null;
  return KANBAN_STAGES[index + 1].key;
}

function CandidateCard({ app, stageKey, onPromote, onReject, onSetOffered, dragging, onDragStart, onDragEnd }) {
  const isTerminal = app.status === "selected" || app.status === "rejected" || app.status === "withdrawn";
  const nextStage = getNextStage(stageKey);

  return (
    <div
      draggable={!isTerminal}
      onDragStart={() => onDragStart(app.id)}
      onDragEnd={onDragEnd}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-opacity ${dragging ? "opacity-50" : ""}`}
    >
      <p className="text-sm font-semibold text-slate-900">{app.student_name || app.student_email || "Student"}</p>
      <p className="mt-0.5 text-xs text-slate-500">{app.student_email || "-"}</p>
      <p className="mt-2 text-xs text-slate-600">
        {app.student_branch || "N/A"} · CGPA {app.cgpa ?? "N/A"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {nextStage && !isTerminal && (
          <button
            type="button"
            onClick={() => onPromote(app, nextStage)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Promote
            <ArrowRight size={12} />
          </button>
        )}

        {!isTerminal && stageKey !== "offered" && (
          <button
            type="button"
            onClick={() => onSetOffered(app)}
            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            <IndianRupee size={12} />
            Set Offered Package
          </button>
        )}

        {!isTerminal && (
          <button
            type="button"
            onClick={() => onReject(app)}
            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            <UserX size={12} />
            Reject
          </button>
        )}
      </div>
    </div>
  );
}

export default function ApplicationKanban({ applications, getStageKey, onMove, onPromote, onReject, onSetOffered }) {
  const [draggedId, setDraggedId] = useState(null);

  const grouped = useMemo(() => {
    const groupedApps = Object.fromEntries(KANBAN_STAGES.map((stage) => [stage.key, []]));
    for (const app of applications || []) {
      const key = getStageKey(app);
      const finalKey = groupedApps[key] ? key : "applied";
      groupedApps[finalKey].push(app);
    }
    return groupedApps;
  }, [applications, getStageKey]);

  const handleDrop = (targetStage) => {
    if (!draggedId) return;
    const app = (applications || []).find((item) => item.id === draggedId);
    setDraggedId(null);
    if (!app) return;
    onMove(app, targetStage);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 2xl:grid-cols-7">
      {KANBAN_STAGES.map((stage) => (
        <div
          key={stage.key}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(stage.key)}
          className="min-h-[320px] rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">{stage.label}</h3>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              {grouped[stage.key].length}
            </span>
          </div>

          <div className="space-y-3">
            {grouped[stage.key].map((app) => (
              <CandidateCard
                key={app.id}
                app={app}
                stageKey={stage.key}
                onPromote={onPromote}
                onReject={onReject}
                onSetOffered={onSetOffered}
                dragging={draggedId === app.id}
                onDragStart={setDraggedId}
                onDragEnd={() => setDraggedId(null)}
              />
            ))}

            {grouped[stage.key].length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-4 text-center text-xs text-slate-500">
                Drop candidates here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
