import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { drivesApi } from "../../api/drives.api";
import { studentApi } from "../../api/student.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import { 
  Building2, 
  Calendar, 
  GraduationCap, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
  StaggerGrid,
  InteractiveSearchBox,
  InteractiveTabSwitcher,
  RevealOnScroll
} from "../../components/common/MotionKit";

import { showConfirm, showToast, showError } from "../../utils/swal";

export default function DrivesListPage() {
  const [drives, setDrives] = useState([]);
  const [applicationsMap, setApplicationsMap] = useState(new Map());
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "applied"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all");
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
      setError("Failed to fetch matched placement drives.");
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

  const upcomingDrives = useMemo(() => drives.filter((d) => !applicationsMap.has(d.id)), [drives, applicationsMap]);
  const appliedDrives = useMemo(() => drives.filter((d) => applicationsMap.has(d.id)), [drives, applicationsMap]);

  const activeDrivesPool = activeTab === "upcoming" ? upcomingDrives : appliedDrives;

  const filterChips = [
    { id: "all", label: "All Drives", count: activeDrivesPool.length },
    { id: "open", label: "Open & Accepting", count: activeDrivesPool.filter(d => d.status === "open").length },
    { id: "tier1", label: "High CTC (≥ 10 LPA)", count: activeDrivesPool.filter(d => (d.max_ctc || d.min_ctc || 0) >= 10).length },
    { id: "tier2", label: "Standard (≥ 5 LPA)", count: activeDrivesPool.filter(d => (d.max_ctc || d.min_ctc || 0) >= 5).length },
  ];

  const displayedDrives = useMemo(() => {
    return activeDrivesPool.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (d.role || "").toLowerCase().includes(q) ||
        (d.company?.name || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const ctcVal = d.max_ctc || d.min_ctc || 0;
      if (filterMode === "open") return d.status === "open";
      if (filterMode === "tier1") return ctcVal >= 10;
      if (filterMode === "tier2") return ctcVal >= 5;

      return true;
    });
  }, [activeDrivesPool, searchQuery, filterMode]);

  const tabs = [
    { id: "upcoming", label: "Upcoming Drives", count: upcomingDrives.length, icon: Briefcase },
    { id: "applied", label: "Applied Drives", count: appliedDrives.length, icon: CheckCircle2 },
  ];

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-rose-700 bg-rose-50 rounded-2xl border border-rose-200">
        <p className="font-bold">Error loading drives</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ════════════ TOPBAR & KINETIC HEADER ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <Briefcase size={13} className="text-emerald-600" />
              <span>Campus Recruitment Opportunities</span>
            </span>
            <LiveStatusBeacon label="RECRUITMENT WINDOW OPEN" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Campus Placement Drives" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Explore corporate campus drives matching your departmental branch, CGPA, and placement readiness criteria.
          </p>
        </div>
      </div>

      {/* ════════════ STUDENT LIVE TICKER RIBBON ════════════ */}
      <StudentTickerRibbon />

      {/* ════════════ TABS SWITCHER ════════════ */}
      <div className="flex justify-start">
        <InteractiveTabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* ════════════ INTERACTIVE SEARCH & FILTER BOX ════════════ */}
      <RevealOnScroll direction="up" delay={0.05}>
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <InteractiveSearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search drives by job role, hiring company, tech stack, or location..."
            chips={filterChips}
            activeChip={filterMode}
            onChipClick={setFilterMode}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong>{displayedDrives.length}</strong> {activeTab === "upcoming" ? "upcoming" : "applied"} placement opportunities
            </span>
            <span>Check eligibility criteria before submitting your application</span>
          </div>
        </div>
      </RevealOnScroll>

      {/* ════════════ DRIVES GRID / EMPTY STATE ════════════ */}
      {displayedDrives.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 p-16 text-center">
          <Building2 className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {activeTab === "upcoming" ? "No upcoming jobs matching filter" : "No applied jobs matching filter"}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {activeTab === "upcoming"
              ? "You have applied to all available drives or no new placement drives match your active filter."
              : "You haven't submitted applications matching this filter. Switch to Upcoming Jobs to discover open roles!"}
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
              <div
                key={drive.id}
                className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between group overflow-hidden"
              >
                <div className="p-6 flex-1 space-y-4">
                  {/* Company Avatar & Status Badge */}
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-emerald-50 rounded-2xl flex items-center justify-center border border-slate-200/80 group-hover:scale-105 transition-transform shrink-0">
                      <Building2 className="w-6 h-6 text-emerald-700" />
                    </div>

                    {hasApplied ? (
                      <span className="px-3 py-1 bg-teal-50 text-teal-800 text-xs font-bold rounded-full border border-teal-200 flex items-center gap-1.5 font-mono">
                        <CheckCircle2 size={13} className="text-teal-600" />
                        <span>{app.status.toUpperCase()}</span>
                      </span>
                    ) : drive.status === "open" ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                        Open
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
                        Closed
                      </span>
                    )}
                  </div>

                  {/* Role Title & Company */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-heading line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {drive.role}
                    </h3>
                    <p className="text-slate-600 text-sm font-semibold mt-0.5 line-clamp-1">
                      {drive.company?.name || "Partner Company"}
                    </p>
                  </div>

                  {/* CTC Package */}
                  {ctcDisplay && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold font-mono">
                      <DollarSign size={13} />
                      <span>CTC: {ctcDisplay}</span>
                    </div>
                  )}
                  
                  {/* Metadata Row */}
                  <div className="space-y-2 pt-1 text-xs text-slate-500 border-t border-slate-100">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Deadline: <strong>{new Date(drive.deadline).toLocaleDateString()}</strong></span>
                    </div>
                    <div className="flex items-center">
                      <GraduationCap className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Cutoff: <strong>{drive.eligibility_criteria?.min_cgpa ? `${drive.eligibility_criteria.min_cgpa} CGPA` : "No Cutoff"}</strong></span>
                    </div>
                    {hasApplied && app.applied_on && (
                      <div className="flex items-center text-teal-700 font-medium">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                        <span>Applied on: {new Date(app.applied_on).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Footer Action Buttons */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex items-center justify-between gap-2">
                  <Link to={`/student/drives/${drive.id}`} className="flex-1">
                    <button
                      type="button"
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 ${
                        hasApplied
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                      }`}
                    >
                      <span>{hasApplied ? "View Application" : "View Details & Apply"}</span>
                      <ArrowRight size={13} />
                    </button>
                  </Link>

                  {canWithdraw && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(app.id)}
                      className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold px-2.5 py-2 rounded-xl transition-colors"
                      title="Withdraw your active application"
                    >
                      Withdraw
                    </button>
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
