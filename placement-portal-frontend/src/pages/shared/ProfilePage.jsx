import React, { useState, useEffect } from "react";
import { authApi } from "../../api/auth.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { User, Mail, Shield, BadgeCheck, FileText } from "lucide-react";
import { ROLES } from "../../utils/constants";
import ChangePasswordPage from "../auth/ChangePasswordPage";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("profile"); // profile | password

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
      
      await authApi.updateProfile(updateData);
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Account Settings</h1>
          <p className="text-slate-600 mt-1">Manage your profile and security preferences.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "profile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab("password")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}
        >
          Security & Password
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{user.profile?.full_name || "User"}</h2>
                <div className="flex items-center text-slate-500 text-sm mt-1">
                  <Mail className="w-4 h-4 mr-1.5" />
                  {user.email}
                  {user.is_email_verified && <BadgeCheck className="w-4 h-4 ml-1.5 text-blue-500" title="Verified" />}
                </div>
              </div>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
          
          <div className="p-6">
            {error && <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 rounded-lg">{error}</div>}
            {successMsg && <div className="mb-6 p-3 text-sm text-green-700 bg-green-50 rounded-lg">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Role</label>
                  <div className="flex items-center space-x-2 text-slate-900 font-medium capitalize bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span>{user.user_type}</span>
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
                    <Input
                      label="Branch"
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <Input
                    label="Skills (comma separated)"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="e.g. React, Python, Java"
                  />
                  
                  {/* Read-only academic info */}
                  {!isEditing && user.profile && (
                    <div className="pt-6 mt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">CGPA</p>
                        <p className="text-slate-900 font-medium">{user.profile.cgpa}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Backlogs</p>
                        <p className="text-slate-900 font-medium">{user.profile.active_backlogs}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">10th %</p>
                        <p className="text-slate-900 font-medium">{user.profile.tenth_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">12th %</p>
                        <p className="text-slate-900 font-medium">{user.profile.twelfth_percentage}%</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isEditing && (
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isLoading}>
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {activeTab === "password" && (
        <div className="pt-2">
          <ChangePasswordPage />
        </div>
      )}
    </div>
  );
}
