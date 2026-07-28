import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tpoApi } from "../../api/tpo.api";
import { Plus, Briefcase, Calendar, ChevronRight } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/common/Input";
import Spinner from "../../components/ui/Spinner";

export default function ManageDrivesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: drives, isLoading, error } = useQuery({
    queryKey: ["tpo-drives"],
    queryFn: async () => {
      const { data } = await tpoApi.getDrives();
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["tpo-companies"],
    queryFn: async () => {
      const { data } = await tpoApi.getCompanies();
      return data;
    },
  });

  const createDriveMutation = useMutation({
    mutationFn: (newDrive) => tpoApi.createDrive(newDrive),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpo-drives"]);
      setShowCreateModal(false);
    },
  });

  const handleCreateDrive = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newDrive = {
      company_id: parseInt(formData.get("company_id")),
      role: formData.get("role"),
      jd_text: formData.get("jd_text"),
      bond_details: formData.get("bond_details") || null,
      deadline: new Date(formData.get("deadline")).toISOString(),
      eligibility_criteria: {
        min_cgpa: parseFloat(formData.get("min_cgpa")),
        max_backlogs: parseInt(formData.get("max_backlogs")),
        department_list: formData.get("department_list").split(",").map(d => d.trim()),
        min_tenth: parseFloat(formData.get("min_tenth")),
        min_twelfth: parseFloat(formData.get("min_twelfth")),
        min_percentile: formData.get("min_percentile") ? parseFloat(formData.get("min_percentile")) : null,
      },
    };
    createDriveMutation.mutate(newDrive);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Manage Drives</h1>
          <p className="text-slate-600 mt-1">Create and manage placement drives.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus size={16} /> New Drive
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drives?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No drives created yet. Click "New Drive" to get started.
          </div>
        ) : (
          drives?.map((drive) => (
            <Card key={drive.id} className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <Badge variant={drive.status === "open" ? "success" : "neutral"}>
                  {drive.status.toUpperCase()}
                </Badge>
                <Badge variant="brand">{drive.test_status === "open" ? "Test Active" : "No Test"}</Badge>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 font-heading line-clamp-1">{drive.role}</h3>
              <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                <Briefcase size={14} /> Company ID: {drive.company_id}
              </p>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-slate-600">
                  <Calendar size={14} /> {new Date(drive.deadline).toLocaleDateString()}
                </span>
                <Link to={`/tpo/drives/${drive.id}`} className="flex items-center text-accent font-medium hover:underline">
                  Details <ChevronRight size={16} />
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900 font-heading">Create New Drive</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <form onSubmit={handleCreateDrive} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                  <select 
                    name="company_id" 
                    required 
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select Company</option>
                    {companies?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Input label="Role" name="role" required placeholder="e.g. Software Engineer" />
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Description</label>
                  <textarea 
                    name="jd_text" 
                    required 
                    rows="3" 
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  ></textarea>
                </div>
                <Input label="Bond Details (Optional)" name="bond_details" placeholder="e.g. 2 years, 2L penalty" />
                <Input label="Deadline" name="deadline" type="datetime-local" required />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Eligibility Criteria</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Input label="Min CGPA" name="min_cgpa" type="number" step="0.01" required placeholder="e.g. 7.0" />
                  <Input label="Max Backlogs" name="max_backlogs" type="number" required placeholder="e.g. 0" />
                  <Input label="Min 10th %" name="min_tenth" type="number" step="0.01" required placeholder="e.g. 60" />
                  <Input label="Min 12th %" name="min_twelfth" type="number" step="0.01" required placeholder="e.g. 60" />
                  <Input label="Min Competitive %ile (Opt)" name="min_percentile" type="number" step="0.01" placeholder="e.g. 75" />
                  <div className="col-span-2 sm:col-span-1">
                    <Input label="Departments" name="department_list" required placeholder="CE, IT, EC (comma separated)" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={createDriveMutation.isPending}>Create Drive</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
