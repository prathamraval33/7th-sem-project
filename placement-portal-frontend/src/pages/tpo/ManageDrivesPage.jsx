import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { tpoApi } from "../../api/tpo.api";
import { branchesApi } from "../../api/branches.api";
import { Plus, Briefcase, Calendar, ChevronRight, Building2, DollarSign, AlertCircle, Tag } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/common/Input";
import Spinner from "../../components/ui/Spinner";
import { showError, showToast } from "../../utils/swal";

export default function ManageDrivesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);

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

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches().then((res) => res.data),
  });

  const createCompanyMutation = useMutation({
    mutationFn: (newCompany) => tpoApi.createCompany(newCompany),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["tpo-companies"]);
      setShowCompanyModal(false);
      if (res.data?.id) {
        setSelectedCompanyId(res.data.id.toString());
      }
      showToast("Company added successfully");
    },
  });

  const createDriveMutation = useMutation({
    mutationFn: (newDrive) => tpoApi.createDrive(newDrive),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpo-drives"]);
      setShowCreateModal(false);
      setSelectedCompanyId("");
      setSelectedDepts([]);
      showToast("Drive created successfully");
    },
    onError: (err) => {
      showError("Create Drive Failed", err.response?.data?.detail || "Could not create drive.");
    }
  });

  const handleCreateCompany = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCompany = {
      name: formData.get("name"),
      industry_type: formData.get("industry_type") || null,
      website: formData.get("website") || null,
      location: formData.get("location") || null,
      about: formData.get("about") || null,
    };
    createCompanyMutation.mutate(newCompany);
  };

  const toggleDept = (code) => {
    if (selectedDepts.includes(code)) {
      setSelectedDepts(selectedDepts.filter(d => d !== code));
    } else {
      setSelectedDepts([...selectedDepts, code]);
    }
  };

  const handleCreateDrive = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const companyId = parseInt(selectedCompanyId || formData.get("company_id"));
    
    if (!companyId) {
      showError("Company Required", "Please select or add a company first.");
      return;
    }

    if (selectedDepts.length === 0) {
      showError("Eligible Branch Required", "Please select at least one eligible department/branch.");
      return;
    }

    const minCtcVal = formData.get("min_ctc");
    const maxCtcVal = formData.get("max_ctc");

    const newDrive = {
      company_id: companyId,
      role: formData.get("role"),
      placement_type: formData.get("placement_type") || "Internship + Placement",
      jd_text: formData.get("jd_text"),
      student_instructions: formData.get("student_instructions") || null,
      min_ctc: minCtcVal ? parseFloat(minCtcVal) : null,
      max_ctc: maxCtcVal ? parseFloat(maxCtcVal) : null,
      bond_details: formData.get("bond_details") || null,
      deadline: new Date(formData.get("deadline")).toISOString(),
      eligibility_criteria: {
        min_cgpa: parseFloat(formData.get("min_cgpa")),
        max_backlogs: parseInt(formData.get("max_backlogs")),
        department_list: selectedDepts,
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Manage Drives</h1>
          <p className="text-slate-600 mt-1">Create and manage placement drives and partner companies.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowCompanyModal(true)} className="flex items-center gap-2">
            <Building2 size={16} /> Add Company
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus size={16} /> New Drive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drives?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No drives created yet. Click "New Drive" to get started.
          </div>
        ) : (
          drives?.map((drive) => {
            const matchedCompany = companies?.find(c => c.id === drive.company_id);
            const ctcDisplay = drive.min_ctc && drive.max_ctc 
              ? `₹${drive.min_ctc} - ₹${drive.max_ctc} LPA`
              : drive.min_ctc 
                ? `₹${drive.min_ctc} LPA`
                : drive.max_ctc 
                  ? `Up to ₹${drive.max_ctc} LPA`
                  : null;

            return (
              <Card key={drive.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant={drive.status === "open" ? "success" : "neutral"}>
                    {drive.status.toUpperCase()}
                  </Badge>
                  {drive.placement_type && (
                    <span className="px-2 py-0.5 bg-accent/10 text-accent font-semibold rounded-full text-xs">
                      {drive.placement_type}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 font-heading line-clamp-1">{drive.role}</h3>
                <p className="text-sm text-slate-600 font-medium mb-1 flex items-center gap-2">
                  <Building2 size={14} className="text-slate-400" /> {matchedCompany ? matchedCompany.name : `Company ID: ${drive.company_id}`}
                </p>
                {matchedCompany?.industry_type && (
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                    <Tag size={12} className="text-slate-400" /> {matchedCompany.industry_type}
                  </p>
                )}

                {ctcDisplay && (
                  <p className="text-sm font-semibold text-emerald-600 mb-4 flex items-center gap-1.5 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg border border-emerald-100">
                    <DollarSign size={14} /> Offered CTC: {ctcDisplay}
                  </p>
                )}
                
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-slate-500 text-xs">
                    <Calendar size={14} /> Last Date: {new Date(drive.deadline).toLocaleDateString()}
                  </span>
                  <Link to={`/tpo/drives/${drive.id}`} className="flex items-center text-accent font-medium hover:underline">
                    Details <ChevronRight size={16} />
                  </Link>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] shadow-xl overflow-hidden flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900 font-heading flex items-center gap-2">
                <Building2 size={18} className="text-accent" /> Add Partner Company
              </h2>
              <button onClick={() => setShowCompanyModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <form onSubmit={handleCreateCompany} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <Input label="Company Name *" name="name" required placeholder="e.g. Simform, Google, TCS" />
                <Input label="Industry Type" name="industry_type" placeholder="e.g. Software / IT Services, SaaS, Core Eng." />
                <Input label="Website" name="website" placeholder="e.g. https://simform.com" />
                <Input label="Location / City" name="location" placeholder="e.g. Ahmedabad, India" />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">About Company</label>
                  <textarea 
                    name="about" 
                    rows="3" 
                    placeholder="Brief overview of company expertise & growth..."
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowCompanyModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={createCompanyMutation.isPending}>Add Company</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Drive Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900 font-heading flex items-center gap-2">
                <Briefcase size={18} className="text-accent" /> Create Job Announcement Drive
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleCreateDrive} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-700">Select Company *</label>
                      <button 
                        type="button" 
                        onClick={() => setShowCompanyModal(true)} 
                        className="text-xs text-accent hover:underline font-medium flex items-center gap-1"
                      >
                        <Plus size={12} /> Add New
                      </button>
                    </div>
                    <select 
                      name="company_id" 
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">-- Choose Company --</option>
                      {companies?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.industry_type ? `(${c.industry_type})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input label="Job Announcement Title (Role) *" name="role" required placeholder="e.g. Software Engineer / Trainee" />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Placement Type *</label>
                    <select 
                      name="placement_type"
                      defaultValue="Internship + Placement"
                      required
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="Internship + Placement">Internship + Placement</option>
                      <option value="Only Placement">Only Placement</option>
                      <option value="Only Internship">Only Internship</option>
                    </select>
                  </div>

                  <Input label="Registration Deadline *" name="deadline" type="datetime-local" required />

                  <Input label="Min CTC (LPA)" name="min_ctc" type="number" step="0.1" placeholder="e.g. 6.0" />
                  <Input label="Max CTC (LPA)" name="max_ctc" type="number" step="0.1" placeholder="e.g. 12.0" />

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Announcement Description *</label>
                    <textarea 
                      name="jd_text" 
                      required 
                      rows="4" 
                      placeholder="Detailed responsibilities, tech stack, company background..."
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                    ></textarea>
                  </div>

                  <Input label="Bond / Service Agreement Details" name="bond_details" placeholder="e.g. 18 months agreement including training period" />

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-500" /> Instructions For Students (Optional)
                    </label>
                    <textarea 
                      name="student_instructions" 
                      rows="2" 
                      placeholder="e.g. Student must register on ERP & external registration form: https://forms.gle/..."
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent bg-amber-50/30"
                    ></textarea>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Eligibility Criteria</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Eligible Branches / Departments *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {branches.map(b => (
                        <label 
                          key={b.id} 
                          className={`flex items-center space-x-2 p-2 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                            selectedDepts.includes(b.code)
                              ? "bg-accent/10 border-accent text-accent"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={selectedDepts.includes(b.code)}
                            onChange={() => toggleDept(b.code)}
                            className="hidden"
                          />
                          <span className="font-bold">{b.code}</span>
                          <span className="text-[10px] font-normal text-slate-500 truncate">({b.name})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input label="Min CGPA *" name="min_cgpa" type="number" step="0.01" required placeholder="e.g. 6.5" />
                    <Input label="Max Backlogs Allowed *" name="max_backlogs" type="number" required placeholder="e.g. 0" />
                    <Input label="Min 10th % *" name="min_tenth" type="number" step="0.01" required placeholder="e.g. 60" />
                    <Input label="Min 12th % *" name="min_twelfth" type="number" step="0.01" required placeholder="e.g. 60" />
                    <Input label="Min Competitive %ile (Opt)" name="min_percentile" type="number" step="0.01" placeholder="e.g. 75" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={createDriveMutation.isPending}>Publish Drive</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
