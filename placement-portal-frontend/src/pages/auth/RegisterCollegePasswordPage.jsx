import React, { useState } from "react";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, CheckCircle2, Building2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { collegeRegistrationPasswordSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import { setTokens } from "../../utils/tokenStorage";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function RegisterCollegePasswordPage() {
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedData, setCompletedData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const registrationState = location.state;
  const email = registrationState?.email;
  const verificationToken =
    registrationState?.verification_token ||
    registrationState?.registration_token ||
    registrationState?.token;
  const collegeName = registrationState?.college_name;
  const adminName = registrationState?.admin_name;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(collegeRegistrationPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // If accessed directly without token or email, redirect to start
  if (!email || !verificationToken) {
    return <Navigate to="/register-college" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      const res = await authApi.collegeRegistrationComplete({
        email,
        verification_token: verificationToken,
        registration_token: verificationToken,
        password: data.password,
      });

      if (res.data?.access_token && res.data?.refresh_token) {
        setTokens({
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        });
      }

      // Automatically transition to Step 4: Subscription Offer
      navigate("/register-college/subscription", {
        state: {
          college_id: res.data?.college_id,
          college_name: collegeName || res.data?.college_name,
          admin_name: adminName,
          admin_email: email,
          subscription_amount: res.data?.subscription_amount || 10000,
        },
        replace: true,
      });
    } catch (err) {
      console.error("Account Creation Failed:", err);
      setSubmitError(
        err.response?.data?.detail || "Failed to complete account registration. Please try again."
      );
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white py-10 px-8 shadow-sm border border-slate-200 sm:rounded-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mb-5">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 font-heading">
              Institution Registered!
            </h2>

            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Welcome, <span className="font-semibold text-slate-900">{adminName}</span>. Your college account for{" "}
              <span className="font-semibold text-slate-900">{collegeName || completedData?.college_name}</span> has been
              created in <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">Pending Setup</span> mode.
            </p>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Setup Mode Active:</strong> Log in as College Admin to complete your checklist (configure student domains, add placement officers, and update your institution profile).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Platform Activation:</strong> Once blocking items are ready, your account transitions to review. A SuperAdmin will activate your campus portal to enable student signups.
                </span>
              </div>
            </div>

            <div className="mt-8">
              <Button
                onClick={() => navigate("/login", { replace: true })}
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-2.5 flex items-center justify-center gap-2"
              >
                Proceed to Sign In <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
          Set Admin Password
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a secure password for <span className="font-semibold text-slate-900">{email}</span>
        </p>

        {/* Progress Step Indicator */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">✓</span>
            <span>Institution Info</span>
          </div>
          <div className="w-8 h-0.5 bg-indigo-600" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">✓</span>
            <span>Verify Email</span>
          </div>
          <div className="w-8 h-0.5 bg-indigo-600" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</span>
            <span>Setup Admin</span>
          </div>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 sm:rounded-2xl">
          {submitError && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{submitError}</div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                label="Admin Password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
                error={errors.password?.message}
                helperText="Must be at least 8 characters and include at least one number."
                required
              />
            </div>

            <div>
              <Input
                label="Confirm Admin Password"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
                required
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" isLoading={isSubmitting}>
                Complete Registration
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              to="/register-college"
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Start over with another institution
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
