// CollegeDetailPage — Single college deep-dive (§5.4).
// Two-column detail grid + enabled features panel.
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import StatusPill from "../../components/superadmin/StatusPill";

export default function CollegeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const colleges = useSuperAdminStore((s) => s.colleges);
  const features = useSuperAdminStore((s) => s.features);
  const collegeFeatures = useSuperAdminStore((s) => s.collegeFeatures);
  const featureRequests = useSuperAdminStore((s) => s.featureRequests);
  const toggleCollegeStatus = useSuperAdminStore((s) => s.toggleCollegeStatus);
  const deleteCollege = useSuperAdminStore((s) => s.deleteCollege);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const college = colleges.find((c) => c.id === id);

  if (!college) {
    return (
      <>
        <div className="cd-topbar">
          <h1 className="cd-topbar__title">College not found</h1>
        </div>
        <button className="cd-btn cd-btn--secondary" onClick={() => navigate("/superadmin/colleges")}>
          ← Back to Colleges
        </button>
      </>
    );
  }

  const isSuspended = college.status === "suspended";
  const enabledIds = collegeFeatures[id] || [];

  const computedFeatures = features.map((f) => {
    if (enabledIds.includes(f.id)) return { ...f, state: "approved" };
    const req = featureRequests.find((r) => r.collegeId === id && r.featureId === f.id && r.status === "pending");
    if (req) return { ...f, state: "pending" };
    return { ...f, state: "none" };
  });

  const enabledFeatures = computedFeatures.filter((f) => f.state === "approved");
  const pendingFeatures = computedFeatures.filter((f) => f.state === "pending");

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">
          <button className="cd-btn cd-btn--ghost" onClick={() => navigate("/superadmin/colleges")} title="Back">
            <ArrowLeft size={20} />
          </button>
          {college.name}
          <StatusPill status={college.status} />
        </h1>
        <div className="cd-topbar__actions">
          {confirmDelete ? (
            <div className="cd-confirm-inline">
              <span>Delete {college.name}?</span>
              <button
                className="cd-btn cd-btn--compact cd-btn--danger"
                onClick={() => {
                  deleteCollege(college.id);
                  navigate("/superadmin/colleges");
                }}
              >
                Yes, Delete
              </button>
              <button
                className="cd-btn cd-btn--compact cd-btn--secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                className={`cd-btn ${isSuspended ? "cd-btn--success" : "cd-btn--danger"}`}
                onClick={() => toggleCollegeStatus(college.id)}
              >
                {isSuspended ? "Reactivate" : "Suspend College"}
              </button>
              <button
                className="cd-btn cd-btn--danger"
                onClick={() => setConfirmDelete(true)}
                title="Delete College"
              >
                <Trash2 size={16} />
                Delete College
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column detail */}
      <div className="cd-detail-grid">
        {/* College Info */}
        <div className="cd-panel">
          <div className="cd-panel__header">College Info</div>
          <div style={{ padding: "var(--cd-card-padding)" }}>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">Domain</span>
              <span className="cd-detail-row__value">{college.domain}</span>
            </div>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">Joined</span>
              <span className="cd-detail-row__value">{format(new Date(college.joinedAt), "MMMM d, yyyy")}</span>
            </div>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">Admin</span>
              <span className="cd-detail-row__value">{college.admin.name}</span>
            </div>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">Admin Email</span>
              <span className="cd-detail-row__value">{college.admin.email}</span>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="cd-panel">
          <div className="cd-panel__header">Usage</div>
          <div style={{ padding: "var(--cd-card-padding)" }}>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">Students</span>
              <span className="cd-detail-row__value cd-detail-row__value--mono">{(college.students || 0).toLocaleString()}</span>
            </div>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">TPOs</span>
              <span className="cd-detail-row__value cd-detail-row__value--mono">{college.tpos || 0}</span>
            </div>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">Drives</span>
              <span className="cd-detail-row__value cd-detail-row__value--mono">{college.drives || 0}</span>
            </div>
            <div className="cd-detail-row">
              <span className="cd-detail-row__label">Applications</span>
              <span className="cd-detail-row__value cd-detail-row__value--mono">{(college.applications || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enabled Features */}
      <div className="cd-mt-lg">
        <div className="cd-panel">
          <div className="cd-panel__header">Enabled Features</div>
          <div style={{ padding: "var(--cd-card-padding)", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {enabledFeatures.length === 0 && pendingFeatures.length === 0 && (
              <span style={{ color: "var(--cd-text-muted)", fontSize: 14 }}>No features enabled yet.</span>
            )}
            {enabledFeatures.map((f) => (
              <StatusPill key={f.id} status="approved" label={`${f.name} (${f.targetRole || "Student"})`} />
            ))}
            {pendingFeatures.map((f) => (
              <StatusPill key={f.id} status="pending" label={`${f.name} [Pending] (${f.targetRole || "Student"})`} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
