import React, { useState, useEffect } from "react";
import { studentApi } from "../../api/student.api";
import { Briefcase, AlertCircle, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Button from "../../components/common/Button";

export default function ApplicationsTrackerPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const res = await studentApi.getApplications();
      setApplications(res.data);
    } catch (err) {
      setError("Failed to fetch applications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (appId) => {
    if (!window.confirm("Are you sure you want to withdraw this application? This action cannot be undone.")) return;
    try {
      await studentApi.withdrawApplication(appId);
      await fetchApplications(); // refresh
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to withdraw.");
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "applied": return { icon: <Clock className="w-5 h-5" />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
      case "eligible": return { icon: <CheckCircle2 className="w-5 h-5" />, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" };
      case "not_eligible": return { icon: <XCircle className="w-5 h-5" />, color: "text-red-600", bg: "bg-red-50 border-red-200" };
      case "shortlisted": return { icon: <ArrowRight className="w-5 h-5" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
      case "rejected": return { icon: <XCircle className="w-5 h-5" />, color: "text-red-600", bg: "bg-red-50 border-red-200" };
      case "selected": return { icon: <CheckCircle2 className="w-5 h-5" />, color: "text-green-600", bg: "bg-green-50 border-green-200" };
      case "withdrawn": return { icon: <AlertCircle className="w-5 h-5" />, color: "text-slate-500", bg: "bg-slate-100 border-slate-200" };
      default: return { icon: <Clock className="w-5 h-5" />, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">My Applications</h1>
        <p className="text-slate-600 mt-1">Track the status of your placement drive applications.</p>
      </div>

      {error && <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>}

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No applications yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            You haven't applied to any drives. Check the Drives list to see matching opportunities.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Company & Role</th>
                  <th className="px-6 py-4 font-medium">Applied On</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {applications.map((app) => {
                  const statusConf = getStatusConfig(app.status);
                  // Withdrawal is allowed only before it reaches 'shortlisted' (i.e. 'applied' or 'eligible' or 'not_eligible')
                  // Spec: "student can withdraw an application any time before it reaches shortlisted"
                  const canWithdraw = ["applied", "eligible", "not_eligible"].includes(app.status);
                  
                  return (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{app.drive?.role || "Role"}</div>
                        <div className="text-slate-500 text-xs mt-1">{app.drive?.company?.name || "Company"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {new Date(app.applied_on).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full border ${statusConf.bg} ${statusConf.color}`}>
                          {React.cloneElement(statusConf.icon, { className: "w-3.5 h-3.5 mr-1.5" })}
                          <span className="text-xs font-semibold uppercase">{app.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {canWithdraw ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleWithdraw(app.id)}
                            className="text-slate-500 hover:text-red-600"
                          >
                            Withdraw
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
