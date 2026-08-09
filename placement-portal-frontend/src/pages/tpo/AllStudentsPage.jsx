import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import { Search, ShieldAlert, Ban, Unlock, MailWarning } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

import { showConfirm, showToast, showSuccess } from "../../utils/swal";

export default function AllStudentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
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

  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  if (error) return <div className="p-4 text-red-500">Error loading students: {error.message}</div>;

  const completedProfiles = students?.filter(s => s.full_name !== "Profile Not Setup") || [];
  const incompleteProfiles = students?.filter(s => s.full_name === "Profile Not Setup") || [];

  const filteredCompleted = completedProfiles.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">All Students</h1>
          <p className="text-slate-600 mt-1">Manage student profiles, warnings, and placements.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Registered Students</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Fee Status</th>
                  <th className="px-4 py-3 font-medium">Placement Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                      No students match your search.
                    </td>
                  </tr>
                ) : (
                  filteredCompleted.map((student) => (
                    <tr key={student.user_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div>
                          <div>{student.full_name}</div>
                          <div className="text-xs text-slate-500 font-normal">{student.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{student.branch}</td>
                      <td className="px-4 py-3">
                        {student.fee_verified ? <Badge variant="success">Verified</Badge> : <Badge variant="danger">Pending</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        {student.is_placed ? <Badge variant="brand">Placed</Badge> : <Badge variant="neutral">Unplaced</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setWarnModal({ isOpen: true, userId: student.user_id, name: student.full_name })}
                            title="Warn Student"
                          >
                            <ShieldAlert size={14} className="text-amber-600" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => overrideMutation.mutate({ userId: student.user_id, enabled: !student.placement_lock_override })}
                            title="Toggle Placement Override"
                          >
                            <Unlock size={14} className="text-accent" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeactivate(student)}
                            title="Deactivate Account"
                          >
                            <Ban size={14} className="text-danger" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {incompleteProfiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Incomplete Profiles</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">Account Email</th>
                    <th className="px-4 py-3 font-medium text-right">Profile Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {incompleteProfiles.map((student) => (
                    <tr key={student.user_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        <MailWarning size={16} className="text-slate-400" />
                        {student.email}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="warning">Incomplete</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {warnModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 font-heading">Warn {warnModal.name}</h2>
              <button onClick={() => setWarnModal({ isOpen: false, userId: null, name: "" })} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <form onSubmit={handleWarnSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Warning Message</label>
                <textarea 
                  name="message" 
                  required 
                  rows="4" 
                  placeholder="Reason for warning..."
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setWarnModal({ isOpen: false, userId: null, name: "" })}>Cancel</Button>
                <Button type="submit" variant="danger" isLoading={warnMutation.isPending}>Send Warning</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
