// AddCollegeModal — 2-step guided flow (§5.3).
// Step 1: College Name + Allowed Email Domain
// Step 2: Admin Name + Admin Email + Access Method
import { useState } from "react";
import { X, Check } from "lucide-react";
import { useSuperAdminStore } from "../../pages/superadmin/superAdminStore";

const INITIAL_FORM = {
  collegeName: "",
  domain: "",
  adminName: "",
  adminEmail: "",
  accessMethod: "invite",
};

export default function AddCollegeModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const addCollege = useSuperAdminStore((s) => s.addCollege);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleNext = () => {
    if (!form.collegeName.trim() || !form.domain.trim()) return;
    setStep(2);
  };

  const handleCreate = () => {
    if (!form.adminName.trim() || !form.adminEmail.trim()) return;
    addCollege({
      name: form.collegeName.trim(),
      domain: form.domain.trim(),
      adminName: form.adminName.trim(),
      adminEmail: form.adminEmail.trim(),
    });
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="cd-modal-backdrop" onClick={handleBackdropClick}>
      <div className="cd-modal" role="dialog" aria-label="Add New College">
        {/* Close button */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--cd-text-muted)" }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="cd-modal__title">Add New College</div>

        {/* Step indicator */}
        <div className="cd-steps">
          <div className={`cd-steps__item ${step === 1 ? "cd-steps__item--current" : "cd-steps__item--completed"}`}>
            <div className="cd-steps__dot">{step > 1 ? <Check size={12} /> : "1"}</div>
            <span className="cd-steps__label">College Details</span>
          </div>
          <div className="cd-steps__separator" />
          <div className={`cd-steps__item ${step === 2 ? "cd-steps__item--current" : "cd-steps__item--upcoming"}`}>
            <div className="cd-steps__dot">2</div>
            <span className="cd-steps__label">Admin Account</span>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <div className="cd-input-group">
              <label className="cd-label" htmlFor="collegeName">College Name</label>
              <input
                id="collegeName"
                className="cd-input"
                type="text"
                placeholder="e.g. Indian Institute of Technology, Bombay"
                value={form.collegeName}
                onChange={(e) => update("collegeName", e.target.value)}
                autoFocus
              />
            </div>
            <div className="cd-input-group">
              <label className="cd-label" htmlFor="domain">Allowed Email Domain</label>
              <input
                id="domain"
                className="cd-input"
                type="text"
                placeholder="e.g. iitb.ac.in"
                value={form.domain}
                onChange={(e) => update("domain", e.target.value)}
              />
              <div className="cd-helper-text">
                Students with an email ending in this domain will automatically be recognized
                as belonging to this college when they sign up.
              </div>
            </div>
            <div className="cd-modal__footer">
              <button className="cd-btn cd-btn--secondary" onClick={onClose}>Cancel</button>
              <button
                className="cd-btn cd-btn--primary"
                onClick={handleNext}
                disabled={!form.collegeName.trim() || !form.domain.trim()}
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <div className="cd-input-group">
              <label className="cd-label" htmlFor="adminName">Admin Full Name</label>
              <input
                id="adminName"
                className="cd-input"
                type="text"
                placeholder="e.g. Dr. Rajesh Kumar"
                value={form.adminName}
                onChange={(e) => update("adminName", e.target.value)}
                autoFocus
              />
            </div>
            <div className="cd-input-group">
              <label className="cd-label" htmlFor="adminEmail">Admin Email</label>
              <input
                id="adminEmail"
                className="cd-input"
                type="email"
                placeholder="e.g. admin@iitb.ac.in"
                value={form.adminEmail}
                onChange={(e) => update("adminEmail", e.target.value)}
              />
            </div>
            <div className="cd-input-group">
              <label className="cd-label">Initial Access Method</label>
              <div className="cd-radio-group">
                <label className="cd-radio-option">
                  <input
                    type="radio"
                    name="accessMethod"
                    value="invite"
                    checked={form.accessMethod === "invite"}
                    onChange={() => update("accessMethod", "invite")}
                  />
                  Send invite email
                </label>
                <label className="cd-radio-option">
                  <input
                    type="radio"
                    name="accessMethod"
                    value="password"
                    checked={form.accessMethod === "password"}
                    onChange={() => update("accessMethod", "password")}
                  />
                  Generate temporary password
                </label>
              </div>
            </div>
            <div className="cd-modal__footer">
              <button className="cd-btn cd-btn--secondary" onClick={() => setStep(1)}>Back</button>
              <button
                className="cd-btn cd-btn--primary"
                onClick={handleCreate}
                disabled={!form.adminName.trim() || !form.adminEmail.trim()}
              >
                Create College
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
