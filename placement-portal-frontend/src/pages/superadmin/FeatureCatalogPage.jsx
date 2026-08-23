// FeatureCatalogPage — Master menu of optional features (§5.5).
// Card grid + Add Feature modal + Edit/Delete actions.
import { useState } from "react";
import { Puzzle, Pencil, Trash2 } from "lucide-react";
import { useSuperAdminStore } from "./superAdminStore";
import StatusPill from "../../components/superadmin/StatusPill";
import EmptyState from "../../components/superadmin/EmptyState";

const ROLE_OPTIONS = [
  { id: "Student", label: "Student", desc: "For students & job applicants" },
  { id: "TPO", label: "TPO", desc: "For Training & Placement Officers" },
  { id: "Admin", label: "College Admin", desc: "For institutional administrators" },
];

function AddFeatureModal({ onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedRoles, setSelectedRoles] = useState(["Student"]);
  const addFeature = useSuperAdminStore((s) => s.addFeature);

  const toggleRole = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      if (selectedRoles.length === 1) return; // Keep at least one role selected
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
    addFeature({
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || "General",
      targetRole: getTargetRoleString(),
    });
    onClose();
  };

  return (
    <div className="cd-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cd-modal" role="dialog" aria-label="Add Feature">
        <div className="cd-modal__title">Add New Feature</div>
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
        <div className="cd-modal__footer">
          <button className="cd-btn cd-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="cd-btn cd-btn--primary" onClick={handleSubmit} disabled={!name.trim() || !description.trim()}>Add Feature</button>
        </div>
      </div>
    </div>
  );
}

export default function FeatureCatalogPage() {
  const features = useSuperAdminStore((s) => s.features);
  const deleteFeature = useSuperAdminStore((s) => s.deleteFeature);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">Feature Catalog</h1>
        <div className="cd-topbar__actions">
          <button className="cd-btn cd-btn--primary" onClick={() => setShowModal(true)}>
            + Add Feature
          </button>
        </div>
      </div>

      {/* Feature grid or empty state */}
      {features.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="No features defined yet"
          text="Add a feature to make it available for colleges to request."
          actionLabel="+ Add Feature"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="cd-feature-grid">
          {features.map((f) => (
            <div key={f.id} className="cd-feature-card">
              <div className="cd-feature-card__actions">
                <button className="cd-feature-card__action-btn" title="Edit" aria-label={`Edit ${f.name}`}>
                  <Pencil size={16} />
                </button>
                <button
                  className="cd-feature-card__action-btn"
                  title="Delete"
                  aria-label={`Delete ${f.name}`}
                  onClick={() => deleteFeature(f.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="cd-feature-card__name">{f.name}</div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                {f.category && (
                  <StatusPill status="neutral" label={f.category} />
                )}
                <StatusPill
                  status="info"
                  label={f.targetRole ? `For: ${f.targetRole}` : "For: Student"}
                />
              </div>
              <div className="cd-feature-card__desc">{f.description}</div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AddFeatureModal onClose={() => setShowModal(false)} />}
    </>
  );
}
