import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import { branchesApi } from "../../api/branches.api";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/ui/Card";
import { showConfirm, showSuccess, showError, showToast } from "../../utils/swal";
import {
  Users,
  UserCheck,
  ShieldAlert,
  Trash2,
  UserPlus,
  Edit3,
  Search,
  Filter,
  GraduationCap,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synced tab state: ?tab=students (default) or ?tab=staff
  const activeTab = searchParams.get("tab") || "students";
  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // Modals state
  const initialAction = searchParams.get("action");
  const initialRole = searchParams.get("role");
  const [showAddUserModal, setShowAddUserModal] = useState(initialAction === "new");
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserType, setSelectedUserType] = useState(
    initialRole && ["student", "tpo", "admin"].includes(initialRole) ? initialRole : "student"
  );

  // Filters state
  const [studentSearch, setStudentSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [placementFilter, setPlacementFilter] = useState("all");

  const [staffSearch, setStaffSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Queries
  const { data: allUsers = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["adminStudentsAll"],
    queryFn: () => adminApi.getAllStudents().then((res) => res.data),
  });

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches().then((res) => res.data),
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (newUserData) => adminApi.createUser(newUserData),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      queryClient.invalidateQueries(["adminAnalytics"]);
      setShowAddUserModal(false);
      showSuccess("Account Created!", "New platform account created successfully.");
    },
    onError: (err) => {
      showError("Failed to Create User", err.response?.data?.detail || "Could not create user account.");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updateData }) => adminApi.updateUser(userId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      queryClient.invalidateQueries(["adminAnalytics"]);
      setEditingUser(null);
      showToast("Student details updated successfully");
    },
    onError: (err) => {
      showError("Update Failed", err.response?.data?.detail || "Failed to update student profile.");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      queryClient.invalidateQueries(["adminAnalytics"]);
      showToast("User account permanently deleted");
    },
    onError: (err) => {
      showError("Delete Failed", err.response?.data?.detail || "Failed to delete user.");
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ userId, enabled }) => adminApi.setPlacementLockOverride(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      showToast("Placement lock override updated");
    },
    onError: (err) => {
      showToast(err.response?.data?.detail || "Failed to update override", "error");
    },
  });

  const handleToggleOverride = (student) => {
    overrideMutation.mutate({
      userId: student.user_id,
      enabled: !student.placement_lock_override,
    });
  };

  const handleDelete = async (userId, userLabel) => {
    const confirmed = await showConfirm({
      title: "Delete Account?",
      text: `Are you sure you want to permanently delete account "${userLabel}"? This removes all associated records and cannot be undone.`,
      confirmButtonText: "Yes, Delete Account",
      confirmButtonColor: "#dc2626",
    });
    if (confirmed) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const role = formData.get("user_type");

    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
      user_type: role,
      full_name: formData.get("full_name") || null,
      branch: formData.get("branch") || null,
      cgpa: formData.get("cgpa") ? parseFloat(formData.get("cgpa")) : null,
      active_backlogs: formData.get("active_backlogs") ? parseInt(formData.get("active_backlogs")) : 0,
      tenth_percentage: formData.get("tenth_percentage") ? parseFloat(formData.get("tenth_percentage")) : null,
      twelfth_percentage: formData.get("twelfth_percentage") ? parseFloat(formData.get("twelfth_percentage")) : null,
    };

    createUserMutation.mutate(payload);
  };

  const handleUpdateUserSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updateData = {
      email: formData.get("email"),
      full_name: formData.get("full_name"),
      branch: formData.get("branch"),
      cgpa: formData.get("cgpa") ? parseFloat(formData.get("cgpa")) : 0,
      active_backlogs: formData.get("active_backlogs") ? parseInt(formData.get("active_backlogs")) : 0,
      is_placed: formData.get("is_placed") === "true",
    };

    updateUserMutation.mutate({ userId: editingUser.user_id, updateData });
  };

  const openAddUser = (roleType) => {
    setSelectedUserType(roleType);
    setShowAddUserModal(true);
  };

  // Lists
  const studentsList = useMemo(() => allUsers.filter((u) => u.user_type === "student"), [allUsers]);
  const staffList = useMemo(() => allUsers.filter((u) => u.user_type !== "student"), [allUsers]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      const name = (s.full_name || "").toLowerCase();
      const email = (s.email || "").toLowerCase();
      const searchLower = studentSearch.toLowerCase();
      const matchSearch = name.includes(searchLower) || email.includes(searchLower);

      const matchBranch = branchFilter === "all" || s.branch === branchFilter;
      const matchPlacement =
        placementFilter === "all" ||
        (placementFilter === "placed" && s.is_placed) ||
        (placementFilter === "unplaced" && !s.is_placed);

      return matchSearch && matchBranch && matchPlacement;
    });
  }, [studentsList, studentSearch, branchFilter, placementFilter]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const matchSearch = email.includes(staffSearch.toLowerCase());
      const matchRole = roleFilter === "all" || u.user_type === roleFilter;
      return matchSearch && matchRole;
    });
  }, [staffList, staffSearch, roleFilter]);

  if (isUsersLoading || isBranchesLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* ── Page Header & Tabs ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            User Account Management
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Directory and administrative control for students, placement officers, and portal administrators.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shadow-inner self-start md:self-auto shrink-0">
          <button
            onClick={() => handleTabChange("students")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "students"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <GraduationCap size={15} className={activeTab === "students" ? "text-accent" : "text-slate-400"} />
            Students Roster
            <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-normal">
              {studentsList.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("staff")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "staff"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Shield size={15} className={activeTab === "staff" ? "text-accent" : "text-slate-400"} />
            Officers & Staff
            <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-normal">
              {staffList.length}
            </span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: STUDENTS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "students" && (
        <div className="space-y-3.5">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border shadow-2xs">
            {/* Search Input */}
            <div className="relative w-full md:w-72 lg:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name or email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            {/* Filter Dropdowns + Add Button */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Branch filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.code} ({b.name})
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All Statuses</option>
                <option value="placed">Placed Only</option>
                <option value="unplaced">Unplaced Only</option>
              </select>

              {/* Add Student Button */}
              <Button onClick={() => openAddUser("student")} className="flex items-center gap-1.5 text-xs py-1.5 px-3">
                <UserPlus size={13} /> Add Student
              </Button>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Student Name & Email</th>
                    <th className="px-3 py-3 text-left">Branch</th>
                    <th className="px-3 py-3 text-left">Academics</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-left">Readiness Score</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-slate-400">
                        <Users className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                        No students found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const readiness = Math.round(student.readiness_score || 0);
                      const barColor =
                        readiness >= 70 ? "bg-emerald-500" : readiness >= 40 ? "bg-amber-500" : "bg-rose-500";

                      return (
                        <tr key={student.user_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {(student.full_name || student.email || "S").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 leading-tight truncate">
                                  {student.full_name || "Name not set"}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px] sm:max-w-[240px]">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                              {student.branch || "—"}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="text-[11px] space-y-0.5">
                              <p className="font-semibold text-slate-800">
                                CGPA: <span className="text-slate-900 font-bold">{student.cgpa || "—"}</span>
                              </p>
                              <p className="text-slate-500">
                                Backlogs: {student.active_backlogs ?? 0}
                              </p>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              {student.is_placed ? (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0.2">Placed</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.2">Unplaced</Badge>
                              )}
                              {student.placement_lock_override && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                                  <ShieldAlert size={9} /> Override
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px] text-slate-800 w-7">{readiness}%</span>
                              <div className="w-16 sm:w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                                <div className={`h-full ${barColor}`} style={{ width: `${readiness}%` }} />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant={student.placement_lock_override ? "outline" : "secondary"}
                                size="sm"
                                onClick={() => handleToggleOverride(student)}
                                isLoading={
                                  overrideMutation.isPending &&
                                  overrideMutation.variables?.userId === student.user_id
                                }
                                title={
                                  student.placement_lock_override
                                    ? "Revoke placement drive lock override"
                                    : "Grant override to apply even if placed"
                                }
                                className="text-[10px] px-2 py-0.5 h-6"
                              >
                                {student.placement_lock_override ? "Revoke" : "Override"}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(student)}
                                title="Edit Student Profile"
                                className="p-1 h-6 w-6"
                              >
                                <Edit3 size={12} />
                              </Button>

                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(student.user_id, student.full_name || student.email)}
                                isLoading={
                                  deleteUserMutation.isPending &&
                                  deleteUserMutation.variables === student.user_id
                                }
                                title="Delete Student Account"
                                className="p-1 h-6 w-6"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: STAFF & OFFICERS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="space-y-3.5">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border shadow-2xs">
            <div className="relative w-full sm:w-72 lg:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by email..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">All Roles</option>
                <option value="tpo">TPO Officers</option>
                <option value="admin">Administrators</option>
              </select>

              <Button onClick={() => openAddUser("tpo")} className="flex items-center gap-1.5 text-xs py-1.5 px-3">
                <UserPlus size={13} /> Add Staff Account
              </Button>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Account Email</th>
                    <th className="px-3 py-3 text-left">Designation / Role</th>
                    <th className="px-3 py-3 text-left">Platform Access</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-12 text-center text-slate-400">
                        <Shield className="mx-auto h-7 w-7 text-slate-300 mb-2" />
                        No staff accounts found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((usr) => (
                      <tr key={usr.user_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {usr.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900">{usr.email}</span>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Badge variant={usr.user_type === "admin" ? "brand" : "success"} className="text-[10px] px-2 py-0.2">
                            {usr.user_type === "admin" ? "ADMINISTRATOR" : "TPO OFFICER"}
                          </Badge>
                        </td>

                        <td className="px-3 py-2.5 text-[11px] text-slate-500">
                          {usr.user_type === "admin"
                            ? "Full Institution Control & Configuration"
                            : "Drives, Student Eligibility & Reports"}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(usr.user_id, usr.email)}
                            isLoading={
                              deleteUserMutation.isPending &&
                              deleteUserMutation.variables === usr.user_id
                            }
                            className="p-1 h-6 w-6 ml-auto"
                            title="Delete Staff Account"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: DIRECT ADD USER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <UserPlus size={18} className="text-accent" /> Direct Account Creation
              </h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Account Role *
                  </label>
                  <select
                    name="user_type"
                    value={selectedUserType}
                    onChange={(e) => setSelectedUserType(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="student">Student</option>
                    <option value="tpo">TPO (Training & Placement Officer)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <Input
                  label="Email Address *"
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. user@institution.edu"
                />
                <Input
                  label="Initial Password *"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Temporary login password"
                />

                {selectedUserType === "student" && (
                  <>
                    <Input label="Full Name" name="full_name" placeholder="e.g. John Doe" />
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Academic Branch
                      </label>
                      <select
                        name="branch"
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Select Branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.code}>
                            {b.code} ({b.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="CGPA" name="cgpa" type="number" step="0.01" placeholder="e.g. 8.5" />
                      <Input label="Active Backlogs" name="active_backlogs" type="number" placeholder="0" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createUserMutation.isPending}>
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: EDIT STUDENT PROFILE */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <Edit3 size={18} className="text-accent" /> Edit Student Academic Record
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <Input label="Email Address" name="email" defaultValue={editingUser.email} required />
                <Input label="Full Name" name="full_name" defaultValue={editingUser.full_name} required />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Academic Branch
                  </label>
                  <select
                    name="branch"
                    defaultValue={editingUser.branch}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.code}>
                        {b.code} ({b.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="CGPA"
                    name="cgpa"
                    type="number"
                    step="0.01"
                    defaultValue={editingUser.cgpa ?? 0}
                  />
                  <Input
                    label="Active Backlogs"
                    name="active_backlogs"
                    type="number"
                    defaultValue={editingUser.active_backlogs ?? 0}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Placement Status
                  </label>
                  <select
                    name="is_placed"
                    defaultValue={editingUser.is_placed ? "true" : "false"}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="false">Unplaced</option>
                    <option value="true">Placed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={updateUserMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
