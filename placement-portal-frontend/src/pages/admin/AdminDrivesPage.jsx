import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/common/Button";
import { Briefcase, Building, MapPin, Calendar, Trash2 } from "lucide-react";

export default function AdminDrivesPage() {
  const queryClient = useQueryClient();

  const { data: drives = [], isLoading } = useQuery({
    queryKey: ["adminDrivesAll"],
    queryFn: () => adminApi.getDrives().then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (driveId) => adminApi.deleteDrive(driveId),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminDrivesAll"]);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleDelete = (driveId) => {
    if (window.confirm("Are you sure you want to delete this drive? This cannot be undone.")) {
      deleteMutation.mutate(driveId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Global Drives Directory</h1>
          <p className="text-slate-600 mt-1">Monitor and manage all placement drives across the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Company / Role
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Details
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {drives.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    <Briefcase className="mx-auto h-8 w-8 text-slate-400 mb-3" />
                    No drives have been created yet.
                  </td>
                </tr>
              ) : (
                drives.map((drive) => (
                  <tr key={drive.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-brand-100 text-brand-700 rounded-lg flex items-center justify-center font-bold text-lg">
                          {drive.company_name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-slate-900">{drive.company_name}</div>
                          <div className="text-sm text-slate-500">{drive.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1 text-sm text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>CTC: ₹{drive.ctc_lpa} LPA</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{drive.location || "Remote"}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Expires: {new Date(drive.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {drive.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="outline">Closed</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(drive.id)}
                        isLoading={deleteMutation.isPending && deleteMutation.variables === drive.id}
                        className="flex items-center space-x-1 ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
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
  );
}
