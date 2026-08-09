import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { drivesApi } from "../../api/drives.api";
import { useAuth } from "../../auth/useAuth";
import DriveDetailsView from "../../components/drives/DriveDetailsView";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Badge from "../../components/ui/Badge";
import { Building2, Calendar, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function DriveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [drive, setDrive] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    const fetchDriveDetail = async () => {
      try {
        setIsLoading(true);
        const res = await drivesApi.getMatchedDrives();
        const found = res.data.find((d) => d.id === parseInt(id, 10));
        setDrive(found || null);
      } catch (err) {
        setApplyError("Failed to load drive details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriveDetail();
  }, [id]);

  const handleApply = async () => {
    try {
      setIsApplying(true);
      setApplyError("");
      await drivesApi.applyToDrive(parseInt(id, 10));
      setApplySuccess(true);
    } catch (err) {
      setApplyError(err.response?.data?.detail || "Failed to apply for drive.");
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Drive Not Found</h3>
        <p className="text-slate-500 mb-4">This drive might be closed or you may not be eligible.</p>
        <Button onClick={() => navigate("/student/drives")}>Back to Drives</Button>
      </div>
    );
  }

  const isFeeVerified = user?.fee_verified;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/student/drives" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Drives
      </Link>

      {/* Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={drive.status === "open" ? "success" : "neutral"}>
              {drive.status.toUpperCase()}
            </Badge>
            {drive.placement_type && (
              <span className="px-2.5 py-0.5 bg-accent/10 text-accent font-semibold rounded-full text-xs">
                {drive.placement_type}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">{drive.role}</h1>
          <p className="text-slate-600 text-sm mt-0.5">{drive.company?.name || "Partner Company"}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {applySuccess ? (
            <div className="flex items-center px-4 py-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200 font-medium text-sm">
              <CheckCircle2 className="w-5 h-5 mr-2" /> Applied Successfully
            </div>
          ) : (
            <div className="relative group w-full sm:w-auto">
              <Button 
                onClick={handleApply} 
                disabled={!isFeeVerified || drive.status !== "open"}
                isLoading={isApplying}
                size="lg"
                className="w-full sm:w-auto"
              >
                Apply Now
              </Button>
              {!isFeeVerified && (
                <div className="absolute top-full right-0 mt-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  You must verify your placement fee receipt before applying.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {applyError && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-700">{applyError}</p>
        </div>
      )}

      {/* Main Drive Details Component */}
      <DriveDetailsView drive={drive} company={drive.company} />
    </div>
  );
}
