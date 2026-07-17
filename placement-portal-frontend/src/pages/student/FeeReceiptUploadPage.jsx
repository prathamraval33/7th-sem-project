import React, { useState, useEffect } from "react";
import { authApi } from "../../api/auth.api";
import { studentApi } from "../../api/student.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import FileUploadInput from "../../components/forms/FileUploadInput";
import { FileCheck2, AlertCircle, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";

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
      const res = await studentApi.getFeeStatus();
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
      setUploadError("Please select a file to upload");
      return;
    }
    
    try {
      setUploadError("");
      setIsUploading(true);
      await studentApi.uploadFeeReceipt(receiptFile);
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
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const isVerified = user?.fee_verified;

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Placement Fee Verification</h1>
        <p className="text-slate-600 mt-1">Upload your fee receipt to unlock drive applications.</p>
      </div>

      {isVerified ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Fee Verified</h2>
          <p className="text-slate-600">
            Your placement fee receipt has been verified. You can now apply to placement drives.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start space-x-4">
            <ShieldAlert className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Verification Required</h3>
              <p className="text-sm text-amber-800 mt-1">
                You cannot apply to any drives until your placement fee is verified. Our AI system will scan your receipt for legitimacy.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 font-heading flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-500" />
              Upload Receipt
            </h3>
            
            {status && status.ai_verdict === false && (
              <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 flex items-center text-sm">
                  <AlertCircle className="w-4 h-4 mr-1.5" /> Previous Upload Rejected
                </h4>
                <p className="text-sm text-red-700 mt-1">Reason: {status.ai_reason}</p>
                <p className="text-xs text-red-600 mt-2">Please upload a clearer, valid receipt.</p>
              </div>
            )}

            <div className="space-y-4">
              <FileUploadInput
                accept=".pdf,.jpg,.jpeg,.png"
                value={receiptFile}
                onChange={(file) => {
                  setReceiptFile(file);
                  setUploadError("");
                }}
                error={uploadError}
                helperText="Supported formats: PDF, JPG, PNG (Max 5MB). Make sure the transaction ID and amount are clearly visible."
              />
              
              <Button 
                onClick={handleUpload} 
                className="w-full"
                isLoading={isUploading}
                disabled={!receiptFile}
              >
                Submit for Verification
              </Button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h4 className="font-medium text-slate-900 mb-2">Verification Guidelines</h4>
            <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
              <li>Ensure the entire receipt is visible without cropping.</li>
              <li>The transaction ID / UTR number must be clearly legible.</li>
              <li>The payment amount must match the prescribed placement fee.</li>
              <li>Wait up to 1-2 minutes for the AI scanner to process your upload.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
