// CollegesListPage — All colleges table with search, status filter,
// inline Suspend/Reactivate, and Add College button (§5.2).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import DataTable from "../../components/superadmin/DataTable";
import StatusPill from "../../components/superadmin/StatusPill";
import AddCollegeModal from "../../components/superadmin/AddCollegeModal";

export default function CollegesListPage() {
  const colleges = useSuperAdminStore((s) => s.colleges);
  const toggleCollegeStatus = useSuperAdminStore((s) => s.toggleCollegeStatus);
  const deleteCollege = useSuperAdminStore((s) => s.deleteCollege);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const navigate = useNavigate();

  // Filter
  let filtered = colleges;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q));
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter((c) => c.status === statusFilter);
  }

  const columns = [
    {
      key: "name",
      header: "College Name",
      className: "cd-table__cell--bold",
      render: (row) => row.name,
    },
    {
      key: "domain",
      header: "Domain",
      className: "cd-table__cell--secondary",
      render: (row) => row.domain,
    },
    {
      key: "students",
      header: "Students",
      render: (row) => (row.students || 0).toLocaleString(),
    },
    {
      key: "tpos",
      header: "TPOs",
      render: (row) => row.tpos || 0,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "joinedAt",
      header: "Joined",
      className: "cd-table__cell--meta",
      render: (row) => format(new Date(row.joinedAt), "MMM d, yyyy"),
    },
    {
      key: "actions",
      header: "",
      className: "cd-table__cell--actions",
      render: (row) => {
        if (confirmDeleteId === row.id) {
          return (
            <div className="cd-confirm-inline" style={{ justifyContent: "flex-end" }}>
              <span>Delete?</span>
              <button
                className="cd-btn cd-btn--compact cd-btn--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCollege(row.id);
                  setConfirmDeleteId(null);
                }}
              >
                Yes
              </button>
              <button
                className="cd-btn cd-btn--compact cd-btn--secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(null);
                }}
              >
                No
              </button>
            </div>
          );
        }
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            <button
              className={`cd-btn cd-btn--compact ${row.status === "active" ? "cd-btn--danger" : "cd-btn--success"}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleCollegeStatus(row.id);
              }}
            >
              {row.status === "active" ? "Suspend" : "Reactivate"}
            </button>
            <button
              className="cd-btn cd-btn--compact cd-btn--ghost"
              title="Delete College"
              style={{ color: "var(--cd-danger)" }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(row.id);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="cd-topbar">
        <h1 className="cd-topbar__title">Colleges</h1>
        <div className="cd-topbar__actions">
          <button className="cd-btn cd-btn--primary" onClick={() => setShowModal(true)}>
            + Add College
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="cd-search-bar">
        <input
          className="cd-input"
          type="text"
          placeholder="Search by name or domain…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cd-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => navigate(`/superadmin/colleges/${row.id}`)}
        emptyState={{
          icon: Building2,
          title: "No colleges yet",
          text: "Add your first college to start onboarding students and TPOs.",
          actionLabel: "+ Add College",
          onAction: () => setShowModal(true),
        }}
      />

      {/* Add College Modal */}
      {showModal && <AddCollegeModal onClose={() => setShowModal(false)} />}
    </>
  );
}
