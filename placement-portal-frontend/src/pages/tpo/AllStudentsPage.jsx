import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import { 
  Users, 
  ShieldAlert, 
  Ban, 
  Unlock, 
  MailWarning, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Award,
  Sparkles,
  AlertTriangle,
  UserX
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StaggerGrid,
  GlassCard,
  AnimatedCounter,
  InteractiveSearchBox,
  RevealOnScroll
} from "../../components/common/MotionKit";

import { showConfirm, showToast, showSuccess } from "../../utils/swal";

export default function AllStudentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warnModal, setWarnModal] = useState({ isOpen: false, userId: null, name: "" });

  const { data: students, isLoading, error } = useQuery({
    queryKey: ["tpo-students"],
    queryFn: async () => {
      const { data } = await tpoApi.getAllStudents();
      return data;
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId) => tpoApi.deactivateStudent(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpo-students"]);
      showToast("Student account deactivated");
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ userId, enabled }) => tpoApi.setPlacementLockOverride(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpo-students"]);
      showToast("Placement override status updated");
    },
  });

  const warnMutation = useMutation({
    mutationFn: ({ userId, message }) => tpoApi.warnStudent(userId, message),
    onSuccess: () => {
      setWarnModal({ isOpen: false, userId: null, name: "" });
      showSuccess("Warning Sent", "Warning notification delivered to student successfully.");
    },
  });

  const handleDeactivate = async (student) => {
    const confirmed = await showConfirm({
      title: "Deactivate Student?",
      text: `Are you sure you want to deactivate ${student.full_name}? They will lose access to placement drives.`,
      confirmButtonText: "Yes, Deactivate",
      confirmButtonColor: "#dc2626",
    });
    if (confirmed) {
      deactivateMutation.mutate(student.user_id);
    }
  };

  const handleWarnSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    warnMutation.mutate({ userId: warnModal.userId, message: formData.get("message") });
  };

  const completedProfiles = useMemo(
    () => students?.filter((s) => s.full_name !== "Profile Not Setup") || [],
    [students]
  );
  const incompleteProfiles = useMemo(
    () => students?.filter((s) => s.full_name === "Profile Not Setup") || [],
    [students]
  );

  const totalCount = students?.length || 0;
  const verifiedCount = completedProfiles.filter((s) => s.fee_verified).length;
  const placedCount = completedProfiles.filter((s) => s.is_placed).length;
  const incompleteCount = incompleteProfiles.length;

  const filterChips = [
    { id: "all", label: "All Students", count: completedProfiles.length },
    { id: "placed", label: "Placed", count: placedCount },
    { id: "unplaced", label: "Unplaced", count: completedProfiles.length - placedCount },
    { id: "fee_verified", label: "Fee Verified", count: verifiedCount },
    { id: "fee_pending", label: "Fee Pending", count: completedProfiles.length - verifiedCount },
  ];

  const filteredCompleted = useMemo(() => {
    return completedProfiles.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.branch || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "placed") return s.is_placed;
      if (statusFilter === "unplaced") return !s.is_placed;
      if (statusFilter === "fee_verified") return s.fee_verified;
      if (statusFilter === "fee_pending") return !s.fee_verified;

      return true;
    });
  }, [completedProfiles, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3">
        <AlertTriangle size={20} />
        <div>
          <p className="font-bold">Error loading student cohort</p>
          <p className="text-xs">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ════════════ TOPBAR & KINETIC HEADER ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
              <GraduationCap size={13} className="text-blue-600" />
              <span>Institutional Cohort</span>
            </span>
            <LiveStatusBeacon label="DIRECTORY SYNCED" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Student Placement Directory" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Audit student profiles, verification status, fee clearances, warnings, and recruitment drive overrides.
          </p>
        </div>
      </div>

      {/* ════════════ KPI TELEMETRY CARDS ════════════ */}
      <StaggerGrid columns="grid-cols-2 lg:grid-cols-4" gap="gap-4">
        <GlassCard className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrolled</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            <AnimatedCounter target={totalCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Institutional records</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fee Verified</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono">
            <AnimatedCounter target={verifiedCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Cleared for campus drives</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Placed Students</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Award size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-purple-600 font-mono">
            <AnimatedCounter target={placedCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Secured corporate offers</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Incomplete Profiles</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <MailWarning size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-amber-600 font-mono">
            <AnimatedCounter target={incompleteCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Awaiting student onboarding</p>
        </GlassCard>
      </StaggerGrid>

      {/* ════════════ INTERACTIVE SEARCH & FILTER BOX ════════════ */}
      <RevealOnScroll direction="up" delay={0.1}>
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <InteractiveSearchBox
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search students by full name, roll number, department branch, or email..."
            chips={filterChips}
            activeChip={statusFilter}
            onChipClick={setStatusFilter}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong>{filteredCompleted.length}</strong> registered students
            </span>
            <span>Tip: Use keyboard shortcut <strong>/</strong> to instantly focus search</span>
          </div>
        </div>
      </RevealOnScroll>

      {/* ════════════ REGISTERED STUDENTS DIRECTORY ════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <span>Active Student Cohort</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Actions: Warn • Placement Override • Deactivate
          </span>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-blue-50/40 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 font-semibold">Student Profile</th>
                  <th className="px-5 py-4 font-semibold">Department Branch</th>
                  <th className="px-5 py-4 font-semibold">Placement Fee Status</th>
                  <th className="px-5 py-4 font-semibold">Recruitment Status</th>
                  <th className="px-5 py-4 font-semibold text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserX size={36} className="text-slate-400" />
                        <p className="font-semibold text-slate-800">No students match your filter criteria.</p>
                        <p className="text-xs text-slate-500">
                          Try refining your search keyword or clearing the active filter chip.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCompleted.map((student) => (
                    <tr
                      key={student.user_id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                            {student.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {student.full_name}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                          {student.branch || "General"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {student.fee_verified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Clock size={13} className="text-rose-500" />
                            <span>Fee Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {student.is_placed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <Award size={13} className="text-purple-600" />
                            <span>Placed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Unplaced</span>
                          </span>
                        )}
                        {student.placement_lock_override && (
                          <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            OVERRIDE ON
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setWarnModal({
                                isOpen: true,
                                userId: student.user_id,
                                name: student.full_name,
                              })
                            }
                            className="p-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-95 shadow-xs"
                            title="Issue Academic/Disciplinary Warning"
                          >
                            <ShieldAlert size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              overrideMutation.mutate({
                                userId: student.user_id,
                                enabled: !student.placement_lock_override,
                              })
                            }
                            className={`p-2 rounded-xl border transition-all active:scale-95 shadow-xs ${
                              student.placement_lock_override
                                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                            }`}
                            title="Toggle Placement Override Permission"
                          >
                            <Unlock size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeactivate(student)}
                            className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all active:scale-95 shadow-xs"
                            title="Deactivate Student Account"
                          >
                            <Ban size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ════════════ INCOMPLETE PROFILES SECTION ════════════ */}
      {incompleteProfiles.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <MailWarning size={18} className="text-amber-500" />
              <span>Pending Setup Accounts ({incompleteProfiles.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              Students who registered their login credentials but haven't completed placement setup
            </span>
          </div>

          <div className="bg-amber-50/40 rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-amber-100/60 text-amber-900 border-b border-amber-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Registered Email Account</th>
                    <th className="px-5 py-3 font-semibold text-right">Onboarding Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-200/50">
                  {incompleteProfiles.map((student) => (
                    <tr key={student.user_id} className="hover:bg-amber-100/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-900 flex items-center gap-3">
                        <MailWarning size={16} className="text-amber-600 shrink-0" />
                        <span className="font-mono text-xs">{student.email}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                          Setup Incomplete
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ WARNING MODAL ════════════ */}
      {warnModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={22} className="text-white shrink-0" />
                <h2 className="text-lg font-bold font-heading">
                  Issue Disciplinary Warning
                </h2>
              </div>
              <button
                onClick={() => setWarnModal({ isOpen: false, userId: null, name: "" })}
                className="text-white/80 hover:text-white text-xl font-bold p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleWarnSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-800">
                You are issuing an official placement warning to{" "}
                <strong>{warnModal.name}</strong>. This warning will be logged to their profile
                and delivered via instant platform notification.
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Warning Notice Message
                </label>
                <textarea
                  name="message"
                  required
                  rows="4"
                  placeholder="State the reason for warning (e.g. unexcused absence from interview, malpractice in qualifying test, attendance shortfall)..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWarnModal({ isOpen: false, userId: null, name: "" })}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" isLoading={warnMutation.isPending}>
                  Send Official Warning
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
