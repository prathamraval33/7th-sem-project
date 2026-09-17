// StatusPill — Semantic status badge (§4.2).
// Variants: active, approved, pending, suspended, rejected, neutral.

const VARIANT_MAP = {
  active: "cd-pill--active",
  approved: "cd-pill--approved",
  enabled: "cd-pill--approved",
  draft: "cd-pill--draft",
  pending: "cd-pill--pending",
  pending_setup: "cd-pill--pending",
  ready_for_review: "cd-pill--info",
  pending_review: "cd-pill--pending",
  approved_awaiting_payment: "cd-pill--info",
  payment_failed: "cd-pill--rejected",
  expired: "cd-pill--pending",
  approval_expired: "cd-pill--rejected",
  suspended: "cd-pill--suspended",
  rejected: "cd-pill--rejected",
  revoked: "cd-pill--rejected",
  declined: "cd-pill--rejected",
  under_review: "cd-pill--info",
  planned: "cd-pill--info",
  in_progress: "cd-pill--info",
  completed: "cd-pill--approved",
  not_requested: "cd-pill--neutral",
  neutral: "cd-pill--neutral",
  info: "cd-pill--info",
  role: "cd-pill--role",
};

const LABELS = {
  active: "Active",
  approved: "Approved",
  enabled: "Enabled",
  draft: "Draft",
  pending: "Pending",
  pending_setup: "Pending Setup",
  ready_for_review: "Ready for Review",
  pending_review: "Pending Review",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  declined: "Declined",
  approved_awaiting_payment: "Awaiting Payment",
  payment_failed: "Payment Failed",
  expired: "Expired",
  approval_expired: "Approval Expired",
  suspended: "Suspended",
  rejected: "Rejected",
  revoked: "Revoked",
  not_requested: "Not Requested",
  info: "Info",
};

export default function StatusPill({ status, label }) {
  const cls = VARIANT_MAP[status] || VARIANT_MAP.neutral;
  const displayLabel = label || LABELS[status] || status;

  return (
    <span className={`cd-pill ${cls}`}>
      <span className="cd-pill__dot" />
      {displayLabel}
    </span>
  );
}
