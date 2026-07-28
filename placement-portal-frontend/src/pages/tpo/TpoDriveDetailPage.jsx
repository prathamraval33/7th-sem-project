import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import { Users, FileText, BarChart3, Settings, ShieldAlert } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Input from "../../components/common/Input";

export default function TpoDriveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("applicants");

  const driveId = parseInt(id, 10);

  const { data: drives, isLoading: loadingDrives } = useQuery({
    queryKey: ["tpo-drives"],
    queryFn: async () => {
      const { data } = await tpoApi.getDrives();
      return data;
    },
  });

  const drive = drives?.find(d => d.id === driveId);

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
      queryClient.invalidateQueries(["tpo-applicants", driveId]);
    }
  });

  if (loadingDrives) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  if (!drive) return <div className="p-8 text-center text-red-500">Drive not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={drive.status === "open" ? "success" : "neutral"}>
              {drive.status.toUpperCase()}
            </Badge>
            <Badge variant="brand">{drive.test_status === "open" ? "Test Active" : "No Test"}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">{drive.role}</h1>
          <p className="text-slate-600 mt-1">Company ID: {drive.company_id} | Deadline: {new Date(drive.deadline).toLocaleString()}</p>
        </div>
        
        {drive.status === "open" && (
          <Button variant="danger" onClick={() => closeDriveMutation.mutate()} isLoading={closeDriveMutation.isPending}>
            Close Drive
          </Button>
        )}
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {[
          { id: "applicants", label: "Applicants", icon: FileText, count: applicants?.length },
          { id: "eligible", label: "Eligible Pool", icon: Users, count: eligibleStudents?.length },
          { id: "analytics", label: "Analytics", icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? "border-accent text-accent" 
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
              <p className="text-sm text-slate-600">Students matching the eligibility criteria ({drive.eligibility_criteria.min_cgpa} CGPA, max {drive.eligibility_criteria.max_backlogs} backlogs).</p>
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
      </div>
    </div>
  );
}
