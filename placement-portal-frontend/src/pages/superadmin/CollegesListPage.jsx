// CollegesListPage — Institutional Tenants & Multi-Campus Registry
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { useSuperAdminStore } from "./superAdminStore";
import DataTable from "../../components/superadmin/DataTable";
import StatusPill from "../../components/superadmin/StatusPill";
import AddCollegeModal from "../../components/superadmin/AddCollegeModal";
import {
  AnimatedWords,
  LiveStatusBeacon,
  InteractiveSearchBox,
  RevealOnScroll,
} from "../../components/common/MotionKit";

export default function CollegesListPage() {
  const colleges = useSuperAdminStore((s) => s.colleges);
  const toggleCollegeStatus = useSuperAdminStore((s) => s.toggleCollegeStatus);
  const approveCollege = useSuperAdminStore((s) => s.approveCollege);
  const rejectCollege = useSuperAdminStore((s) => s.rejectCollege);
  const deleteCollege = useSuperAdminStore((s) => s.deleteCollege);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const navigate = useNavigate();

  // Filter
  const filtered = useMemo(() => {
    let result = colleges;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.domain.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [colleges, search, statusFilter]);

  const filterChips = [
    { id: "all", label: "All Institutions", count: colleges.length },
    {
      id: "active",
      label: "Active",
      count: colleges.filter((c) => c.status === "active").length,
    },
    {
      id: "ready_for_review",
      label: "Review Pending",
      count: colleges.filter((c) => c.status === "ready_for_review").length,
    },
    {
      id: "pending_setup",
      label: "Setup Incomplete",
      count: colleges.filter((c) => c.status === "pending_setup").length,
    },
    {
      id: "suspended",
      label: "Suspended",
      count: colleges.filter((c) => c.status === "suspended").length,
    },
  ];

  const columns = [
    {
      key: "name",
      header: "College Name & Domain",
      className: "cd-table__cell--bold",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/60 flex items-center justify-center shrink-0 font-bold text-xs">
            {row.name ? row.name.substring(0, 2).toUpperCase() : "CL"}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{row.name}</p>
            <p className="font-mono text-[11px] text-slate-400 truncate">{row.domain}</p>
          </div>
        </div>
      ),
    },
    {
      key: "students",
      header: "Students",
      render: (row) => (
        <span className="font-mono text-slate-700 font-semibold text-xs">
          {(row.students || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "tpos",
      header: "TPOs",
      render: (row) => (
        <span className="font-mono text-slate-700 text-xs">
          {row.tpos || 0}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusPill status={row.status} />
          {row.status === "pending_setup" && (
            <span className="text-[10px] text-slate-400 font-mono">
              {row.setupProgressPercentage || 0}% setup
            </span>
          )}
        </div>
      ),
    },
    {
      key: "joinedAt",
      header: "Joined",
      className: "cd-table__cell--meta",
      render: (row) => (
        <span className="text-slate-500 font-mono text-xs">
          {row.joinedAt ? format(new Date(row.joinedAt), "MMM d, yyyy") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "cd-table__cell--actions",
      render: (row) => {
        if (confirmDeleteId === row.id) {
          return (
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs text-rose-600 font-bold">Confirm delete?</span>
              <button
                className="px-2 py-1 rounded bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCollege(row.id);
                  setConfirmDeleteId(null);
                }}
              >
                Yes
              </button>
              <button
                className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 cursor-pointer"
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

        if (row.status === "ready_for_review") {
          return (
            <div className="flex items-center gap-1.5 justify-end">
              <button
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                onClick={async (e) => {
                  e.stopPropagation();
                  await approveCollege(row.id);
                }}
              >
                Approve
              </button>
              <button
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                onClick={async (e) => {
                  e.stopPropagation();
                  const reason = window.prompt("Reason for rejection:");
                  if (reason !== null) {
                    await rejectCollege(row.id, reason.trim() || "Application does not meet onboarding criteria.");
                  }
                }}
              >
                Reject
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 justify-end">
            {row.status === "active" || row.status === "suspended" ? (
              <button
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  row.status === "active"
                    ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollegeStatus(row.id);
                }}
              >
                {row.status === "active" ? "Suspend" : "Reactivate"}
              </button>
            ) : null}
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete College"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(row.id);
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-200 font-bold">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <AnimatedWords
                  text="Institutions & Campus Tenants"
                  className="text-2xl font-bold tracking-tight text-slate-900 font-heading"
                />
                <LiveStatusBeacon label={`${colleges.length} REGISTERED`} color="blue" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage registered college domains, review pending admissions, and configure institutional licenses.
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <Plus size={15} /> Add Institution
          </button>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <InteractiveSearchBox
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
          placeholder="Search colleges by name or domain (e.g. bvmengineering.ac.in)..."
          totalCount={colleges.length}
          filteredCount={filtered.length}
          filters={filterChips}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </div>

      {/* ── Colleges Table ── */}
      <RevealOnScroll delay={0.1}>
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={(row) => navigate(`/superadmin/colleges/${row.id}`)}
            emptyState={{
              icon: Building2,
              title: "No colleges match your search",
              text: "Try clearing search filters or add a new institutional tenant.",
              actionLabel: "+ Add College",
              onAction: () => setShowModal(true),
            }}
          />
        </div>
      </RevealOnScroll>

      {/* Add College Modal */}
      {showModal && <AddCollegeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
