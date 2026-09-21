import React from "react";
import { 
  ArrowRight, 
  AlertCircle, 
  XCircle, 
  CheckCircle2, 
  FileText,
  Award
} from "lucide-react";
import { getAccessToken } from "../../utils/tokenStorage";

export default function StudentRow({ 
  student, 
  onShortlist, 
  onNotEligible, 
  onReject, 
  onSelect,
  onViewResume 
}) {
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

  const token = getAccessToken() || "";
  const resolvedResumeUrl = (() => {
    if (!resumeUrl) return null;
    let url = resumeUrl;
    if (!url.startsWith("http")) {
      const clean = url.replace("uploads/", "").replace("uploads\\", "").replace("\\", "/");
      const path = clean.startsWith("/") ? clean : `/${clean}`;
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      url = `${base}${path.startsWith("/uploads/") ? path : `/uploads${path}`}`;
    }
    if (token && !url.includes("token=")) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}token=${encodeURIComponent(token)}`;
    }
    return url;
  })();

  const handleResumeClick = (e) => {
    if (onViewResume && resolvedResumeUrl) {
      e.preventDefault();
      onViewResume(student, resolvedResumeUrl);
    }
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/75 transition-colors">
      {/* Column 1 — Student identity block */}
      <td className="px-5 py-3.5 align-middle">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {name || "Student"}
            </div>
            <div className="text-xs text-gray-500 truncate" title={email}>
              {email || "N/A"}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5 truncate font-medium">
              CGPA {cgpa ?? "N/A"} · {backlogs ?? 0} backlogs
            </div>
          </div>
        </div>
      </td>

      {/* Column 2 — Branch */}
      <td className="px-4 py-3.5 align-middle">
        <span className="text-sm font-medium text-gray-700">
          {branch || "N/A"}
        </span>
      </td>

      {/* Column 3 — Resume */}
      <td className="px-4 py-3.5 align-middle">
        {resolvedResumeUrl ? (
          <a
            href={resolvedResumeUrl}
            target="_blank"
            rel="noreferrer"
            onClick={handleResumeClick}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors whitespace-nowrap cursor-pointer"
            title="Click to preview resume (or right-click to open in new tab)"
          >
            <FileText size={15} />
            <span>View Resume</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap">
            <FileText size={14} className="text-gray-300" />
            <span>No resume</span>
          </span>
        )}
      </td>

      {/* Column 4 — Eligibility status */}
      <td className="px-4 py-3.5 align-middle">
        {eligible ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
            <CheckCircle2 size={13} /> Eligible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
            Not eligible
          </span>
        )}
      </td>

      {/* Column 5 — Actions */}
      <td className="px-5 py-3.5 align-middle text-right">
        <div className="flex flex-col items-end justify-center gap-1.5 whitespace-nowrap">
          {/* Top Row: Primary Stage Action */}
          {(status === "applied" || status === "eligible" || !status) && (
            <button
              type="button"
              onClick={() => onShortlist && onShortlist(id)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-0 inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border-0 inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Select candidate & enter offered CTC"
            >
              <Award size={14} />
              <span>Select (Mark Hired)</span>
            </button>
          )}

          {status === "selected" && (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-xs">
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
                  className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer"
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
                  className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200 text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer"
                  title="Mark as Not eligible"
                >
                  <AlertCircle size={12} />
                  <span>Not Eligible</span>
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
