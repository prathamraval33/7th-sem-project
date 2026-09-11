import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tpoApi } from "../../api/tpo.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/common/Input";
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
} from "lucide-react";
import { format } from "date-fns";

export default function TpoFeeReviewPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fetch pending review receipts
  const { data: receipts = [], isLoading, isError } = useQuery({
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

  const filteredReceipts = receipts.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.student_name?.toLowerCase().includes(query) ||
      item.student_email?.toLowerCase().includes(query) ||
      item.roll_number?.toLowerCase().includes(query) ||
      item.branch?.toLowerCase().includes(query)
    );
  });

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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading flex items-center gap-2.5">
            <FileCheck2 className="h-7 w-7 text-primary" /> Placement Fee Verification Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review student fee receipts flagged by AI due to low confidence or structural deviations from the college template.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="brand" className="text-sm px-3 py-1 font-medium">
            {receipts.length} Pending {receipts.length === 1 ? "Review" : "Reviews"}
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll no, or branch..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {filteredReceipts.length} of {receipts.length} submissions
        </span>
      </div>

      {/* Pending Items Grid / Empty State */}
      {filteredReceipts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Pending Verifications</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {searchQuery
              ? "No student receipts match your search filter."
              : "All submitted placement fee receipts have been verified or resolved. Great job!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReceipts.map((item) => {
            const confidencePct = Math.round((item.ai_confidence || 0) * 100);
            const isTemplateMatched = !!item.matched_against_template_id;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Student Info Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-snug">{item.student_name}</h3>
                      <p className="text-xs text-muted-foreground">{item.student_email}</p>
                      {item.roll_number && (
                        <p className="text-xs font-mono font-medium text-primary mt-0.5">
                          Roll: {item.roll_number}
                        </p>
                      )}
                    </div>
                    <Badge variant={confidencePct >= 70 ? "warning" : "destructive"}>
                      AI: {confidencePct}%
                    </Badge>
                  </div>

                  {item.branch && (
                    <div className="inline-block bg-muted/60 text-muted-foreground text-xs px-2.5 py-1 rounded-md font-medium">
                      {item.branch}
                    </div>
                  )}

                  {/* AI Diagnostic Summary */}
                  <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Verification Mode:</span>
                      <span className="font-medium text-foreground truncate max-w-[180px]">
                        {isTemplateMatched
                          ? (item.template_name ? `Matched: ${item.template_name}` : "Template-Matched (Path B)")
                          : "General Heuristics (Path A)"}
                      </span>
                    </div>

                    {item.structural_match_result && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Structural Template:</span>
                        <span
                          className={`font-semibold ${
                            item.structural_match_result.matched ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {item.structural_match_result.matched ? "Matched" : "Deviation Flagged"}
                        </span>
                      </div>
                    )}

                    {item.ai_reason && (
                      <p className="text-muted-foreground italic text-xs pt-1 line-clamp-2 border-t border-border/60">
                        &ldquo;{item.ai_reason}&rdquo;
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Submitted on{" "}
                    {item.created_at ? format(new Date(item.created_at), "PPP p") : "Recently"}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-4 border-t border-border flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setSelectedReceipt(item)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Compare & Review
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                    onClick={() => handleApprove(item)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs px-2.5"
                    onClick={() => openRejectModal(item)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Review & Comparison Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-foreground font-heading flex items-center gap-2">
                  <FileCheck2 className="text-primary" size={20} /> Review Fee Receipt: {selectedReceipt.student_name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedReceipt.student_email} • Roll: {selectedReceipt.roll_number || "N/A"} • Branch:{" "}
                  {selectedReceipt.branch || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-muted-foreground hover:text-foreground text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* AI Structured Diagnostic Card */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Groq AI Verification Verdict</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">Confidence Score:</span>
                    <Badge
                      variant={
                        (selectedReceipt.ai_confidence || 0) >= 0.85
                          ? "success"
                          : (selectedReceipt.ai_confidence || 0) >= 0.6
                          ? "warning"
                          : "destructive"
                      }
                      className="text-xs px-2.5 py-0.5"
                    >
                      {Math.round((selectedReceipt.ai_confidence || 0) * 100)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Structural Match Evaluation */}
                  <div className="p-3 bg-background rounded-lg border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">1. Structural / Template Match</span>
                      {selectedReceipt.structural_match_result ? (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            selectedReceipt.structural_match_result.matched
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {selectedReceipt.structural_match_result.matched ? "Matched" : "Deviation Found"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Path A (No Template)</span>
                      )}
                    </div>
                    <p className="text-muted-foreground pt-1 leading-relaxed">
                      {selectedReceipt.structural_match_result?.details ||
                        "No college reference template was configured when this receipt was submitted; verified via general heuristic plausibility."}
                    </p>
                  </div>

                  {/* Content Validity Evaluation */}
                  <div className="p-3 bg-background rounded-lg border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">2. Content & Payment Validity</span>
                      {selectedReceipt.content_valid_result ? (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            selectedReceipt.content_valid_result.valid
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {selectedReceipt.content_valid_result.valid ? "Valid Details" : "Incomplete/Questionable"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Standard Check</span>
                      )}
                    </div>
                    <p className="text-muted-foreground pt-1 leading-relaxed">
                      {selectedReceipt.content_valid_result?.details ||
                        "Standard OCR integrity analysis: checked for payment amount, transaction ID, and timestamp."}
                    </p>
                  </div>
                </div>

                {selectedReceipt.ai_reason && (
                  <div className="pt-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Stated Reasoning: </span>
                    <span>{selectedReceipt.ai_reason}</span>
                  </div>
                )}
              </div>

              {/* Side-by-Side Comparison Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel: Student Uploaded Receipt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Student&apos;s Submitted Receipt
                    </h4>
                    {getMediaUrl(selectedReceipt.file_path) && (
                      <a
                        href={getMediaUrl(selectedReceipt.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Open in Full Window
                      </a>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-slate-950/5 dark:bg-slate-900/50 p-2 h-[420px] flex items-center justify-center overflow-hidden">
                    {selectedReceipt.file_path.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={getMediaUrl(selectedReceipt.file_path)}
                        title="Student Receipt PDF"
                        className="w-full h-full rounded-lg border-0 bg-white"
                      />
                    ) : (
                      <img
                        src={getMediaUrl(selectedReceipt.file_path)}
                        alt="Student Receipt"
                        className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Right Panel: Official College Reference Template */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      {selectedReceipt.template_name
                        ? `Reference: ${selectedReceipt.template_name}`
                        : "College Official Reference Template"}
                    </h4>
                    {selectedReceipt.template_file_path && (
                      <a
                        href={getMediaUrl(selectedReceipt.template_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Open in Full Window
                      </a>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-slate-950/5 dark:bg-slate-900/50 p-2 h-[420px] flex items-center justify-center overflow-hidden">
                    {selectedReceipt.template_file_path ? (
                      selectedReceipt.template_file_path.toLowerCase().endsWith(".pdf") ? (
                        <iframe
                          src={getMediaUrl(selectedReceipt.template_file_path)}
                          title="Reference Template PDF"
                          className="w-full h-full rounded-lg border-0 bg-white"
                        />
                      ) : (
                        <img
                          src={getMediaUrl(selectedReceipt.template_file_path)}
                          alt="College Reference Template"
                          className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
                        />
                      )
                    ) : (
                      <div className="text-center p-6 text-muted-foreground space-y-2">
                        <Info className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                        <p className="font-medium text-sm text-foreground">No Reference Template Attached</p>
                        <p className="text-xs max-w-xs leading-relaxed">
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
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <p className="text-xs text-muted-foreground">
                Approving this receipt will immediately unblock the student to apply for active drives.
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
                  <XCircle className="h-4 w-4 mr-1.5" /> Reject Submission
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleApprove(selectedReceipt)}
                  isLoading={approveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Feedback Reason Modal */}
      {showRejectModal && selectedReceipt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Reject Fee Receipt</h3>
                <p className="text-xs text-muted-foreground">For student: {selectedReceipt.student_name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Feedback for Student (Explaining Rejection Reason)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Receipt image is too dark to read transaction reference number."
                className="w-full p-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive/20 leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                This feedback message will be dispatched to the student&apos;s notification feed so they can re-upload
                a compliant receipt.
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
    </div>
  );
}
