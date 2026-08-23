// StatusPill — Semantic status badge (§4.2).
// Variants: active, approved, pending, suspended, rejected, neutral.

const VARIANT_MAP = {
  active: "cd-pill--active",
  approved: "cd-pill--approved",
  pending: "cd-pill--pending",
  suspended: "cd-pill--suspended",
  rejected: "cd-pill--rejected",
  neutral: "cd-pill--neutral",
  info: "cd-pill--info",
  role: "cd-pill--role",
};

const LABELS = {
  active: "Active",
  approved: "Approved",
  pending: "Pending",
  suspended: "Suspended",
  rejected: "Rejected",
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
