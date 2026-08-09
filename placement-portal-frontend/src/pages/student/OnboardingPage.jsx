import React, { useState } from "react";
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentOnboardingSchema),
  });

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
      
      const payload = {
        full_name: data.full_name,
        branch: data.branch,
        cgpa: parseFloat(data.cgpa),
        active_backlogs: parseInt(data.active_backlogs, 10),
        tenth_percentage: parseFloat(data.tenth_percentage),
        twelfth_percentage: parseFloat(data.twelfth_percentage),
        skills: data.skills.split(",").map((s) => s.trim()).filter(Boolean),
        competitive_exam_name: data.competitive_exam_name || null,
        competitive_exam_percentile: data.competitive_exam_percentile 
          ? parseFloat(data.competitive_exam_percentile) 
          : null,
      };

      await studentApi.createProfile(payload);
      await resumeApi.uploadResume(resumeFile);
      await refreshUser();
      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      setSubmitError(
        err.response?.data?.detail || "Failed to complete onboarding. Please try again."
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
          Please provide your academic details to get started with placement opportunities.
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                placeholder="John Doe"
                {...register("full_name")}
                error={errors.full_name?.message}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch/Department</label>
                <select
                  {...register("branch")}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-accent"
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
                label="10th Percentage"
                type="number"
                step="0.01"
                placeholder="e.g. 85.5"
                {...register("tenth_percentage")}
                error={errors.tenth_percentage?.message}
              />
              <Input
                label="12th Percentage"
                type="number"
                step="0.01"
                placeholder="e.g. 82.0"
                {...register("twelfth_percentage")}
                error={errors.twelfth_percentage?.message}
              />
            </div>

            <Input
              label="Skills"
              placeholder="e.g. Python, React, Data Structures (comma separated)"
              {...register("skills")}
              error={errors.skills?.message}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Competitive Exam Name (Optional)"
                placeholder="e.g. GATE, CAT"
                {...register("competitive_exam_name")}
                error={errors.competitive_exam_name?.message}
              />
              <Input
                label="Competitive Exam Percentile (Optional)"
                type="number"
                step="0.01"
                placeholder="e.g. 95.5"
                {...register("competitive_exam_percentile")}
                error={errors.competitive_exam_percentile?.message}
              />
            </div>

            <FileUploadInput
              label="Resume PDF"
              accept=".pdf"
              file={resumeFile}
              onChange={(file) => {
                setResumeFile(file);
                setResumeError("");
              }}
              error={resumeError}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
            >
              Complete Profile Setup
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
