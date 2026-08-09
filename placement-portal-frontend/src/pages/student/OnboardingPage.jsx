import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { studentOnboardingSchema } from "../../utils/validators";
import { studentApi } from "../../api/student.api";
import { authApi } from "../../api/auth.api";
import { resumeApi } from "../../api/resume.api";
import { branchesApi } from "../../api/branches.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import FileUploadInput from "../../components/forms/FileUploadInput";
import { Lock } from "lucide-react";

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState("");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches().then((res) => res.data),
  });

  // Extract ID and Branch from college email (e.g. 23it449@bvmengineering.ac.in -> 23IT449 & IT)
  const emailPrefix = user?.email ? user.email.split("@")[0].toLowerCase() : "";
  const match = emailPrefix.match(/^(\d{2})([a-z]+)(\d+)$/i);

  const autoBranch = match ? match[2].toUpperCase() : "";
  const autoIdNumber = match ? `${match[1]}${match[2].toUpperCase()}${match[3]}` : emailPrefix.toUpperCase();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentOnboardingSchema),
    defaultValues: {
      branch: autoBranch,
    },
  });

  useEffect(() => {
    if (autoBranch) {
      setValue("branch", autoBranch);
    }
  }, [autoBranch, setValue]);

  // If already onboarded, redirect
  if (user?.profile_complete) {
    return <Navigate to="/student/dashboard" replace />;
  }

  const onSubmit = async (data) => {
    if (!resumeFile) {
      setResumeError("Resume upload is required");
      return;
    }
    
    try {
      setSubmitError("");
      
      const skillsArray = Array.isArray(data.skills)
        ? data.skills
        : (typeof data.skills === "string" ? data.skills.split(",").map((s) => s.trim()).filter(Boolean) : []);

      const compPercentile = (data.competitive_exam_percentile !== null && data.competitive_exam_percentile !== undefined && data.competitive_exam_percentile !== "")
        ? parseFloat(data.competitive_exam_percentile)
        : null;

      const payload = {
        full_name: data.full_name,
        branch: autoBranch || data.branch,
        cgpa: parseFloat(data.cgpa),
        active_backlogs: parseInt(data.active_backlogs, 10),
        tenth_percentage: parseFloat(data.tenth_percentage),
        twelfth_percentage: parseFloat(data.twelfth_percentage),
        skills: skillsArray,
        competitive_exam_name: data.competitive_exam_name || null,
        competitive_exam_percentile: (compPercentile !== null && !isNaN(compPercentile)) ? compPercentile : null,
      };

      try {
        await studentApi.createProfile(payload);
      } catch (profileErr) {
        if (profileErr.response?.status === 409) {
          await authApi.updateMyProfile(payload);
        } else {
          throw profileErr;
        }
      }

      await resumeApi.uploadResume(resumeFile);
      await refreshUser();
      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      setSubmitError(
        err.response?.data?.detail || err.message || "Failed to complete onboarding. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground font-heading">
          Complete Your Profile
        </h2>
        <p className="mt-2 text-center text-sm text-muted">
          Provide your official academic details to access placement drives.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-card py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {submitError && (
              <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">
                {submitError}
              </div>
            )}

            {/* Auto-extracted Credentials Header */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <span>Verified College Credentials</span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <Lock size={12} /> Auto-Locked
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-xs text-slate-500">Student ID / Roll No</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{autoIdNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">College Email</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                placeholder="e.g. Pratham Raval"
                {...register("full_name")}
                error={errors.full_name?.message}
              />
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>Branch / Department</span>
                  {autoBranch && (
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                      <Lock size={10} /> Verified
                    </span>
                  )}
                </label>
                <select
                  {...register("branch")}
                  disabled={!!autoBranch}
                  className={`w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent ${
                    autoBranch ? "bg-slate-100 text-slate-600 font-semibold cursor-not-allowed border-slate-300" : "bg-card"
                  }`}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.code} ({b.name})
                    </option>
                  ))}
                </select>
                {errors.branch && (
                  <p className="mt-1 text-xs text-red-500">{errors.branch.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="CGPA"
                type="number"
                step="0.01"
                placeholder="e.g. 8.5"
                {...register("cgpa")}
                error={errors.cgpa?.message}
              />
              <Input
                label="Active Backlogs"
                type="number"
                min="0"
                placeholder="e.g. 0"
                {...register("active_backlogs")}
                error={errors.active_backlogs?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="10th Percentage (%)"
                type="number"
                step="0.01"
                placeholder="e.g. 85.5"
                {...register("tenth_percentage")}
                error={errors.tenth_percentage?.message}
              />
              <Input
                label="12th / Diploma Percentage (%)"
                type="number"
                step="0.01"
                placeholder="e.g. 82.0"
                {...register("twelfth_percentage")}
                error={errors.twelfth_percentage?.message}
              />
            </div>

            <Input
              label="Skills (Comma-separated)"
              placeholder="e.g. React, Python, Java, Data Structures"
              {...register("skills")}
              error={errors.skills?.message}
            />

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Competitive Exam Scores (Optional)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="Exam Name (Optional)"
                  placeholder="e.g. GATE, CAT, CMAT"
                  {...register("competitive_exam_name")}
                  error={errors.competitive_exam_name?.message}
                />
                <Input
                  label="Percentile / Score (Optional)"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 98.5"
                  {...register("competitive_exam_percentile")}
                  error={errors.competitive_exam_percentile?.message}
                />
              </div>
            </div>

            <FileUploadInput
              label="Upload Resume (PDF/DOC)"
              accept=".pdf,.doc,.docx"
              onChange={(file) => {
                setResumeFile(file);
                setResumeError("");
              }}
              error={resumeError}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Complete Onboarding
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
