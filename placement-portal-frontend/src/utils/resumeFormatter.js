/**
 * Formats a resume object into a human-friendly, contextual label
 * without exposing internal database primary keys (e.g. "Resume #12").
 *
 * Examples of output:
 * - "AI Enhanced (Google) — Active Primary • Oct 5, 2026"
 * - "Pratham_Resume.pdf — Active Primary • Oct 4, 2026"
 * - "Mechanical_Core_Draft.pdf — Uploaded • Sep 28, 2026"
 */
export function formatResumeLabel(resume) {
  if (!resume) return "Resume Document";

  let meta = null;
  if (resume.ai_feedback) {
    try {
      meta =
        typeof resume.ai_feedback === "string"
          ? JSON.parse(resume.ai_feedback)
          : resume.ai_feedback;
    } catch (e) {
      // not JSON
    }
  }

  // 1. Determine Title / Context
  let title = "";
  if (resume.source === "enhanced") {
    if (meta?.target_company) {
      title = `AI Enhanced (${meta.target_company})`;
    } else {
      title = "AI Enhanced Resume";
    }
  } else {
    const rawPath = resume.file_path || "";
    const rawName = rawPath.split(/[/\\]/).pop() || "";
    // Strip generated timestamp/uuid prefix if present: e.g. 1728139482_sample.pdf -> sample.pdf
    const cleanName = rawName.replace(/^[0-9a-fA-F_-]{8,}_/, "") || rawName;
    title = cleanName || "Uploaded Resume PDF";
  }

  // 2. Format Creation / Upload Date
  let dateStr = "";
  if (resume.created_at) {
    const d = new Date(resume.created_at);
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  // 3. Assemble tags (Active status, Source, Date)
  const tags = [];
  if (resume.is_active) {
    tags.push("Active Primary");
  } else if (resume.source === "enhanced") {
    tags.push("Enhanced Version");
  }

  if (dateStr) {
    tags.push(dateStr);
  }

  if (tags.length === 0) {
    return title;
  }

  return `${title} — ${tags.join(" • ")}`;
}
