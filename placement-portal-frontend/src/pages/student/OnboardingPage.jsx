import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentOnboardingSchema } from "../../utils/validators";
import { studentApi } from "../../api/student.api";
import { authApi } from "../../api/auth.api";
import { resumeApi } from "../../api/resume.api";
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
      setResumeError("");
      
      // 1. Submit Profile Data
      try {
        await studentApi.createProfile(data);
      } catch (profileErr) {
        if (profileErr.response?.status === 409) {
          await authApi.updateProfile(data);
        } else {
          throw profileErr;
        }
      }
      
      // 2. Upload Resume
      const formData = new FormData();
      formData.append("file", resumeFile);
      await resumeApi.upload(formData);
      
      // 3. Refresh user state so profile_complete becomes true
      await refreshUser();
      
      // 4. Navigate to dashboard
      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0]?.msg : detail;
      setSubmitError(errorMessage || "Failed to complete onboarding. Please check your inputs.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
          Complete Your Profile
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          We need a few details to match you with the best placement drives.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
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
              <Input
                label="Branch/Department"
                placeholder="e.g. Information Technology"
                {...register("branch")}
                error={errors.branch?.message}
              />
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
                placeholder="e.g. 90.5"
                {...register("tenth_percentage")}
                error={errors.tenth_percentage?.message}
              />
              <Input
                label="12th / Diploma Percentage"
                type="number"
                step="0.01"
                placeholder="e.g. 85.0"
                {...register("twelfth_percentage")}
                error={errors.twelfth_percentage?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Competitive Exam Name (Optional)"
                placeholder="e.g. GUJCET, JEE Main"
                {...register("competitive_exam_name")}
                error={errors.competitive_exam_name?.message}
              />
              <Input
                label="Exam Percentile (Optional)"
                type="number"
                step="0.01"
                placeholder="e.g. 95.5"
                {...register("competitive_exam_percentile")}
                error={errors.competitive_exam_percentile?.message}
              />
            </div>

            <Input
              label="Technical Skills"
              placeholder="e.g. React, Node.js, Python, Java (comma separated)"
              {...register("skills")}
              error={errors.skills?.message}
              helperText="Separate multiple skills with commas."
            />

            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-900 mb-4">Upload Resume (PDF only)</h3>
              <FileUploadInput
                accept=".pdf"
                value={resumeFile}
                onChange={(file) => {
                  setResumeFile(file);
                  if (file) setResumeError("");
                }}
                error={resumeError}
                helperText="Upload your latest resume. We will parse it to help build your profile."
              />
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                Complete Profile & Continue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
