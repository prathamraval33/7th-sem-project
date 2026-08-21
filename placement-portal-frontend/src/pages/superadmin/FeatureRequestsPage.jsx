// FeatureRequestsPage — Pending queue + Decision History (§5.6).
// Inline Approve/Reject per pending row, with reject confirmation.
import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import DataTable from "../../components/superadmin/DataTable";
import StatusPill from "../../components/superadmin/StatusPill";
import EmptyState from "../../components/superadmin/EmptyState";

export default function FeatureRequestsPage() {
  const featureRequests = useSuperAdminStore((s) => s.featureRequests);
  const approveFeatureRequest = useSuperAdminStore((s) => s.approveFeatureRequest);
  const rejectFeatureRequest = useSuperAdminStore((s) => s.rejectFeatureRequest);
  const [confirmRejectId, setConfirmRejectId] = useState(null);

  const pending = featureRequests.filter((r) => r.status === "pending");
  const history = featureRequests.filter((r) => r.status !== "pending");

  const pendingColumns = [
    { key: "collegeName", header: "College", className: "cd-table__cell--bold" },
    { key: "featureName", header: "Feature Requested" },
    {
      key: "requestedAt",
      header: "Requested On",
      className: "cd-table__cell--meta",
      render: (row) => format(new Date(row.requestedAt), "MMM d, yyyy"),
    },
    {
      key: "actions",
      header: "",
      className: "cd-table__cell--actions",
      render: (row) => {
        if (confirmRejectId === row.id) {
          return (
            <div className="cd-confirm-inline">
              <span>Reject?</span>
              <button
                className="cd-btn cd-btn--compact cd-btn--danger"
                onClick={(e) => { e.stopPropagation(); rejectFeatureRequest(row.id); setConfirmRejectId(null); }}
              >
                Yes
              </button>
              <button
                className="cd-btn cd-btn--compact cd-btn--secondary"
                onClick={(e) => { e.stopPropagation(); setConfirmRejectId(null); }}
              >
                No
              </button>
            </div>
          );
        }
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="cd-btn cd-btn--compact cd-btn--success"
              onClick={(e) => { e.stopPropagation(); approveFeatureRequest(row.id); }}
            >
              Approve
            </button>
            <button
              className="cd-btn cd-btn--compact cd-btn--danger"
              onClick={(e) => { e.stopPropagation(); setConfirmRejectId(row.id); }}
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  const historyColumns = [
    { key: "collegeName", header: "College", className: "cd-table__cell--bold" },
    { key: "featureName", header: "Feature" },
    {
      key: "status",
      header: "Decision",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "decidedAt",
      header: "Decided On",
      className: "cd-table__cell--meta",
      render: (row) => row.decidedAt ? format(new Date(row.decidedAt), "MMM d, yyyy") : "—",
    },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">Feature Requests</h1>
      </div>

      {/* Pending Section */}
      <h2 className="cd-section-heading">Pending</h2>
      {pending.length === 0 ? (
        <div className="cd-panel" style={{ marginBottom: "var(--cd-gap-lg)" }}>
          <EmptyState
            icon={CheckCircle}
            title="No pending requests right now"
            text="All feature requests have been reviewed. Check back later."
            positive
          />
        </div>
      ) : (
        <DataTable columns={pendingColumns} data={pending} />
      )}

      {/* History Section */}
      <div className="cd-mt-lg">
        <h2 className="cd-section-heading">Decision History</h2>
        <DataTable columns={historyColumns} data={history} />
      </div>
    </>
  );
}
