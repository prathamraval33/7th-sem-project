import React from "react";
import { 
  ArrowRight, 
  AlertCircle, 
  XCircle, 
  CheckCircle2, 
  FileText,
  Award
} from "lucide-react";

export default function StudentRow({ student, onShortlist, onNotEligible, onReject, onSelect }) {
  const { 
    id, 
    student_name, 
    name = student_name, 
    student_email, 
    email = student_email, 
    cgpa, 
    active_backlogs, 
    backlogs = active_backlogs ?? 0, 
    student_branch, 
    branch = student_branch, 
    resume_url, 
    resumeUrl = resume_url, 
    is_eligible, 
    eligible = is_eligible,
    status,
    package_offered,
    packageOffered = package_offered
  } = student;

  const initial = (name || email || "S")[0].toUpperCase();

  return (
    <div className="grid grid-cols-[2fr_0.8fr_1fr_1fr_1.8fr] gap-3 items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors text-left">
      {/* Column 1 — Student identity block */}
      <div className="flex items-center gap-[10px] min-w-0">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[13px] shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900 truncate">
            {name || "Student"}
          </div>
          <div className="text-xs text-gray-400 truncate" title={email}>
            {email || "N/A"}
          </div>
          <div className="text-[11px] text-gray-500 mt-[2px] truncate font-medium">
            CGPA {cgpa ?? "N/A"} · {backlogs ?? 0} backlogs
          </div>
        </div>
      </div>

      {/* Column 2 — Branch */}
      <div className="text-sm font-bold text-gray-900 truncate">
        {branch || "N/A"}
      </div>

      {/* Column 3 — Resume */}
      <div className="text-xs text-gray-400">
        {resumeUrl ? (
          <a
            href={resumeUrl.startsWith("http") ? resumeUrl : `http://localhost:8000${resumeUrl}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold whitespace-nowrap"
          >
            <FileText size={14} /> View Resume
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-gray-400 whitespace-nowrap">
            <FileText size={13} className="text-gray-400 opacity-60" /> No resume
          </span>
        )}
      </div>

      {/* Column 4 — Eligibility status */}
      <div>
        {eligible ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 whitespace-nowrap">
            <CheckCircle2 size={13} /> Eligible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
            Not eligible
          </span>
        )}
      </div>

      {/* Column 5 — Actions (stacked layout: primary on top, secondary side-by-side below) */}
      <div className="flex flex-col items-end justify-center gap-1.5 whitespace-nowrap">
        {/* Top Row: Primary Stage Action */}
        {(status === "applied" || status === "eligible" || !status) && (
          <button
            type="button"
            onClick={() => onShortlist && onShortlist(id)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-0 inline-flex items-center gap-1.5 shadow-sm transition-colors"
            title="Shortlist for Round 1"
          >
            <span>Shortlist for Round 1</span>
            <ArrowRight size={13} />
          </button>
        )}

        {status === "shortlisted" && (
          <button
            type="button"
            onClick={() => onSelect && onSelect(student)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-0 inline-flex items-center gap-1.5 shadow-sm transition-colors"
            title="Select candidate & enter offered CTC"
          >
            <Award size={14} />
            <span>Select (Mark Hired)</span>
          </button>
        )}

        {status === "selected" && (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 size={14} /> Hired {packageOffered ? `(₹${packageOffered} LPA)` : ""}
          </span>
        )}

        {/* Bottom Row: Secondary Filter Actions (Reject + Not Eligible) */}
        {status !== "selected" && (
          <div className="flex items-center gap-1.5">
            {status !== "rejected" && (
              <button
                type="button"
                onClick={() => onReject && onReject(id)}
                className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 text-[11px] font-medium inline-flex items-center gap-1 transition-all"
                title="Reject candidate"
              >
                <XCircle size={12} />
                <span>Reject</span>
              </button>
            )}

            {status !== "not_eligible" && (
              <button
                type="button"
                onClick={() => onNotEligible && onNotEligible(id)}
                className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200 text-[11px] font-medium inline-flex items-center gap-1 transition-all"
                title="Mark as Not eligible"
              >
                <AlertCircle size={12} />
                <span>Not Eligible</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
