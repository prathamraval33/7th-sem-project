import React, { useState, useEffect } from "react";
import { authApi } from "../../api/auth.api";
import { studentApi } from "../../api/student.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import FileUploadInput from "../../components/forms/FileUploadInput";
import { 
  FileCheck2, 
  AlertCircle, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight
} from "lucide-react";
import {
  AnimatedWords,
  LiveStatusBeacon,
  StudentTickerRibbon,
  RevealOnScroll
} from "../../components/common/MotionKit";

export default function FeeReceiptUploadPage() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await studentApi.getFeeVerificationStatus();
      setStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch fee status", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

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
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const isVerified = user?.fee_verified;
  const latestReceipt = status?.latest_receipt;
  const isPendingReview = !isVerified && latestReceipt && !latestReceipt.verified_at && !latestReceipt.ai_reason?.startsWith("Manual TPO rejection");
  const isRejected = !isVerified && latestReceipt && (latestReceipt.ai_verdict === "invalid" || latestReceipt.ai_reason?.startsWith("Manual TPO rejection"));

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
            Upload and verify your institutional placement registration fee receipt to unlock active corporate drives.
          </p>
        </div>
      </div>

      {/* ════════════ STUDENT LIVE TICKER RIBBON ════════════ */}
      <StudentTickerRibbon />

      {isVerified ? (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-emerald-200 p-10 text-center relative overflow-hidden space-y-4">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
              OFFICIALLY CLEARED
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
              Placement Fee Verified
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your registration receipt has been authenticated. You now have full clearance to apply to all campus recruitment drives.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">Action Required: Upload Fee Receipt</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Campus recruitment drive applications remain locked until your fee clearance is verified. The Groq Vision OCR engine will inspect your receipt against your institution's template.
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 p-7 sm:p-9 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <FileText className="text-emerald-600" size={18} />
                  <span>Upload Digital Receipt Document</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accepted formats: PDF document, JPEG or PNG image (Max 5MB)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                Groq AI OCR
              </span>
            </div>
            
            {/* Pending TPO Review State */}
            {isPendingReview && (
              <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex items-start gap-3.5">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-900 text-sm">Receipt Under Review by Placement Officer</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Your previous receipt submission was flagged for manual review by your college TPO.
                  </p>
                  {latestReceipt.ai_reason && (
                    <p className="text-xs text-amber-700 italic pt-0.5">Note: &ldquo;{latestReceipt.ai_reason}&rdquo;</p>
                  )}
                  <p className="text-[11px] text-amber-600 pt-1">
                    You will receive an in-portal notification once verified. You may also upload a new, clearer receipt below.
                  </p>
                </div>
              </div>
            )}

            {/* Rejection Feedback State */}
            {!isPendingReview && isRejected && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-1.5">
                <h4 className="font-bold text-rose-800 flex items-center text-sm gap-2">
                  <AlertCircle size={16} />
                  <span>Previous Upload Rejected</span>
                </h4>
                <p className="text-xs text-rose-700">
                  Feedback: <strong>{latestReceipt.ai_reason || "The receipt format or payment details could not be validated."}</strong>
                </p>
                <p className="text-[11px] text-rose-600">Please upload a clearer, valid fee receipt below.</p>
              </div>
            )}

            <div className="space-y-5">
              <FileUploadInput
                accept=".pdf,.jpg,.jpeg,.png"
                value={receiptFile}
                onChange={(file) => {
                  setReceiptFile(file);
                  setUploadError("");
                }}
                error={uploadError}
                helperText="Ensure the Transaction Reference / UTR Number, Student Name, and Paid Amount are clearly legible."
              />
              
              <button 
                type="button"
                onClick={handleUpload} 
                disabled={!receiptFile || isUploading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isUploading ? (
                  <span>Processing OCR Verification...</span>
                ) : (
                  <>
                    <Zap size={15} />
                    <span>Submit Receipt for AI Verification</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/90 p-6 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Verification Checklist</span>
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
              <li>Ensure all 4 corners of the digital receipt are visible without cropping.</li>
              <li>The Transaction ID / UTR number must match institutional bank records.</li>
              <li>The payment amount must match the prescribed placement fee for your batch.</li>
              <li>Processing usually takes less than 30 seconds via our AI OCR pipeline.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
