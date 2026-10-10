import React, { useState, useEffect, useMemo } from "react";
import { studentApi } from "../../api/student.api";
import { 
  Briefcase, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar
} from "lucide-react";
import Button from "../../components/common/Button";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
  StaggerGrid,
  GlassCard,
  AnimatedCounter,
  InteractiveSearchBox,
  RevealOnScroll
} from "../../components/common/MotionKit";

import { showConfirm, showToast, showError } from "../../utils/swal";

export default function ApplicationsTrackerPage() {
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const res = await studentApi.getApplications();
      setApplications(res.data || []);
    } catch (err) {
      setError("Failed to fetch placement applications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
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
      await fetchApplications();
      showToast("Application withdrawn successfully");
    } catch (err) {
      showError("Withdraw Failed", err.response?.data?.detail || "Failed to withdraw.");
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "applied": return { icon: <Clock className="w-4 h-4" />, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
      case "eligible": return { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" };
      case "not_eligible": return { icon: <XCircle className="w-4 h-4" />, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" };
      case "shortlisted": return { icon: <ArrowRight className="w-4 h-4" />, color: "text-amber-800", bg: "bg-amber-100 border-amber-300 font-bold" };
      case "rejected": return { icon: <XCircle className="w-4 h-4" />, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" };
      case "selected": return { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300 font-bold" };
      case "withdrawn": return { icon: <AlertCircle className="w-4 h-4" />, color: "text-slate-500", bg: "bg-slate-100 border-slate-200" };
      default: return { icon: <Clock className="w-4 h-4" />, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
    }
  };

  const pipelineStages = [
    { key: "applied", label: "Applied" },
    { key: "eligible", label: "Eligible" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "test_cleared", label: "Test Cleared" },
    { key: "technical_round", label: "Technical" },
    { key: "hr_round", label: "HR" },
    { key: "offered", label: "Offered" },
  ];

  const getStageKey = (app) => {
    if (app.current_stage) return app.current_stage;
    if (app.status === "selected") return "offered";
    if (app.status === "shortlisted") return "shortlisted";
    if (app.status === "eligible") return "eligible";
    return "applied";
  };

  const getStageIndex = (app) => {
    const stage = getStageKey(app);
    const idx = pipelineStages.findIndex((item) => item.key === stage);
    return idx < 0 ? 0 : idx;
  };

  // Metrics
  const totalCount = applications.length;
  const shortlistedCount = applications.filter(a => a.status === "shortlisted").length;
  const offeredCount = applications.filter(a => a.status === "selected").length;
  const inProgressCount = applications.filter(a => ["applied", "eligible"].includes(a.status)).length;

  const filterChips = [
    { id: "all", label: "All Applications", count: totalCount },
    { id: "shortlisted", label: "Shortlisted", count: shortlistedCount },
    { id: "offered", label: "Offered / Selected", count: offeredCount },
    { id: "in_progress", label: "Under Review", count: inProgressCount },
  ];

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (app.drive?.role || "").toLowerCase().includes(q) ||
        (app.drive?.company?.name || "").toLowerCase().includes(q) ||
        (app.status || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "shortlisted") return app.status === "shortlisted";
      if (statusFilter === "offered") return app.status === "selected";
      if (statusFilter === "in_progress") return ["applied", "eligible"].includes(app.status);

      return true;
    });
  }, [applications, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
              <span>Multi-Round Recruitment Funnel</span>
            </span>
            <LiveStatusBeacon label="PIPELINE SYNCHRONIZED" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Placement Application Tracker" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Live telemetry of all submitted corporate placement applications, interview rounds, and offer statuses.
          </p>
        </div>
      </div>

      {/* ════════════ STUDENT LIVE TICKER RIBBON ════════════ */}
      <StudentTickerRibbon />

      {/* ════════════ TELEMETRY METRIC SUMMARY CARDS ════════════ */}
      <StaggerGrid columns="grid-cols-2 lg:grid-cols-4" gap="gap-4">
        <GlassCard className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applied</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Briefcase size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            <AnimatedCounter target={totalCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Submitted applications</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Shortlisted</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Sparkles size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-amber-600 font-mono">
            <AnimatedCounter target={shortlistedCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Selected for interviews</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Under Review</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-indigo-600 font-mono">
            <AnimatedCounter target={inProgressCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Eligibility review phase</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Offers Extended</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono">
            <AnimatedCounter target={offeredCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Confirmed selections</p>
        </GlassCard>
      </StaggerGrid>

      {/* ════════════ SEARCH & FILTER BAR ════════════ */}
      <RevealOnScroll direction="up" delay={0.05}>
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <InteractiveSearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search applications by role title or hiring company..."
            chips={filterChips}
            activeChip={statusFilter}
            onChipClick={setStatusFilter}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong>{filteredApplications.length}</strong> submitted application tracks
            </span>
            <span>You can withdraw active applications prior to reaching shortlisted status</span>
          </div>
        </div>
      </RevealOnScroll>

      {/* ════════════ APPLICATIONS TABLE / EMPTY STATE ════════════ */}
      {filteredApplications.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 p-16 text-center">
          <Briefcase className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No applications match your criteria</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            You haven't submitted applications matching this filter. Head over to Campus Placement Drives to apply!
          </p>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-emerald-50/30 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Company &amp; Role</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">Multi-Stage Funnel Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredApplications.map((app) => {
                  const statusConf = getStatusConfig(app.status);
                  const canWithdraw = ["applied", "eligible", "not_eligible"].includes(app.status);
                  
                  return (
                    <tr key={app.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Building2 size={18} className="text-slate-600" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {app.drive?.role || "Role"}
                            </div>
                            <div className="text-slate-500 text-xs mt-0.5">
                              {app.drive?.company?.name || "Company"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{new Date(app.applied_on).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-2.5">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold font-mono ${statusConf.bg} ${statusConf.color}`}>
                            {React.cloneElement(statusConf.icon, { className: "w-3.5 h-3.5 mr-1.5" })}
                            <span>{app.status.toUpperCase()}</span>
                          </div>

                          {/* Progressive Stage Stepper */}
                          <div className="flex items-center gap-1.5">
                            {pipelineStages.map((stage, index) => {
                              const currentIndex = getStageIndex(app);
                              const isReached = index <= currentIndex;
                              return (
                                <div key={`${app.id}-${stage.key}`} className="flex items-center gap-1.5 group/step relative">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                                      isReached
                                        ? "bg-emerald-500 ring-2 ring-emerald-200"
                                        : "bg-slate-200"
                                    }`}
                                    title={stage.label}
                                  />
                                  {index < pipelineStages.length - 1 && (
                                    <span
                                      className={`h-[2px] w-3.5 transition-all ${
                                        isReached && index < currentIndex
                                          ? "bg-emerald-400"
                                          : "bg-slate-200"
                                      }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {canWithdraw ? (
                          <button
                            type="button"
                            onClick={() => handleWithdraw(app.id)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
                          >
                            Withdraw
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold px-2 py-1 bg-slate-100 rounded-lg">
                            Locked
                          </span>
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
