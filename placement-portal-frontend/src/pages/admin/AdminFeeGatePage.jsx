import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import { showConfirm, showSuccess, showError, showToast } from "../../utils/swal";
import {
  AnimatedWords,
  LiveStatusBeacon,
  RevealOnScroll,
  GlassCard,
  AnimatedCounter,
} from "../../components/admin/AdminMotion";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  FileQuestion,
  Calendar,
  AlertTriangle,
  Briefcase,
  FileText,
  Sparkles,
  Brain,
  Wand2,
  TrendingUp,
  Award,
  Save,
  RotateCcw,
  Info,
  Lock,
  Unlock,
} from "lucide-react";

export default function AdminFeeGatePage() {
  const queryClient = useQueryClient();

  const [toggles, setToggles] = useState({
    browse_drives: true,
    apply_to_drives: false,
    official_tests: false,
    practice_tests: true,
    mock_interview_gen: true,
    mock_interview_drive: false,
    resume_analyzer: true,
    resume_enhancer: true,
    career_insights: true,
  });

  const [deadline, setDeadline] = useState("");
  const [clearDeadlineFlag, setClearDeadlineFlag] = useState(false);

  // Fetch current config
  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["adminFeeGateConfig"],
    queryFn: () => adminApi.getFeeGateConfig().then((res) => res.data),
  });

  // Fetch aggregate stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["adminFeeGateStats"],
    queryFn: () => adminApi.getFeeGateStats().then((res) => res.data),
  });

  useEffect(() => {
    if (configData) {
      setToggles({
        browse_drives: Boolean(configData.browse_drives),
        apply_to_drives: Boolean(configData.apply_to_drives),
        official_tests: Boolean(configData.official_tests),
        practice_tests: Boolean(configData.practice_tests),
        mock_interview_gen: Boolean(configData.mock_interview_gen),
        mock_interview_drive: Boolean(configData.mock_interview_drive),
        resume_analyzer: Boolean(configData.resume_analyzer),
        resume_enhancer: Boolean(configData.resume_enhancer),
        career_insights: Boolean(configData.career_insights),
      });

      if (configData.verification_deadline) {
        // Format to YYYY-MM-DDThh:mm for datetime-local input
        const d = new Date(configData.verification_deadline);
        const pad = (n) => String(n).padStart(2, "0");
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDeadline(formatted);
      } else {
        setDeadline("");
      }
      setClearDeadlineFlag(false);
    }
  }, [configData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => adminApi.updateFeeGateConfig(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(["adminFeeGateConfig"], res.data);
      queryClient.invalidateQueries(["adminFeeGateConfig"]);
      showSuccess("Policy Saved", "Fee gate access policy updated successfully.");
    },
    onError: (err) => {
      showError(
        "Update Failed",
        err.response?.data?.detail || "Could not save fee gate configuration."
      );
    },
  });

  const handleToggle = async (key, currentVal, isGroup2 = false, label = "") => {
    const nextVal = !currentVal;
    if (isGroup2 && nextVal === true) {
      const confirmed = await showConfirm(
        `Allow Unverified Students to ${label}?`,
        `Enabling this allows students who have NOT verified their placement fee to perform this high-stakes action. Are you sure you want to proceed?`,
        "Yes, enable toggle"
      );
      if (!confirmed) return;
    }
    setToggles((prev) => ({ ...prev, [key]: nextVal }));
  };

  const handleClearDeadline = () => {
    setDeadline("");
    setClearDeadlineFlag(true);
    showToast("Deadline cleared (remember to click Save)");
  };

  const handleSave = () => {
    const payload = {
      ...toggles,
    };

    if (clearDeadlineFlag) {
      payload.clear_deadline = true;
      payload.verification_deadline = null;
    } else if (deadline) {
      const selected = new Date(deadline);
      if (selected <= new Date()) {
        showError("Invalid Deadline", "The verification deadline must be a future date and time.");
        return;
      }
      payload.verification_deadline = selected.toISOString();
      payload.clear_deadline = false;
    }

    saveMutation.mutate(payload);
  };

  if (isLoadingConfig || isLoadingStats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = statsData || {
    total_students: 0,
    verified_count: 0,
    pending_review_count: 0,
    rejected_count: 0,
    unsubmitted_count: 0,
  };

  const prepTools = [
    {
      key: "browse_drives",
      label: "Browse Placement Drives",
      desc: "Allow unverified students to view active campus drives, company roles, CTC packages, and job descriptions in read-only mode.",
      icon: Briefcase,
    },
    {
      key: "practice_tests",
      label: "Self-Practice Skill Drills",
      desc: "Allow unverified students to attempt non-evaluative practice tests and private question drills.",
      icon: Sparkles,
    },
    {
      key: "mock_interview_gen",
      label: "General AI Mock Interviews",
      desc: "Allow unverified students to practice generic technical and HR mock interview sessions with Groq AI.",
      icon: Brain,
    },
    {
      key: "resume_analyzer",
      label: "ATS Resume Diagnostic",
      desc: "Allow unverified students to upload their resume and receive calibrated 4-pillar scores and suggestions.",
      icon: FileText,
    },
    {
      key: "resume_enhancer",
      label: "AI Resume Enhancer",
      desc: "Allow unverified students to rewrite their bullet points using Google's X-Y-Z formula.",
      icon: Wand2,
    },
    {
      key: "career_insights",
      label: "Live Career Insights",
      desc: "Allow unverified students to explore market trends, salary intelligence, and trending industry skills.",
      icon: TrendingUp,
    },
  ];

  const placementActions = [
    {
      key: "apply_to_drives",
      label: "Apply to Campus Drives",
      desc: "Allow unverified students to formally submit applications to active recruitment drives.",
      icon: Briefcase,
    },
    {
      key: "official_tests",
      label: "Official Drive Assessments",
      desc: "Allow unverified students to launch mandatory proctored assessment rounds associated with recruitment drives.",
      icon: Award,
    },
    {
      key: "mock_interview_drive",
      label: "Drive-Specific Mock Interviews",
      desc: "Allow unverified students to launch mock interview drills tailored to specific registered placement drives.",
      icon: Brain,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 font-sans">
      {/* ════════════ HEADER SECTION ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-600" />
              <span>Campus Governance &amp; Access Policy</span>
            </span>
            <LiveStatusBeacon label="POLICY ACTIVE" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Fee Gate Configuration" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Control which portal features students can access before their placement registration fee is verified by AI OCR or your TPO.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            isLoading={saveMutation.isPending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold text-xs px-5 py-2.5 rounded-xl active:scale-95"
          >
            <Save size={15} />
            <span>Save Configuration</span>
          </Button>
        </div>
      </div>

      {/* ════════════ SUMMARY STATS TELEMETRY ROW ════════════ */}
      <RevealOnScroll direction="up" delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Students</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Users size={18} />
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
              <AnimatedCounter target={stats.total_students} />
            </div>
            <p className="text-xs text-slate-400 mt-1">Registered campus candidates</p>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fee Verified</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono">
              <AnimatedCounter target={stats.verified_count} />
            </div>
            <p className="text-xs text-emerald-700 mt-1">Cleared for all drives</p>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock size={18} />
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-amber-600 font-mono">
              <AnimatedCounter target={stats.pending_review_count} />
            </div>
            <p className="text-xs text-amber-700 mt-1">Queued for TPO review</p>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unsubmitted</span>
              <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <FileQuestion size={18} />
              </span>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-700 font-mono">
              <AnimatedCounter target={stats.unsubmitted_count} />
            </div>
            <p className="text-xs text-slate-400 mt-1">No receipt uploaded yet</p>
          </GlassCard>
        </div>
      </RevealOnScroll>

      {/* ════════════ VERIFICATION DEADLINE SECTION ════════════ */}
      <RevealOnScroll direction="up" delay={0.08}>
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Calendar size={22} className="text-amber-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Placement Season Verification Deadline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                Students who have not had their fee verified by this deadline will be locked from all gated features, even if individual feature toggles are enabled below. Leave blank for no automatic deadline cutoff.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setClearDeadlineFlag(false);
              }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all max-w-xs"
            />

            {deadline && (
              <button
                type="button"
                onClick={handleClearDeadline}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 w-fit"
              >
                <RotateCcw size={13} />
                <span>Clear Deadline</span>
              </button>
            )}

            {configData?.verification_deadline && !clearDeadlineFlag && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Active Deadline: <strong>{new Date(configData.verification_deadline).toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      </RevealOnScroll>

      {/* ════════════ FEATURE ACCESS TOGGLES ════════════ */}
      <div className="space-y-6">
        {/* GROUP 1: PREPARATION TOOLS */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <Sparkles size={18} className="text-blue-600" />
                <span>Group 1 — Preparation &amp; Diagnostic Tools</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Recommended ON by default so unverified students can still sharpen their skills while fee clearance is being processed.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase font-mono">
              Safe Prep Features
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {prepTools.map((tool) => {
              const Icon = tool.icon;
              const isEnabled = toggles[tool.key];

              return (
                <div key={tool.key} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${isEnabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                        <span>{tool.label}</span>
                        {isEnabled ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Accessible
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            Locked
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-2xl">
                        {tool.desc}
                      </p>
                    </div>
                  </div>

                  {/* Modern Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggle(tool.key, isEnabled, false, tool.label)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* GROUP 2: PLACEMENT ACTIONS */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-amber-200/90 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="border-b border-amber-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <span>Group 2 — High-Stakes Placement Actions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Recommended OFF by default. Only fee-verified students should typically be allowed to submit applications or sit for drive rounds.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase font-mono">
              Restricted Actions
            </span>
          </div>

          <div className="divide-y divide-amber-100/60">
            {placementActions.map((action) => {
              const Icon = action.icon;
              const isEnabled = toggles[action.key];

              return (
                <div key={action.key} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${isEnabled ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                        <span>{action.label}</span>
                        {isEnabled ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Unlock size={11} /> Unlocked for Unverified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock size={11} /> Strictly Gated (Verified Only)
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-2xl">
                        {action.desc}
                      </p>
                    </div>
                  </div>

                  {/* Modern Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggle(action.key, isEnabled, true, action.label)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? "bg-amber-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════ SAVE BUTTON & AUDIT FOOTER ════════════ */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
        <div className="text-xs text-slate-400">
          {configData?.updated_at && (
            <span>
              Last updated: <strong>{new Date(configData.updated_at).toLocaleString()}</strong>
              {configData.updated_by_name && <span> by <strong>{configData.updated_by_name}</strong></span>}
            </span>
          )}
        </div>

        <Button
          onClick={handleSave}
          isLoading={saveMutation.isPending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold text-xs px-6 py-3 rounded-xl active:scale-95"
        >
          <Save size={16} />
          <span>Save Fee Gate Configuration</span>
        </Button>
      </div>
    </div>
  );
}
