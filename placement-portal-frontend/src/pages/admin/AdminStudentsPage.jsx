import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import { branchesApi } from "../../api/branches.api";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { showConfirm, showSuccess, showError, showToast } from "../../utils/swal";
import { Users, ShieldAlert, Trash2, UserPlus, Edit3, ShieldCheck } from "lucide-react";

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserType, setSelectedUserType] = useState("student");

  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["adminStudentsAll"],
    queryFn: () => adminApi.getAllStudents().then((res) => res.data),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches().then((res) => res.data),
  });

  const createUserMutation = useMutation({
    mutationFn: (newUserData) => adminApi.createUser(newUserData),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      queryClient.invalidateQueries(["adminAnalytics"]);
      setShowAddUserModal(false);
      showSuccess("User Created!", "New account created successfully without OTP.");
    },
    onError: (err) => {
      showError("Failed to Create User", err.response?.data?.detail || "Could not create user.");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updateData }) => adminApi.updateUser(userId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      setEditingUser(null);
      showToast("User details updated successfully");
    },
    onError: (err) => {
      showError("Update Failed", err.response?.data?.detail || "Failed to update user.");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      queryClient.invalidateQueries(["adminAnalytics"]);
      showToast("User account deleted");
    },
    onError: (err) => {
      showError("Delete Failed", err.response?.data?.detail || "Failed to delete user.");
    },
  });

  const overrideMutation = useMutation({
    mutationFn: ({ userId, enabled }) => adminApi.setPlacementLockOverride(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      showToast("Placement override status updated");
    },
  });

  const handleToggleOverride = (student) => {
    overrideMutation.mutate({ 
      userId: student.user_id, 
      enabled: !student.placement_lock_override 
    });
  };

  const handleDelete = async (userId, userLabel) => {
    const confirmed = await showConfirm({
      title: "Delete User Account?",
      text: `Are you sure you want to permanently delete ${userLabel}? This action cannot be undone.`,
      confirmButtonText: "Yes, Delete User",
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const studentsList = allStudents.filter(s => s.user_type === "student");
  const otherUsersList = allStudents.filter(s => s.user_type !== "student");

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">User & Student Directory</h1>
          <p className="text-slate-600 mt-1">Manage and monitor all platform accounts (Students, TPOs, Admins).</p>
        </div>
        <Button onClick={() => setShowAddUserModal(true)} className="flex items-center gap-2">
          <UserPlus size={16} /> Direct Add User
        </Button>
      </div>

      {/* Student Accounts Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Student Accounts ({studentsList.length})</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Readiness
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {studentsList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      <Users className="mx-auto h-8 w-8 text-slate-400 mb-3" />
                      No student accounts registered yet.
                    </td>
                  </tr>
                ) : (
                  studentsList.map((student) => (
                    <tr key={student.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {student.full_name}
                            </div>
                            <div className="text-sm text-slate-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-700 font-semibold">{student.branch}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1 items-start">
                          {student.is_placed ? (
                            <Badge variant="success">Placed</Badge>
                          ) : (
                            <Badge variant="outline">Unplaced</Badge>
                          )}
                          {student.placement_lock_override && (
                            <Badge variant="warning" className="flex items-center space-x-1 text-[10px]">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Override Granted</span>
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-900">{Math.round(student.readiness_score || 0)}%</span>
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${(student.readiness_score || 0) >= 70 ? 'bg-green-500' : (student.readiness_score || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${student.readiness_score || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={student.placement_lock_override ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => handleToggleOverride(student)}
                            isLoading={overrideMutation.isPending}
                          >
                            {student.placement_lock_override ? "Revoke" : "Override"}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(student)}
                          >
                            <Edit3 size={14} />
                          </Button>

                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(student.user_id, student.email)}
                            isLoading={deleteUserMutation.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
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

      {/* Staff & Admin Accounts Section */}
      {otherUsersList.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">TPO & Admin Accounts ({otherUsersList.length})</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Account Email
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {otherUsersList.map((usr) => (
                    <tr key={usr.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900">{usr.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={usr.user_type === "admin" ? "brand" : "success"}>
                          {usr.user_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(usr.user_id, usr.email)}
                          isLoading={deleteUserMutation.isPending}
                          className="flex items-center space-x-1 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Direct Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                <UserPlus size={18} className="text-accent" /> Direct Create User (Bypass OTP)
              </h2>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">User Role *</label>
                  <select 
                    name="user_type" 
                    value={selectedUserType}
                    onChange={(e) => setSelectedUserType(e.target.value)}
                    required 
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="student">Student</option>
                    <option value="tpo">TPO (Training & Placement Officer)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <Input label="Email Address *" name="email" type="email" required placeholder="e.g. 23it449@bvmengineering.ac.in" />
                <Input label="Password *" name="password" type="password" required minLength={6} placeholder="Initial Account Password" />

                {selectedUserType === "student" && (
                  <>
                    <Input label="Full Name" name="full_name" placeholder="e.g. Pratham Raval" />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                      <select name="branch" className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent">
                        <option value="">Select Branch</option>
                        {branches.map(b => <option key={b.id} value={b.code}>{b.code} ({b.name})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="CGPA" name="cgpa" type="number" step="0.01" placeholder="e.g. 8.5" />
                      <Input label="Active Backlogs" name="active_backlogs" type="number" placeholder="e.g. 0" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowAddUserModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={createUserMutation.isPending}>Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                <Edit3 size={18} className="text-accent" /> Edit Student Details
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleUpdateUserSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <Input label="Email Address" name="email" defaultValue={editingUser.email} required />
                <Input label="Full Name" name="full_name" defaultValue={editingUser.full_name} required />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <select name="branch" defaultValue={editingUser.branch} className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent">
                    {branches.map(b => <option key={b.id} value={b.code}>{b.code} ({b.name})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="CGPA" name="cgpa" type="number" step="0.01" defaultValue={editingUser.cgpa || 0} />
                  <Input label="Active Backlogs" name="active_backlogs" type="number" defaultValue={editingUser.active_backlogs || 0} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Placement Status</label>
                  <select name="is_placed" defaultValue={editingUser.is_placed ? "true" : "false"} className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="false">Unplaced</option>
                    <option value="true">Placed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" isLoading={updateUserMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
