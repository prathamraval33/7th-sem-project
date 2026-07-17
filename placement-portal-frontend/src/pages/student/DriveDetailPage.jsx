import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { drivesApi } from "../../api/drives.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import { ArrowLeft, Building2, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function DriveDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [drive, setDrive] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    // In a real app we'd fetch specific drive details.
    // For now, let's fetch all matched and find it.
    const fetchDrive = async () => {
      try {
        setIsLoading(true);
        const res = await drivesApi.getMatchedDrives();
        const found = res.data.find(d => d.id.toString() === id);
        if (found) {
          setDrive(found);
        } else {
          setApplyError("Drive not found or you are not eligible.");
        }
      } catch (err) {
        setApplyError("Failed to fetch drive details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDrive();
  }, [id]);

  const handleApply = async () => {
    try {
      setIsApplying(true);
      setApplyError("");
      // Real API call to apply would go here
      // await drivesApi.applyToDrive(id);
      
      // Simulate success for now
      setTimeout(() => {
        setApplySuccess(true);
        setIsApplying(false);
      }, 1000);
    } catch (err) {
      setApplyError(err.response?.data?.detail || "Failed to apply to drive.");
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 mb-4">{applyError}</p>
        <Button onClick={() => navigate("/student/drives")}>Back to Drives</Button>
      </div>
    );
  }

  const isFeeVerified = user?.fee_verified;

  return (
    <div className="max-w-4xl mx-auto font-sans">
      <Link to="/student/drives" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Drives
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start space-x-5">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-heading">{drive.role}</h1>
              <p className="text-lg text-slate-600 mt-1">{drive.company?.name || "Company Name"}</p>
              <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> Deadline: {new Date(drive.deadline).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            {applySuccess ? (
              <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 mr-2" /> Applied Successfully
              </div>
            ) : (
              <div className="relative group">
                <Button 
                  onClick={handleApply} 
                  disabled={!isFeeVerified || drive.status !== "open"}
                  isLoading={isApplying}
                  size="lg"
                  className="w-full md:w-auto"
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

        {/* Content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Job Description</h3>
              <div className="prose prose-slate text-sm">
                <p>{drive.jd_text || "No description provided."}</p>
              </div>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-3">Company About</h3>
              <div className="prose prose-slate text-sm">
                <p>{drive.company?.about || "N/A"}</p>
                {drive.company?.website && (
                  <p className="mt-2"><a href={drive.company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{drive.company.website}</a></p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-slate-500" /> Criteria
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Min CGPA</dt>
                  <dd className="font-medium text-slate-900">{drive.eligibility_criteria?.min_cgpa || "N/A"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Max Backlogs</dt>
                  <dd className="font-medium text-slate-900">{drive.eligibility_criteria?.max_backlogs ?? "N/A"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Bond</dt>
                  <dd className="font-medium text-slate-900">{drive.bond_details || "None"}</dd>
                </div>
              </dl>
            </div>
            
            {applyError && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700">{applyError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
