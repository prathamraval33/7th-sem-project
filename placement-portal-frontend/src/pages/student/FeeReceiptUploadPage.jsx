import React, { useState, useEffect } from "react";
import { studentApi } from "../../api/student.api";
import { useAuth } from "../../auth/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import FileUploadInput from "../../components/forms/FileUploadInput";
import { 
  FileCheck2, 
  AlertCircle, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  FileQuestion,
  History,
  XCircle
} from "lucide-react";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
  RevealOnScroll
} from "../../components/common/MotionKit";

export default function FeeReceiptUploadPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [statusData, setStatusData] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showAccordion, setShowAccordion] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await studentApi.getFeeVerificationStatus();
      setStatusData(res.data);
      // If user became verified, sync auth user immediately
      if (res.data?.fee_verified && !user?.fee_verified) {
        await refreshUser();
        queryClient.invalidateQueries(["matchedDrives"]);
        queryClient.invalidateQueries(["student-tests-list"]);
        queryClient.invalidateQueries(["studentAnalyticsMe"]);
      }
    } catch (err) {
      console.error("Failed to fetch fee status", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const isVerified = Boolean(user?.fee_verified || statusData?.fee_verified);
  const latestReceipt = statusData?.latest_receipt;
  const uploadHistory = statusData?.upload_history || [];

  // Determine current lifecycle state: "verified" | "pending_review" | "rejected" | "not_uploaded"
  let verificationState = "not_uploaded";
  if (isVerified) {
    verificationState = "verified";
  } else if (latestReceipt) {
    if (latestReceipt.verified_at) {
      verificationState = "verified";
    } else if (
      (latestReceipt.ai_verdict && latestReceipt.ai_verdict === "invalid") ||
      (latestReceipt.ai_reason && latestReceipt.ai_reason.startsWith("Manual TPO rejection"))
    ) {
      verificationState = "rejected";
    } else {
      verificationState = "pending_review";
    }
  }

  // Open the "What counts as a valid receipt" accordion automatically if rejected
  useEffect(() => {
    if (verificationState === "rejected") {
      setShowAccordion(true);
    }
  }, [verificationState]);

  const handleUpload = async () => {
    if (!receiptFile) {
      setUploadError("Please select a valid fee receipt file to upload");
      return;
    }
    
    try {
      setUploadError("");
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", receiptFile);
      await studentApi.uploadFeeReceipt(formData);
      setReceiptFile(null);
      await fetchStatus();
      await refreshUser();
      queryClient.invalidateQueries(["matchedDrives"]);
      queryClient.invalidateQueries(["student-tests-list"]);
      queryClient.invalidateQueries(["studentAnalyticsMe"]);
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-sans">
      {/* ════════════ TOPBAR & KINETIC HEADER ════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <FileCheck2 size={13} className="text-emerald-600" />
              <span>Institutional Placement Clearance</span>
            </span>
            <LiveStatusBeacon 
              label={isVerified ? "FEE VERIFIED" : "VERIFICATION REQUIRED"} 
              variant={isVerified ? "active" : "draft"} 
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            <AnimatedWords text="Placement Fee Verification Desk" delay={0.05} />
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Upload and verify your institutional placement registration fee receipt to unlock active corporate placement drives and official assessments.
          </p>
        </div>
      </div>

      {/* ════════════ STUDENT LIVE TICKER RIBBON ════════════ */}
      <StudentTickerRibbon />

      {/* ════════════ SECTION 1: VERIFICATION STATUS CARD ════════════ */}
      <div>
        {verificationState === "verified" && (
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white rounded-3xl shadow-sm border border-emerald-300 p-8 text-center space-y-3 relative overflow-hidden">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold font-mono uppercase tracking-wider mb-1">
                Cleared for Placement Season
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                Fee Receipt Verified
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-1">
                Your payment receipt is approved. You have complete clearance to browse, apply to company drives, and take official placement assessments.
              </p>
              {latestReceipt?.verified_at && (
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  Verified on: {new Date(latestReceipt.verified_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {verificationState === "pending_review" && (
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-3xl shadow-sm border border-amber-300 p-8 text-center space-y-3 relative overflow-hidden">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 border border-amber-300 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Clock size={36} />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold font-mono uppercase tracking-wider mb-1">
                Under Manual Review
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                Receipt Awaiting TPO Clearance
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-1">
                Your receipt was submitted and is queued for verification by your College Placement Officer (TPO). You will receive an in-portal notification as soon as it is approved.
              </p>
              {latestReceipt?.ai_reason && (
                <p className="text-xs text-amber-700 bg-amber-50 max-w-md mx-auto p-2.5 rounded-xl border border-amber-200 mt-3 italic">
                  Note: &ldquo;{latestReceipt.ai_reason}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {verificationState === "rejected" && (
          <div className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-white rounded-3xl shadow-sm border border-rose-300 p-8 text-center space-y-3 relative overflow-hidden">
            <div className="w-16 h-16 bg-rose-100 text-rose-700 border border-rose-300 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <XCircle size={36} />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold font-mono uppercase tracking-wider mb-1">
                Action Required — Upload Rejected
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                Fee Receipt Not Approved
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-1">
                Your previous submission was rejected. Review the feedback reason below and upload a clear, authentic institutional receipt.
              </p>
              <div className="bg-rose-50 text-rose-900 max-w-md mx-auto p-3 rounded-xl border border-rose-200 mt-3 text-xs text-left">
                <strong>Feedback Reason:</strong>{" "}
                {latestReceipt?.ai_reason
                  ? latestReceipt.ai_reason.replace("Manual TPO rejection: ", "")
                  : "The receipt format, institutional letterhead, or payment details could not be validated."}
              </div>
            </div>
          </div>
        )}

        {verificationState === "not_uploaded" && (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mx-auto">
              <FileQuestion size={36} />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold font-mono uppercase tracking-wider mb-1">
                Not Submitted
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                No Receipt Uploaded Yet
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mt-1">
                Your placement fee is currently unverified. Upload your official college placement receipt below to unlock drive applications.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ════════════ SECTION 2: UPLOAD AREA ════════════ */}
      {verificationState !== "verified" && (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 p-7 sm:p-9 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <FileText className="text-emerald-600" size={18} />
                <span>Upload Placement Fee Receipt</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Accepted formats: PDF document, JPG, JPEG, or PNG image (Max 5MB)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-xs font-bold border border-emerald-200">
              Instant AI Verification
            </span>
          </div>

          <div className="space-y-5">
            <FileUploadInput
              accept=".pdf,.jpg,.jpeg,.png"
              value={receiptFile}
              onChange={(file) => {
                setReceiptFile(file);
                setUploadError("");
              }}
              error={uploadError}
              helperText="Ensure the receipt number, student name/ID, amount, and institution letterhead are clearly legible."
            />
            
            <button 
              type="button"
              onClick={handleUpload} 
              disabled={!receiptFile || isUploading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isUploading ? (
                <span>Inspecting Receipt &amp; Running OCR Verification...</span>
              ) : (
                <>
                  <Zap size={15} />
                  <span>Submit Receipt for Verification</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════════ SECTION 3: WHAT COUNTS AS A VALID RECEIPT ════════════ */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAccordion(!showAccordion)}
          className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle size={18} className="text-blue-600 shrink-0" />
            <span className="text-sm font-bold text-slate-900 font-heading">
              What Counts as a Valid Placement Fee Receipt?
            </span>
          </div>
          {showAccordion ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {showAccordion && (
          <div className="p-5 pt-0 border-t border-slate-100 text-xs text-slate-600 space-y-3 bg-slate-50/40">
            <p className="leading-relaxed">
              To pass automated template matching and TPO review, your uploaded document must strictly meet these institutional criteria:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>Official Letterhead:</strong> The document must feature your college or university name and official emblem.</li>
              <li><strong>Student Identity:</strong> Your full name or college registration/roll number must be explicitly printed on the document.</li>
              <li><strong>Fee Purpose:</strong> Must specify &ldquo;Training &amp; Placement Fee&rdquo;, &ldquo;Placement Registration&rdquo;, or academic term fees.</li>
              <li><strong>Plausible Amount &amp; Date:</strong> Clear payment amount, transaction/receipt reference number, and payment date.</li>
              <li><strong>Original PDF or High-Res Scan:</strong> Screenshots from payment apps (e.g., GPay, PhonePe UPI screens) without institutional receipt numbers will be rejected. Upload the official receipt PDF downloaded from your student portal.</li>
            </ul>
          </div>
        )}
      </div>

      {/* ════════════ SECTION 4: UPLOAD HISTORY TABLE ════════════ */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
            <History size={16} className="text-slate-500" />
            <span>Submission &amp; Review History</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {uploadHistory.length} Record{uploadHistory.length === 1 ? "" : "s"}
          </span>
        </div>

        {uploadHistory.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No previous submissions on record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Date Uploaded</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reviewed By</th>
                  <th className="py-2.5 px-3">Notes / Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uploadHistory.map((item) => {
                  let badge = null;
                  if (item.status === "auto_verified") {
                    badge = (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                        Auto-Verified
                      </span>
                    );
                  } else if (item.status === "tpo_approved") {
                    badge = (
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] uppercase">
                        TPO Approved
                      </span>
                    );
                  } else if (item.status === "tpo_rejected") {
                    badge = (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] uppercase">
                        Rejected
                      </span>
                    );
                  } else {
                    badge = (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                        Pending Review
                      </span>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {new Date(item.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">{badge}</td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {item.reviewed_by_name || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {item.rejection_reason || (item.status === "auto_verified" ? "Matched institution template" : "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
