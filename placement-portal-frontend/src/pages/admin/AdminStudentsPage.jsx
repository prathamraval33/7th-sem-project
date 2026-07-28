import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/common/Button";
import { Users, ShieldAlert, CheckCircle2, Trash2 } from "lucide-react";

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();

  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["adminStudentsAll"],
    queryFn: () => adminApi.getAllStudents().then((res) => res.data),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ userId, enabled }) => adminApi.setPlacementLockOverride(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => adminApi.deleteStudent(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminStudentsAll"]);
      queryClient.invalidateQueries(["adminAnalytics"]);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleToggleOverride = (student) => {
    overrideMutation.mutate({ 
      userId: student.user_id, 
      enabled: !student.placement_lock_override 
    });
  };

  const handleDelete = (userId) => {
    if (window.confirm("Are you sure you want to delete this incomplete student account?")) {
      deleteMutation.mutate(userId);
    }
  };

  const completedProfiles = allStudents.filter(s => s.full_name !== "Profile Not Setup");
  const incompleteProfiles = allStudents.filter(s => s.full_name === "Profile Not Setup");

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Global Student Directory</h1>
          <p className="text-slate-600 mt-1">Manage and monitor all registered students.</p>
        </div>
      </div>

      {/* Completed Profiles Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Registered Students</h2>
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
                {completedProfiles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      <Users className="mx-auto h-8 w-8 text-slate-400 mb-3" />
                      No completed student profiles yet.
                    </td>
                  </tr>
                ) : (
                  completedProfiles.map((student) => (
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
                        <span className="text-sm text-slate-700">{student.branch}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-2 items-start">
                          {student.is_placed ? (
                            <Badge variant="success">Placed</Badge>
                          ) : (
                            <Badge variant="outline">Unplaced</Badge>
                          )}
                          {student.placement_lock_override && (
                            <Badge variant="warning" className="flex items-center space-x-1">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Lock Overridden</span>
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
                        <Button
                          variant={student.placement_lock_override ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleOverride(student)}
                          isLoading={overrideMutation.isPending}
                        >
                          {student.placement_lock_override ? "Revoke Override" : "Grant Override"}
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

      {/* Incomplete Profiles Section */}
      {incompleteProfiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 font-heading border-b border-slate-200 pb-2">Incomplete Profiles</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Account Email
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {incompleteProfiles.map((student) => (
                    <tr key={student.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900">{student.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(student.user_id)}
                          isLoading={deleteMutation.isPending}
                          className="flex items-center space-x-1"
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
    </div>
  );
}
