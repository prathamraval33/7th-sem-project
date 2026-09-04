// FeatureManagementPage — merged Feature Catalog + Feature Requests control
// center. Tabs: "Catalog" (card grid -> per-feature drill-down with direct
// grant/revoke) and "Requests" (existing pending queue + decision history,
// unchanged).
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Puzzle, Pencil, Trash2, CheckCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import StatusPill from "../../components/superadmin/StatusPill";
import EmptyState from "../../components/superadmin/EmptyState";
import DataTable from "../../components/superadmin/DataTable";

const ROLE_OPTIONS = [
  { id: "Student", label: "Student", desc: "For students & job applicants" },
  { id: "TPO", label: "TPO", desc: "For Training & Placement Officers" },
  { id: "Admin", label: "College Admin", desc: "For institutional administrators" },
];

// ---------------------------------------------------------------------------
// Add / Edit Feature modal
// ---------------------------------------------------------------------------
function FeatureFormModal({ feature, onClose }) {
  const isEdit = Boolean(feature);
  const [name, setName] = useState(feature?.name || "");
  const [description, setDescription] = useState(feature?.description || "");
  const [category, setCategory] = useState(feature?.category || "");
  const [featureStatus, setFeatureStatus] = useState(feature?.status || "active");
  const [price, setPrice] = useState(feature?.price != null ? String(feature.price) : "");
  const [billingType, setBillingType] = useState(feature?.billingType || "one_time");
  const initialRoles = feature?.targetRole
    ? feature.targetRole === "All Roles"
      ? ["Student", "TPO", "Admin"]
      : feature.targetRole.split(" & ").filter((r) => ROLE_OPTIONS.some((o) => o.id === r))
    : ["Student"];
  const [selectedRoles, setSelectedRoles] = useState(initialRoles.length ? initialRoles : ["Student"]);
  const addFeature = useSuperAdminStore((s) => s.addFeature);
  const updateFeature = useSuperAdminStore((s) => s.updateFeature);

  const toggleRole = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      if (selectedRoles.length === 1) return;
      setSelectedRoles(selectedRoles.filter((r) => r !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const getTargetRoleString = () => {
    if (selectedRoles.length === 3) return "All Roles";
    if (selectedRoles.length === 2) return selectedRoles.join(" & ");
    return selectedRoles[0] || "Student";
  };

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || "General",
      targetRole: getTargetRoleString(),
      price: price ? Number(price) : null,
      billingType,
      status: featureStatus,
    };
    if (isEdit) {
      updateFeature(feature.id, payload);
    } else {
      addFeature(payload);
    }
    onClose();
  };

  return (
    <div className="cd-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cd-modal" role="dialog" aria-label={isEdit ? "Edit Feature" : "Add Feature"}>
        <div className="cd-modal__title">{isEdit ? "Edit Feature" : "Add New Feature"}</div>
        <div className="cd-input-group">
          <label className="cd-label" htmlFor="featName">Feature Name</label>
          <input id="featName" className="cd-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Career Insights" autoFocus />
        </div>
        <div className="cd-input-group">
          <label className="cd-label" htmlFor="featDesc">Description</label>
          <textarea id="featDesc" className="cd-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of what this feature provides…" />
        </div>
        <div className="cd-input-group">
          <label className="cd-label" htmlFor="featCat">Category</label>
          <input id="featCat" className="cd-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. AI, Learning, Assessment" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="cd-input-group">
            <label className="cd-label" htmlFor="featPrice">Price (₹ INR)</label>
            <input
              id="featPrice"
              type="number"
              min="0"
              step="0.01"
              className="cd-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00 (Free if empty)"
            />
            <div className="cd-helper-text" style={{ fontSize: 11 }}>Leave blank or 0 for free</div>
          </div>
          <div className="cd-input-group">
            <label className="cd-label" htmlFor="featBilling">Billing Interval</label>
            <select
              id="featBilling"
              className="cd-input"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value)}
            >
              <option value="one_time">One-time purchase</option>
              <option value="monthly">Monthly subscription</option>
              <option value="annual">Annual subscription</option>
            </select>
          </div>
        </div>
        <div className="cd-input-group">
          <label className="cd-label">Belongs To / Applicable Roles</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            {ROLE_OPTIONS.map((opt) => {
              const isChecked = selectedRoles.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: isChecked ? "1px solid var(--cd-primary)" : "1px solid var(--cd-border)",
                    background: isChecked ? "var(--cd-primary-bg)" : "var(--cd-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleRole(opt.id)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--cd-primary)" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--cd-text-primary)" }}>{opt.label}</div>
                    <div style={{ fontSize: "11px", color: "var(--cd-text-muted)" }}>{opt.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        <div className="cd-input-group">
          <label className="cd-label">Feature Status</label>
          <div className="cd-radio-group" style={{ flexDirection: "row", gap: "16px" }}>
            <label className="cd-radio-option">
              <input type="radio" name="featureStatus" checked={featureStatus === "active"} onChange={() => setFeatureStatus("active")} />
              Active
            </label>
            <label className="cd-radio-option">
              <input type="radio" name="featureStatus" checked={featureStatus === "deprecated"} onChange={() => setFeatureStatus("deprecated")} />
              Deprecated
            </label>
          </div>
          <div className="cd-helper-text">
            Deprecated features stay visible to colleges that already have them enabled, but stop appearing as requestable to colleges that don't.
          </div>
        </div>
        <div className="cd-modal__footer">
          <button className="cd-btn cd-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="cd-btn cd-btn--primary" onClick={handleSubmit} disabled={!name.trim() || !description.trim()}>
            {isEdit ? "Save Changes" : "Add Feature"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog tab — card grid
// ---------------------------------------------------------------------------
function CatalogGrid({ onSelectFeature, onEditFeature, onAddFeature }) {
  const features = useSuperAdminStore((s) => s.features);
  const colleges = useSuperAdminStore((s) => s.colleges);
  const collegeFeatures = useSuperAdminStore((s) => s.collegeFeatures);
  const deleteFeature = useSuperAdminStore((s) => s.deleteFeature);

  const totalColleges = colleges.length;

  const adoptionFor = (featureId) => {
    let count = 0;
    for (const college of colleges) {
      if ((collegeFeatures[college.id] || []).includes(featureId)) count += 1;
    }
    return count;
  };

  if (features.length === 0) {
    return (
      <EmptyState
        icon={Puzzle}
        title="No features defined yet"
        text="Add a feature to make it available for colleges to request."
        actionLabel="+ Add Feature"
        onAction={onAddFeature}
      />
    );
  }

  return (
    <div className="cd-feature-grid">
      {features.map((f) => {
        const enabledCount = adoptionFor(f.id);
        const pct = totalColleges > 0 ? Math.round((enabledCount / totalColleges) * 100) : 0;
        return (
          <div
            key={f.id}
            className="cd-feature-card cd-feature-card--clickable"
            onClick={() => onSelectFeature(f.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectFeature(f.id); } }}
          >
            <div className="cd-feature-card__actions">
              <button
                className="cd-feature-card__action-btn"
                title="Edit"
                aria-label={`Edit ${f.name}`}
                onClick={(e) => { e.stopPropagation(); onEditFeature(f); }}
              >
                <Pencil size={16} />
              </button>
              <button
                className="cd-feature-card__action-btn"
                title="Delete"
                aria-label={`Delete ${f.name}`}
                onClick={(e) => { e.stopPropagation(); deleteFeature(f.id); }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="cd-feature-card__name">{f.name}</div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              {f.category && <StatusPill status="neutral" label={f.category} />}
              <StatusPill status="info" label={f.targetRole ? `For: ${f.targetRole}` : "For: Student"} />
              <StatusPill
                status="role"
                label={f.price ? `₹${f.price} (${f.billingType?.replace("_", " ")})` : "Free"}
              />
              {f.status === "deprecated" && <StatusPill status="rejected" label="Deprecated" />}
            </div>
            <div className="cd-feature-card__desc">{f.description}</div>
            <div className="cd-feature-card__stat">
              Enabled at {enabledCount} of {totalColleges} colleges
            </div>
            <div className="cd-progress-track">
              <div className="cd-progress-track__fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog tab — per-feature drill-down
// ---------------------------------------------------------------------------
function FeatureDetailView({ featureId, onBack, onEditFeature, onGoToRequests }) {
  const features = useSuperAdminStore((s) => s.features);
  const colleges = useSuperAdminStore((s) => s.colleges);
  const featureCollegeStatus = useSuperAdminStore((s) => s.featureCollegeStatus);
  const fetchFeatureCollegeStatus = useSuperAdminStore((s) => s.fetchFeatureCollegeStatus);
  const grantFeatureToCollege = useSuperAdminStore((s) => s.grantFeatureToCollege);
  const revokeFeatureFromCollege = useSuperAdminStore((s) => s.revokeFeatureFromCollege);
  const deleteFeature = useSuperAdminStore((s) => s.deleteFeature);
  const [search, setSearch] = useState("");
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);

  const feature = features.find((f) => f.id === featureId);
  const rows = featureCollegeStatus[featureId] || [];

  useEffect(() => {
    fetchFeatureCollegeStatus(featureId);
  }, [featureId, fetchFeatureCollegeStatus]);

  if (!feature) {
    return (
      <>
        <div className="cd-breadcrumb">
          <button className="cd-breadcrumb__link" onClick={onBack}>Feature Management</button>
        </div>
        <EmptyState icon={Puzzle} title="Feature not found" text="It may have been deleted." actionLabel="Back to Catalog" onAction={onBack} />
      </>
    );
  }

  const filteredRows = search.trim()
    ? rows.filter((r) => r.collegeName.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;

  const columns = [
    { key: "collegeName", header: "College Name", className: "cd-table__cell--bold" },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "date",
      header: "Enabled / Requested Date",
      className: "cd-table__cell--meta",
      render: (row) => (row.date ? format(new Date(row.date), "MMM d, yyyy") : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "cd-table__cell--actions",
      render: (row) => {
        if (row.status === "pending" || row.status === "pending_review") {
          return (
            <button className="cd-text-link" onClick={() => onGoToRequests(row.requestId)}>
              Review in Requests tab
            </button>
          );
        }
        if (row.status === "enabled" || row.status === "active") {
          if (confirmRevokeId === row.collegeId) {
            return (
              <div className="cd-confirm-inline" style={{ justifyContent: "flex-end" }}>
                <span>Revoke?</span>
                <button
                  className="cd-btn cd-btn--compact cd-btn--danger"
                  onClick={() => { revokeFeatureFromCollege(featureId, row.collegeId); setConfirmRevokeId(null); }}
                >
                  Yes
                </button>
                <button className="cd-btn cd-btn--compact cd-btn--secondary" onClick={() => setConfirmRevokeId(null)}>
                  No
                </button>
              </div>
            );
          }
          return (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="cd-btn cd-btn--compact cd-btn--danger" onClick={() => setConfirmRevokeId(row.collegeId)}>
                Revoke
              </button>
            </div>
          );
        }
        if (row.status === "approved_awaiting_payment") {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "12px", color: "var(--cd-text-secondary)" }}>Awaiting Payment</span>
              <button
                className="cd-btn cd-btn--compact cd-btn--secondary"
                onClick={() => grantFeatureToCollege(featureId, row.collegeId)}
                title="Override and activate directly"
              >
                Direct Grant
              </button>
            </div>
          );
        }
        // not_requested, rejected, revoked — can be granted directly, unless the college is suspended.
        const college = colleges.find((c) => c.id === row.collegeId);
        const isSuspended = college?.status === "suspended";
        return (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="cd-btn cd-btn--compact cd-btn--success"
              disabled={isSuspended}
              title={isSuspended ? "Reactivate this college before granting features" : undefined}
              onClick={() => grantFeatureToCollege(featureId, row.collegeId)}
            >
              {isSuspended ? "Suspended" : "Grant Access"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="cd-breadcrumb">
        <button className="cd-breadcrumb__link" onClick={onBack}>Feature Management</button>
        <span>/</span>
        <span className="cd-breadcrumb__current">{feature.name}</span>
      </div>

      <div className="cd-topbar">
        <h1 className="cd-topbar__title">
          <button className="cd-btn cd-btn--ghost" onClick={onBack} title="Back">
            <ArrowLeft size={20} />
          </button>
          {feature.name}
          {feature.category && <StatusPill status="neutral" label={feature.category} />}
          {feature.status === "deprecated" && <StatusPill status="rejected" label="Deprecated" />}
        </h1>
        <div className="cd-topbar__actions">
          <button className="cd-btn cd-btn--secondary" onClick={() => onEditFeature(feature)}>Edit</button>
          <button className="cd-btn cd-btn--danger" onClick={() => { deleteFeature(feature.id); onBack(); }}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
      <p style={{ marginTop: -12, marginBottom: "var(--cd-gap-lg)", color: "var(--cd-text-secondary)", fontSize: 14 }}>
        {feature.description}
      </p>

      <div className="cd-search-bar">
        <input
          className="cd-input"
          type="text"
          placeholder="Search colleges…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable columns={columns} data={filteredRows} rowKeyField="collegeId" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Requests tab — unchanged from the previous FeatureRequestsPage
// ---------------------------------------------------------------------------
function RequestsTab({ highlightRequestId }) {
  const featureRequests = useSuperAdminStore((s) => s.featureRequests);
  const colleges = useSuperAdminStore((s) => s.colleges);
  const approveFeatureRequest = useSuperAdminStore((s) => s.approveFeatureRequest);
  const rejectFeatureRequest = useSuperAdminStore((s) => s.rejectFeatureRequest);
  const [confirmRejectId, setConfirmRejectId] = useState(null);

  const pending = featureRequests.filter((r) => r.status === "pending" || r.status === "pending_review");
  const history = featureRequests.filter((r) => r.status !== "pending" && r.status !== "pending_review");

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
        const isSuspended = colleges.find((c) => c.id === row.collegeId)?.status === "suspended";
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="cd-btn cd-btn--compact cd-btn--success"
              disabled={isSuspended}
              title={isSuspended ? "Reactivate this college before approving" : undefined}
              onClick={(e) => { e.stopPropagation(); approveFeatureRequest(row.id); }}
            >
              {isSuspended ? "Suspended" : "Approve"}
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
      render: (row) => (row.decidedAt ? format(new Date(row.decidedAt), "MMM d, yyyy") : "—"),
    },
  ];

  return (
    <>
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
        <DataTable
          columns={pendingColumns}
          data={pending.map((r) => (r.id === highlightRequestId ? { ...r, _highlighted: true } : r))}
        />
      )}

      <div className="cd-mt-lg">
        <h2 className="cd-section-heading">Decision History</h2>
        <DataTable columns={historyColumns} data={history} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page shell — tabs + top bar
// ---------------------------------------------------------------------------
export default function FeatureManagementPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab === "requests" ? "requests" : "catalog");
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [highlightRequestId, setHighlightRequestId] = useState(null);

  const handleGoToRequests = (requestId) => {
    setSelectedFeatureId(null);
    setHighlightRequestId(requestId || null);
    setActiveTab("requests");
  };

  return (
    <>
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">Feature Management</h1>
        <div className="cd-topbar__actions">
          <button className="cd-btn cd-btn--primary" onClick={() => setShowAddModal(true)}>
            + Add Feature
          </button>
        </div>
      </div>

      <div className="cd-tabs">
        <button
          className={`cd-tabs__item ${activeTab === "catalog" ? "cd-tabs__item--active" : ""}`}
          onClick={() => { setActiveTab("catalog"); setSelectedFeatureId(null); }}
        >
          Catalog
        </button>
        <button
          className={`cd-tabs__item ${activeTab === "requests" ? "cd-tabs__item--active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          Requests
        </button>
      </div>

      {activeTab === "catalog" && (
        selectedFeatureId ? (
          <FeatureDetailView
            featureId={selectedFeatureId}
            onBack={() => setSelectedFeatureId(null)}
            onEditFeature={(feature) => setEditingFeature(feature)}
            onGoToRequests={handleGoToRequests}
          />
        ) : (
          <CatalogGrid
            onSelectFeature={setSelectedFeatureId}
            onEditFeature={(feature) => setEditingFeature(feature)}
            onAddFeature={() => setShowAddModal(true)}
          />
        )
      )}

      {activeTab === "requests" && <RequestsTab highlightRequestId={highlightRequestId} />}

      {showAddModal && <FeatureFormModal onClose={() => setShowAddModal(false)} />}
      {editingFeature && <FeatureFormModal feature={editingFeature} onClose={() => setEditingFeature(null)} />}
    </>
  );
}
