import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import { showConfirm, showSuccess, showError } from "../../utils/swal";
import { getAccessToken } from "../../utils/tokenStorage";
import {
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Search,
  Filter,
  Users,
  ShieldAlert,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  ShieldCheck,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StaggerGrid,
  GlassCard,
  AnimatedCounter,
  InteractiveSearchBox,
  RevealOnScroll
} from "../../components/common/MotionKit";

export default function TpoFeeReviewPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fetch pending review receipts
  const { data: receipts = [], isLoading, isError, error } = useQuery({
    queryKey: ["tpoPendingFeeReceipts"],
    queryFn: () => tpoApi.getPendingFeeReceipts().then((res) => res.data),
  });

  const approveMutation = useMutation({
    mutationFn: (receiptId) => tpoApi.approveFeeReceipt(receiptId),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpoPendingFeeReceipts"]);
      setSelectedReceipt(null);
      showSuccess("Receipt Approved", "Student placement fee has been verified. The student can now apply to drives.");
    },
    onError: (err) => {
      showError("Approval Failed", err.response?.data?.detail || "Could not approve receipt.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ receiptId, reason }) => tpoApi.rejectFeeReceipt(receiptId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpoPendingFeeReceipts"]);
      setSelectedReceipt(null);
      setShowRejectModal(false);
      setRejectReason("");
      showSuccess("Receipt Rejected", "The student has been notified with your feedback.");
    },
    onError: (err) => {
      showError("Rejection Failed", err.response?.data?.detail || "Could not reject receipt.");
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids) => tpoApi.bulkApproveFeeReceipts({ receipt_ids: ids }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["tpoPendingFeeReceipts"]);
      setSelectedIds(new Set());
      showSuccess(
        "Bulk Approval Complete",
        res.data?.message || `${res.data?.approved_count || 0} fee receipts have been approved.`
      );
    },
    onError: (err) => {
      showError("Bulk Approval Failed", err.response?.data?.detail || "Could not bulk approve receipts.");
    },
  });

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredReceipts.length && filteredReceipts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReceipts.map((r) => r.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmed = await showConfirm(
      `Approve ${count} Fee Receipt${count > 1 ? "s" : ""}?`,
      `This will mark ${count} student fee receipt(s) as verified and immediately unlock placement drives for them.`,
      "Yes, approve selected"
    );
    if (confirmed) {
      bulkApproveMutation.mutate(Array.from(selectedIds));
    }
  };

  // KPI telemetry calculations
  const totalPending = receipts.length;
  const highConfidenceCount = receipts.filter(r => (r.ai_confidence || 0) >= 0.8).length;
  const lowConfidenceCount = receipts.filter(r => (r.ai_confidence || 0) < 0.8).length;
  const deviationCount = receipts.filter(r => r.structural_match_result && !r.structural_match_result.matched).length;

  const filterChips = [
    { id: "all", label: "All Submissions", count: totalPending },
    { id: "high_confidence", label: "High AI Confidence (≥80%)", count: highConfidenceCount },
    { id: "audit_flagged", label: "Low AI Score (<80%)", count: lowConfidenceCount },
    { id: "deviations", label: "Structural Deviations", count: deviationCount },
  ];

  const filteredReceipts = useMemo(() => {
    return receipts.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (item.student_name || "").toLowerCase().includes(query) ||
        (item.student_email || "").toLowerCase().includes(query) ||
        (item.roll_number || "").toLowerCase().includes(query) ||
        (item.branch || "").toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const conf = item.ai_confidence || 0;
      if (filterMode === "high_confidence") return conf >= 0.8;
      if (filterMode === "audit_flagged") return conf < 0.8;
      if (filterMode === "deviations") return item.structural_match_result && !item.structural_match_result.matched;

      return true;
    });
  }, [receipts, searchQuery, filterMode]);

  const handleApprove = async (receipt) => {
    const confirmed = await showConfirm(
      "Approve Fee Receipt?",
      `This will mark ${receipt.student_name}'s fee receipt as verified and immediately unlock drive applications.`,
      "Yes, approve receipt"
    );
    if (confirmed) {
      approveMutation.mutate(receipt.id);
    }
  };

  const openRejectModal = (receipt) => {
    setSelectedReceipt(receipt);
    setRejectReason("The uploaded receipt is blurry or does not match institutional records.");
    setShowRejectModal(true);
  };

  const submitReject = () => {
    if (!selectedReceipt) return;
    rejectMutation.mutate({
      receiptId: selectedReceipt.id,
      reason: rejectReason.trim(),
    });
  };

  const getMediaUrl = (filePath) => {
    if (!filePath) return null;
    const cleanPath = filePath.replace("uploads/", "").replace("uploads\\", "").replace("\\", "/");
    const token = getAccessToken() || "";
    return `http://localhost:8000/uploads/${cleanPath}?token=${token}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ════════════ TOPBAR & KINETIC HEADER ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-600" />
              <span>AI Vision & OCR Audit Pipeline</span>
            </span>
            <LiveStatusBeacon label="QUEUE ACTIVE" variant="active" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Placement Fee Verification Queue" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Audit student fee payments flagged by AI OCR heuristics due to low confidence scores or structural deviations from college templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold font-mono">
            {receipts.length} PENDING REVIEW
          </span>
        </div>
      </div>

      {/* ════════════ KPI SUMMARY CARDS ════════════ */}
      <StaggerGrid columns="grid-cols-2 lg:grid-cols-4" gap="gap-4">
        <GlassCard className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileCheck2 size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono">
            <AnimatedCounter target={totalPending} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Receipts in triage queue</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">High Confidence</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono">
            <AnimatedCounter target={highConfidenceCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">AI score ≥ 80%</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Requires Audit</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-amber-600 font-mono">
            <AnimatedCounter target={lowConfidenceCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">AI score &lt; 80%</p>
        </GlassCard>

        <GlassCard className="p-5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Deviations Flagged</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert size={18} />
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-rose-600 font-mono">
            <AnimatedCounter target={deviationCount} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Template mismatches</p>
        </GlassCard>
      </StaggerGrid>

      {/* ════════════ SEARCH & FILTER BAR ════════════ */}
      <RevealOnScroll direction="up" delay={0.05}>
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <InteractiveSearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by student name, roll number, email, or department branch..."
            chips={filterChips}
            activeChip={filterMode}
            onChipClick={setFilterMode}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong>{filteredReceipts.length}</strong> of {receipts.length} submissions
              </span>
              {filteredReceipts.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5 cursor-pointer ml-2"
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={filteredReceipts.length > 0 && selectedIds.size === filteredReceipts.length}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                  />
                  <span>
                    {selectedIds.size === filteredReceipts.length
                      ? "Deselect All"
                      : `Select All Filtered (${filteredReceipts.length})`}
                  </span>
                </button>
              )}
            </div>
            <span>Click &ldquo;Compare &amp; Review&rdquo; to audit against official template</span>
          </div>
        </div>
      </RevealOnScroll>

      {/* ════════════ RECEIPT CARDS GRID / EMPTY STATE ════════════ */}
      {filteredReceipts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-16 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-200">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-heading">No Pending Verifications</h3>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            {searchQuery
              ? "No student receipts match your search filter criteria."
              : "All submitted placement fee receipts have been verified or resolved. Your verification triage is clear!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReceipts.map((item) => {
            const confidencePct = Math.round((item.ai_confidence || 0) * 100);
            const isTemplateMatched = !!item.matched_against_template_id;
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white/90 backdrop-blur-md p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30"
                    : "border-slate-200/90 hover:border-blue-400"
                }`}
              >
                <div className="space-y-4">
                  {/* Student Info Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        aria-label={`Select ${item.student_name}`}
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-700 transition-colors truncate">
                          {item.student_name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{item.student_email}</p>
                        {item.roll_number && (
                          <p className="text-xs font-mono font-bold text-blue-600 mt-1">
                            Roll: {item.roll_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono shrink-0 ${
                        confidencePct >= 80
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : confidencePct >= 60
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      AI: {confidencePct}%
                    </span>
                  </div>

                  {item.branch && (
                    <div className="inline-block bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-semibold border border-slate-200/60">
                      {item.branch}
                    </div>
                  )}

                  {/* AI Diagnostic Summary Box */}
                  <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-200/60">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Verification Mode:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                        {isTemplateMatched
                          ? (item.template_name ? `Matched: ${item.template_name}` : "Template-Matched (Path B)")
                          : "General Heuristics (Path A)"}
                      </span>
                    </div>

                    {item.structural_match_result && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Structural Template:</span>
                        <span
                          className={`font-bold ${
                            item.structural_match_result.matched ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {item.structural_match_result.matched ? "Matched Structure" : "Deviation Flagged"}
                        </span>
                      </div>
                    )}

                    {item.ai_reason && (
                      <p className="text-slate-600 italic text-xs pt-1 line-clamp-2 border-t border-slate-200">
                        &ldquo;{item.ai_reason}&rdquo;
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock size={12} className="text-slate-400" />
                    <span>
                      Submitted {item.created_at ? format(new Date(item.created_at), "PPP p") : "recently"}
                    </span>
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-5 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                    onClick={() => setSelectedReceipt(item)}
                  >
                    <Eye size={14} className="text-blue-600" />
                    <span>Compare</span>
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
                    onClick={() => handleApprove(item)}
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all shadow-xs active:scale-95"
                    onClick={() => openRejectModal(item)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════ SIDE-BY-SIDE REVIEW MODAL ════════════ */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-900 to-blue-950 text-white shrink-0">
              <div>
                <h2 className="text-lg font-bold font-heading flex items-center gap-2.5">
                  <FileCheck2 className="text-blue-400" size={22} />
                  <span>Review Fee Receipt: {selectedReceipt.student_name}</span>
                </h2>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  {selectedReceipt.student_email} • Roll: {selectedReceipt.roll_number || "N/A"} • Branch:{" "}
                  {selectedReceipt.branch || "General"}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-white/70 hover:text-white text-2xl font-bold p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {/* AI Structured Diagnostic Card */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/70 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Groq Vision &amp; OCR Verification Verdict</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 font-semibold">Confidence Score:</span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold font-mono ${
                        (selectedReceipt.ai_confidence || 0) >= 0.8
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : (selectedReceipt.ai_confidence || 0) >= 0.6
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {Math.round((selectedReceipt.ai_confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Structural Match Evaluation */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">1. Structural / Template Match</span>
                      {selectedReceipt.structural_match_result ? (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            selectedReceipt.structural_match_result.matched
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {selectedReceipt.structural_match_result.matched ? "Matched" : "Deviation Found"}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">Path A (No Template)</span>
                      )}
                    </div>
                    <p className="text-slate-600 pt-1 leading-relaxed">
                      {selectedReceipt.structural_match_result?.details ||
                        "No college reference template was configured when this receipt was submitted; verified via general heuristic plausibility."}
                    </p>
                  </div>

                  {/* Content Validity Evaluation */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">2. Content &amp; Payment Validity</span>
                      {selectedReceipt.content_valid_result ? (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            selectedReceipt.content_valid_result.valid
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {selectedReceipt.content_valid_result.valid ? "Valid Details" : "Incomplete/Questionable"}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold">Standard Check</span>
                      )}
                    </div>
                    <p className="text-slate-600 pt-1 leading-relaxed">
                      {selectedReceipt.content_valid_result?.details ||
                        "Standard OCR integrity analysis: checked for payment amount, transaction reference ID, and date."}
                    </p>
                  </div>
                </div>

                {selectedReceipt.ai_reason && (
                  <div className="pt-2 text-xs text-slate-700 bg-white/70 p-3 rounded-xl border border-blue-200/60">
                    <span className="font-bold text-slate-900">AI Diagnostic Commentary: </span>
                    <span>{selectedReceipt.ai_reason}</span>
                  </div>
                )}
              </div>

              {/* Side-by-Side Comparison Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel: Student Uploaded Receipt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>Student&apos;s Submitted Receipt</span>
                    </h4>
                    {getMediaUrl(selectedReceipt.file_path) && (
                      <a
                        href={getMediaUrl(selectedReceipt.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink size={12} />
                        <span>Open in New Tab</span>
                      </a>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 h-[420px] flex items-center justify-center overflow-hidden shadow-xs">
                    {selectedReceipt.file_path.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={getMediaUrl(selectedReceipt.file_path)}
                        title="Student Receipt PDF"
                        className="w-full h-full rounded-xl border-0 bg-white"
                      />
                    ) : (
                      <img
                        src={getMediaUrl(selectedReceipt.file_path)}
                        alt="Student Receipt"
                        className="max-h-full max-w-full object-contain rounded-xl shadow-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Right Panel: Official College Reference Template */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {selectedReceipt.template_name
                          ? `Official Reference: ${selectedReceipt.template_name}`
                          : "Official College Reference Template"}
                      </span>
                    </h4>
                    {selectedReceipt.template_file_path && (
                      <a
                        href={getMediaUrl(selectedReceipt.template_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink size={12} />
                        <span>Open in New Tab</span>
                      </a>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3 h-[420px] flex items-center justify-center overflow-hidden shadow-xs">
                    {selectedReceipt.template_file_path ? (
                      selectedReceipt.template_file_path.toLowerCase().endsWith(".pdf") ? (
                        <iframe
                          src={getMediaUrl(selectedReceipt.template_file_path)}
                          title="Reference Template PDF"
                          className="w-full h-full rounded-xl border-0 bg-white"
                        />
                      ) : (
                        <img
                          src={getMediaUrl(selectedReceipt.template_file_path)}
                          alt="College Reference Template"
                          className="max-h-full max-w-full object-contain rounded-xl shadow-xs"
                        />
                      )
                    ) : (
                      <div className="text-center p-6 text-slate-500 space-y-2">
                        <Info className="h-10 w-10 text-slate-400 mx-auto" />
                        <p className="font-bold text-sm text-slate-800">No Reference Template Attached</p>
                        <p className="text-xs max-w-xs leading-relaxed text-slate-500">
                          This receipt was verified under Path A because no active template had been uploaded by your
                          college admin at the time of submission.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <p className="text-xs text-slate-500">
                Approving this receipt immediately clears the student for all campus recruitment drives.
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openRejectModal(selectedReceipt)}
                  className="w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  <span>Reject Submission</span>
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleApprove(selectedReceipt)}
                  isLoading={approveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto font-bold"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  <span>Approve Receipt</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ REJECT FEEDBACK MODAL ════════════ */}
      {showRejectModal && selectedReceipt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Reject Placement Fee Receipt</h3>
                <p className="text-xs text-slate-500">Student: {selectedReceipt.student_name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Feedback for Student (Rejection Explanation)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Receipt image is too blurry to read transaction reference number or date..."
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                This notice will be immediately dispatched to the student so they can rectify and upload a valid receipt.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={submitReject}
                isLoading={rejectMutation.isPending}
                disabled={!rejectReason.trim()}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ FLOATING BULK APPROVAL ACTION BAR ════════════ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold font-mono">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium text-slate-200">
              receipt{selectedIds.size > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-white text-xs h-8 px-2.5"
            >
              Clear
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleBulkApprove}
              isLoading={bulkApproveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3.5 flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 size={14} />
              <span>Approve Selected ({selectedIds.size})</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
