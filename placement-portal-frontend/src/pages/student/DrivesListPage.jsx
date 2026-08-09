import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { drivesApi } from "../../api/drives.api";
import { studentApi } from "../../api/student.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import { Building2, Calendar, GraduationCap, DollarSign, CheckCircle2, Clock } from "lucide-react";

import { showConfirm, showToast, showError } from "../../utils/swal";

export default function DrivesListPage() {
  const [drives, setDrives] = useState([]);
  const [applicationsMap, setApplicationsMap] = useState(new Map());
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "applied"
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDrivesAndApps = async () => {
    try {
      setIsLoading(true);
      const [drivesRes, appsRes] = await Promise.all([
        drivesApi.getMatchedDrives(),
        studentApi.getApplications().catch(() => ({ data: [] })),
      ]);
      
      setDrives(drivesRes.data || []);

      const appMap = new Map();
      (appsRes.data || []).forEach((app) => {
        if (app.status !== "withdrawn") {
          appMap.set(app.drive_id, app);
        }
      });
      setApplicationsMap(appMap);
    } catch (err) {
      setError("Failed to fetch matched drives.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivesAndApps();
  }, []);

  const handleWithdraw = async (appId) => {
    const confirmed = await showConfirm({
      title: "Withdraw Application?",
      text: "Are you sure you want to withdraw this application? This action cannot be undone.",
      confirmButtonText: "Yes, Withdraw",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed) return;

    try {
      await studentApi.withdrawApplication(appId);
      await fetchDrivesAndApps();
      showToast("Application withdrawn successfully");
    } catch (err) {
      showError("Withdraw Failed", err.response?.data?.detail || "Failed to withdraw application.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-700 bg-red-50 rounded-xl border border-red-200">
        {error}
      </div>
    );
  }

  const upcomingDrives = drives.filter((d) => !applicationsMap.has(d.id));
  const appliedDrives = drives.filter((d) => applicationsMap.has(d.id));

  const displayedDrives = activeTab === "upcoming" ? upcomingDrives : appliedDrives;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Job List</h1>
        <p className="text-slate-600 mt-1">Placement opportunities matching your academic profile.</p>
      </div>

      {/* Tabs Header - Styled matching user image request */}
      <div className="flex items-center space-x-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex items-center font-bold text-base transition-colors ${
            activeTab === "upcoming"
              ? "text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Upcoming Jobs</span>
          <span className="ml-2 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
            {upcomingDrives.length}
          </span>
        </button>

        <span className="text-slate-300 font-light text-xl">|</span>

        <button
          onClick={() => setActiveTab("applied")}
          className={`flex items-center font-bold text-base transition-colors ${
            activeTab === "applied"
              ? "text-teal-600 border-b-2 border-teal-600 pb-3 -mb-3"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Applied Jobs</span>
          <span className="ml-2 w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold flex items-center justify-center">
            {appliedDrives.length}
          </span>
        </button>
      </div>

      {displayedDrives.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {activeTab === "upcoming" ? "No upcoming jobs available" : "No applied jobs yet"}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {activeTab === "upcoming"
              ? "You've applied to all available drives or no new placement drives match your criteria right now."
              : "You haven't applied to any drives yet. Switch to Upcoming Jobs to explore open opportunities!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedDrives.map((drive) => {
            const app = applicationsMap.get(drive.id);
            const hasApplied = !!app;
            const canWithdraw = hasApplied && ["applied", "eligible", "not_eligible"].includes(app.status);

            const ctcDisplay = drive.min_ctc && drive.max_ctc 
              ? `₹${drive.min_ctc} - ₹${drive.max_ctc} LPA`
              : drive.min_ctc 
                ? `₹${drive.min_ctc} LPA`
                : drive.max_ctc 
                  ? `Up to ₹${drive.max_ctc} LPA`
                  : null;

            return (
              <div key={drive.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-slate-600" />
                    </div>
                    {hasApplied ? (
                      <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {app.status.toUpperCase()}
                      </span>
                    ) : drive.status === "open" ? (
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">Open</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">Closed</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 font-heading line-clamp-1">{drive.role}</h3>
                  <p className="text-slate-600 text-sm font-medium mb-3 line-clamp-1">{drive.company?.name || "Partner Company"}</p>

                  {ctcDisplay && (
                    <p className="text-sm font-semibold text-emerald-600 mb-4 flex items-center gap-1.5 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg border border-emerald-100">
                      <DollarSign size={14} /> Offered CTC: {ctcDisplay}
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      Deadline: {new Date(drive.deadline).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Min CGPA: {drive.eligibility_criteria?.min_cgpa || "N/A"}
                    </div>
                    {hasApplied && app.applied_on && (
                      <div className="flex items-center text-xs text-teal-600 pt-1">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        Applied on: {new Date(app.applied_on).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between gap-2">
                  <Link to={`/student/drives/${drive.id}`} className="flex-1">
                    <Button className="w-full" variant={hasApplied ? "secondary" : "outline"}>
                      {hasApplied ? "View Applied Details" : "View Details & Apply"}
                    </Button>
                  </Link>
                  {canWithdraw && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleWithdraw(app.id)}
                      className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs px-2.5 py-1.5"
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
