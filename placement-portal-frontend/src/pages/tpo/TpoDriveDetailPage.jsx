import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import { branchesApi } from "../../api/branches.api";
import DriveDetailsView from "../../components/drives/DriveDetailsView";
import { 
  Users, 
  FileText, 
  BarChart3, 
  Info, 
  Edit3, 
  Building2, 
  Calendar
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Input from "../../components/common/Input";
import { showConfirm, showToast, showError } from "../../utils/swal";

export default function TpoDriveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("applicants");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState([]);

  const driveId = parseInt(id, 10);

  const { data: drives, isLoading: loadingDrives } = useQuery({
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

  const drive = drives?.find(d => String(d.id) === String(driveId));
  const company = companies?.find(c => String(c.id) === String(drive?.company_id));

  const { data: applicants, isLoading: loadingApplicants } = useQuery({
    queryKey: ["tpo-applicants", driveId],
    queryFn: async () => {
      const { data } = await tpoApi.getApplicants(driveId);
      return data;
    },
    enabled: !!drive,
  });

  const { data: eligibleStudents, isLoading: loadingEligible } = useQuery({
    queryKey: ["tpo-eligible", driveId],
    queryFn: async () => {
      const { data } = await tpoApi.getEligibleStudents(driveId);
      return data;
    },
    enabled: !!drive,
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["tpo-drive-analytics", driveId],
    queryFn: async () => {
      const { data } = await tpoApi.getAnalytics(driveId);
      return data;
    },
    enabled: !!drive,
  });

  const closeDriveMutation = useMutation({
    mutationFn: () => tpoApi.closeDrive(driveId),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpo-drives"]);
      queryClient.invalidateQueries(["tpoDrives"]);
      queryClient.invalidateQueries(["tpo-applicants", driveId]);
    }
  });

  const updateDriveMutation = useMutation({
    mutationFn: (updatedPayload) => tpoApi.updateDrive(driveId, updatedPayload),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpo-drives"]);
      queryClient.invalidateQueries(["tpoDrives"]);
      queryClient.invalidateQueries(["tpo-drive-detail", driveId]);
      queryClient.invalidateQueries(["adminDrivesAll"]);
      setShowEditModal(false);
      showToast("Drive updated successfully");
    },
    onError: (err) => {
      showError("Update Failed", err.response?.data?.detail || "Failed to update drive");
    }
  });

  const handleOpenEditModal = () => {
    if (drive) {
      setSelectedDepts(drive.eligibility_criteria?.department_list || []);
      setShowEditModal(true);
    }
  };

  const toggleDept = (code) => {
    if (selectedDepts.includes(code)) {
      setSelectedDepts(selectedDepts.filter(d => d !== code));
    } else {
      setSelectedDepts([...selectedDepts, code]);
    }
  };

  const handleUpdateDriveSubmit = async (e) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    if (selectedDepts.length === 0) {
      showError("Branch Required", "Please select at least one eligible department/branch.");
      return;
    }

    const minCtcVal = formData.get("min_ctc");
    const maxCtcVal = formData.get("max_ctc");
    const minPercentileVal = formData.get("min_percentile");
    const deadlineValue = formData.get("deadline");

    const updatedPayload = {
      role: formData.get("role"),
      placement_type: formData.get("placement_type") || "Internship + Placement",
      jd_text: formData.get("jd_text"),
      student_instructions: formData.get("student_instructions") || null,
      min_ctc: minCtcVal ? parseFloat(minCtcVal) : null,
      max_ctc: maxCtcVal ? parseFloat(maxCtcVal) : null,
      bond_details: formData.get("bond_details") || null,
      deadline: deadlineValue ? new Date(deadlineValue).toISOString() : drive?.deadline,
      eligibility_criteria: {
        min_cgpa: parseFloat(formData.get("min_cgpa") || 0),
        max_backlogs: parseInt(formData.get("max_backlogs") || 0, 10),
        department_list: selectedDepts,
        min_tenth: parseFloat(formData.get("min_tenth") || 0),
        min_twelfth: parseFloat(formData.get("min_twelfth") || 0),
        min_percentile: minPercentileVal ? parseFloat(minPercentileVal) : null,
      },
    };

    const confirmed = await showConfirm({
      title: "Update Placement Drive?",
      text: "Are you sure you want to update this drive's details?",
      confirmButtonText: "Yes, Save Changes",
    });
    if (!confirmed) return;

    updateDriveMutation.mutate(updatedPayload);
  };

  if (loadingDrives) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  if (!drive) return <div className="p-8 text-center text-red-500">Drive not found.</div>;

  const defaultDeadlineISO = drive.deadline 
    ? new Date(drive.deadline).toISOString().slice(0, 16) 
    : "";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Badge variant={drive.status === "open" ? "success" : "neutral"}>
              {drive.status.toUpperCase()}
            </Badge>
            {drive.placement_type && (
              <span className="px-2.5 py-0.5 bg-accent/10 text-accent font-semibold rounded-full text-xs">
                {drive.placement_type}
              </span>
            )}
            <Badge variant="brand">{drive.test_status === "open" ? "Test Active" : "No Test"}</Badge>
            <span className="text-xs text-slate-500 font-medium">Drive ID: #{drive.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">{drive.role}</h1>
          <p className="text-slate-600 mt-1 flex items-center gap-4 text-sm flex-wrap">
            <span className="flex items-center gap-1.5 font-medium"><Building2 size={15} /> {company?.name || `Company ID: ${drive.company_id}`}</span>
            <span className="flex items-center gap-1.5 text-slate-500"><Calendar size={15} /> Last Date: {new Date(drive.deadline).toLocaleString()}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleOpenEditModal} className="flex items-center gap-2">
            <Edit3 size={16} /> Edit Drive
          </Button>
          {drive.status === "open" && (
            <Button variant="danger" onClick={() => closeDriveMutation.mutate()} isLoading={closeDriveMutation.isPending}>
              Close Drive
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {[
          { id: "applicants", label: "Applicants", icon: FileText, count: applicants?.length },
          { id: "eligible", label: "Eligible Pool", icon: Users, count: eligibleStudents?.length },
          { id: "analytics", label: "Analytics", icon: BarChart3 },
          { id: "details", label: "Drive Details", icon: Info }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? "border-accent text-accent font-semibold" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? "bg-accent/10" : "bg-slate-100"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === "applicants" && (
          <Card>
            {loadingApplicants ? <div className="p-4"><Spinner /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student Name</th>
                      <th className="px-4 py-3 font-medium">Branch</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Eligible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {applicants?.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No applicants yet.</td></tr>
                    ) : (
                      applicants?.map(app => (
                        <tr key={app.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{app.student_name}</td>
                          <td className="px-4 py-3 text-slate-600">{app.student_branch}</td>
                          <td className="px-4 py-3">
                            <Badge variant={app.status === "selected" ? "success" : app.status === "rejected" ? "danger" : "neutral"}>
                              {app.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {app.is_eligible ? (
                              <Badge variant="success">Yes</Badge>
                            ) : (
                              <Badge variant="danger">No</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === "eligible" && (
          <Card>
            <div className="p-4 border-b border-border bg-slate-50/50 flex justify-between items-center">
              <p className="text-sm text-slate-600">Students matching eligibility criteria ({drive.eligibility_criteria?.min_cgpa} CGPA, max {drive.eligibility_criteria?.max_backlogs} backlogs).</p>
            </div>
            {loadingEligible ? <div className="p-4"><Spinner /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student Name</th>
                      <th className="px-4 py-3 font-medium">Branch</th>
                      <th className="px-4 py-3 font-medium">CGPA</th>
                      <th className="px-4 py-3 font-medium">Backlogs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {eligibleStudents?.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No eligible students found.</td></tr>
                    ) : (
                      eligibleStudents?.map(student => (
                        <tr key={student.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{student.full_name}</td>
                          <td className="px-4 py-3 text-slate-600">{student.branch}</td>
                          <td className="px-4 py-3 font-medium">{student.cgpa}</td>
                          <td className="px-4 py-3">{student.active_backlogs}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-slate-900 font-heading mb-4">Pipeline Stats</h3>
              {loadingAnalytics ? <Spinner /> : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">Total Applicants</span>
                    <span className="font-semibold text-slate-900">{analytics?.total_applicants || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg border border-success/20">
                    <span className="text-success-800 font-medium">Total Selected</span>
                    <span className="font-bold text-success-700">{analytics?.total_selected || 0}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold text-slate-900 font-heading mb-4">Department Breakdown</h3>
              {loadingAnalytics ? <Spinner /> : (
                <div className="space-y-3">
                  {analytics?.department_stats?.length === 0 ? (
                    <p className="text-sm text-slate-500">No data available.</p>
                  ) : (
                    analytics?.department_stats?.map(stat => (
                      <div key={stat.department} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                        <span className="font-medium text-slate-700">{stat.department}</span>
                        <div className="flex gap-4">
                          <span className="text-slate-500">Applied: {stat.applied}</span>
                          <span className="text-success-600 font-medium">Selected: {stat.selected}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Full Drive Details Tab */}
        {activeTab === "details" && (
          <DriveDetailsView drive={drive} company={company} />
        )}
      </div>

      {/* Edit Drive Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900 font-heading flex items-center gap-2">
                <Edit3 size={18} className="text-accent" /> Update Drive Details
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleUpdateDriveSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Job Announcement Title (Role)" name="role" defaultValue={drive.role} required placeholder="e.g. Software Engineer" />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Placement Type</label>
                    <select 
                      name="placement_type" 
                      defaultValue={drive.placement_type || "Internship + Placement"}
                      required
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="Internship + Placement">Internship + Placement</option>
                      <option value="Only Placement">Only Placement</option>
                      <option value="Only Internship">Only Internship</option>
                    </select>
                  </div>
                  
                  <Input label="Min CTC (LPA)" name="min_ctc" type="number" step="0.1" defaultValue={drive.min_ctc || ""} placeholder="e.g. 6.0" />
                  <Input label="Max CTC (LPA)" name="max_ctc" type="number" step="0.1" defaultValue={drive.max_ctc || ""} placeholder="e.g. 12.0" />

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Announcement Description</label>
                    <textarea 
                      name="jd_text" 
                      defaultValue={drive.jd_text}
                      required 
                      rows="4" 
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                    ></textarea>
                  </div>

                  <Input label="Bond / Service Agreement Details" name="bond_details" defaultValue={drive.bond_details || ""} placeholder="e.g. 18 months service agreement" />
                  <Input label="Registration Deadline" name="deadline" type="datetime-local" defaultValue={defaultDeadlineISO} required />

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instructions For Students</label>
                    <textarea 
                      name="student_instructions" 
                      defaultValue={drive.student_instructions || ""}
                      rows="2" 
                      placeholder="e.g. Mandatory registration link..."
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent bg-amber-50/30"
                    ></textarea>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Eligibility Criteria</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Eligible Branches / Departments</label>
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
                    <Input label="Min CGPA" name="min_cgpa" type="number" step="0.01" defaultValue={drive.eligibility_criteria?.min_cgpa} required placeholder="e.g. 6.5" />
                    <Input label="Max Backlogs" name="max_backlogs" type="number" defaultValue={drive.eligibility_criteria?.max_backlogs} required placeholder="e.g. 0" />
                    <Input label="Min 10th %" name="min_tenth" type="number" step="0.01" defaultValue={drive.eligibility_criteria?.min_tenth} required placeholder="e.g. 60" />
                    <Input label="Min 12th %" name="min_twelfth" type="number" step="0.01" defaultValue={drive.eligibility_criteria?.min_twelfth} required placeholder="e.g. 60" />
                    <Input label="Min Competitive %ile (Opt)" name="min_percentile" type="number" step="0.01" defaultValue={drive.eligibility_criteria?.min_percentile || ""} placeholder="e.g. 75" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={updateDriveMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
