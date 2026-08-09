import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../api/auth.api";
import { branchesApi } from "../../api/branches.api";
import { resumeApi } from "../../api/resume.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { User, Mail, Shield, BadgeCheck, FileText, Upload } from "lucide-react";
import { ROLES } from "../../utils/constants";
import ChangePasswordPage from "../auth/ChangePasswordPage";
import { showToast, showError } from "../../utils/swal";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("profile"); // profile | password

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches().then((res) => res.data),
  });

  const { data: userResumes = [], isLoading: loadingResumes } = useQuery({
    queryKey: ["student-resumes"],
    queryFn: () => resumeApi.getHistory().then((res) => res.data),
    enabled: user?.user_type === ROLES.STUDENT,
  });

  const activeResume = userResumes.find((r) => r.is_active) || userResumes[0];

  const uploadResumeMutation = useMutation({
    mutationFn: (file) => resumeApi.uploadResume(file),
    onSuccess: () => {
      queryClient.invalidateQueries(["student-resumes"]);
      showToast("Resume updated successfully! Old resume deleted.");
    },
    onError: (err) => {
      showError("Upload Failed", err.response?.data?.detail || "Could not upload new resume.");
    },
  });

  const uploadingResume = uploadResumeMutation.isPending;

  const handleResumeUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showError("Invalid File", "Only PDF resumes are supported.");
        return;
      }
      uploadResumeMutation.mutate(file);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.profile?.full_name || "",
        branch: user.profile?.branch || "",
        skills: user.profile?.skills ? user.profile.skills.join(", ") : "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");
    
    try {
      const updateData = {
        full_name: formData.full_name,
        branch: formData.branch,
        skills: formData.skills ? formData.skills.split(",").map(s => s.trim()).filter(Boolean) : []
      };
      
      await authApi.updateMyProfile(updateData);
      await refreshUser();
      setSuccessMsg("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Account Settings</h1>
          <p className="text-slate-600 mt-1">Manage your personal information and account preferences.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("profile")}
          className={`py-2.5 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "profile"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`py-2.5 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "password"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Security & Password
        </button>
      </div>

      {activeTab === "profile" ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 font-heading">
                    {user.profile?.full_name || user.email.split("@")[0]}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                    {user.user_type}
                  </span>
                </div>
              </div>

              {user.user_type === ROLES.STUDENT && (
                <div>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>

            {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 rounded-lg">{error}</div>}
            {successMsg && <div className="p-3 mb-4 text-sm text-green-700 bg-green-50 rounded-lg">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                  <div className="flex items-center space-x-2 text-slate-900 font-medium p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{user.email}</span>
                  </div>
                </div>

                {user.user_type === ROLES.STUDENT && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Fee Status</label>
                    <div className={`flex items-center space-x-2 font-medium p-2.5 rounded-lg border ${user.fee_verified ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      <FileText className="w-4 h-4" />
                      <span>{user.fee_verified ? "Verified" : "Not Verified"}</span>
                    </div>
                  </div>
                )}
              </div>

              {user.user_type === ROLES.STUDENT && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input
                      label="Full Name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                      {isEditing ? (
                        <select
                          name="branch"
                          value={formData.branch}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="">Select Branch</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.code}>
                              {b.code} ({b.name})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          name="branch"
                          value={formData.branch}
                          disabled={true}
                        />
                      )}
                    </div>
                  </div>
                  <Input
                    label="Skills (comma separated)"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="e.g. React, Python, Java"
                  />
                  
                  {/* Read-only academic info & Resume */}
                  {!isEditing && user.profile && (
                    <>
                      <div className="pt-6 mt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">CGPA</p>
                          <p className="text-sm font-semibold text-slate-900">{user.profile.cgpa}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Backlogs</p>
                          <p className="text-sm font-semibold text-slate-900">{user.profile.active_backlogs}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">10th %</p>
                          <p className="text-sm font-semibold text-slate-900">{user.profile.tenth_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">12th %</p>
                          <p className="text-sm font-semibold text-slate-900">{user.profile.twelfth_percentage}%</p>
                        </div>
                      </div>

                      {/* Resume Section */}
                      <div className="pt-6 mt-6 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm font-semibold text-slate-900 font-heading">
                            Active Resume
                          </label>
                          <label className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer inline-flex items-center gap-1">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingResume ? "Uploading..." : "Upload / Replace Resume"}</span>
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              disabled={uploadingResume}
                              onChange={handleResumeUpload}
                            />
                          </label>
                        </div>

                        {loadingResumes ? (
                          <div className="p-3 text-sm text-slate-500">Loading resume...</div>
                        ) : activeResume ? (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3">
                              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                                  {activeResume.file_path.split("/").pop()}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Uploaded on {new Date(activeResume.created_at || Date.now()).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <a
                                href={`http://localhost:8000/uploads/${activeResume.file_path.replace("uploads/", "").replace("uploads\\", "").replace("\\", "/")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                              >
                                <FileText className="w-4 h-4" />
                                <span>View PDF</span>
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                            <span className="text-xs font-medium text-amber-800">No active resume uploaded yet.</span>
                            <label className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                              <span>Upload Resume PDF</span>
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                disabled={uploadingResume}
                                onChange={handleResumeUpload}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {isEditing && (
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button type="submit" isLoading={isLoading}>
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : (
        <ChangePasswordPage />
      )}
    </div>
  );
}
