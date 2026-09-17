import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { collegeRegistrationOtpSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import { showToast, showError } from "../../utils/swal";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function RegisterCollegeOtpPage() {
  const [submitError, setSubmitError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const registrationData = location.state;
  const email = registrationData?.email;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(collegeRegistrationOtpSchema),
    defaultValues: { otp: "" },
  });

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If accessed directly without an email in state, redirect to start
  if (!email) {
    return <Navigate to="/register-college" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      const res = await authApi.collegeRegistrationVerifyOtp({
        email,
        otp: data.otp.trim(),
      });

      const verificationToken =
        res.data?.verification_token || res.data?.token || res.data?.registration_token;
      if (!verificationToken) {
        throw new Error("Missing verification token in response.");
      }

      navigate("/register-college/password", {
        state: {
          verification_token: verificationToken,
          registration_token: verificationToken,
          email,
          college_name: res.data?.college_name || registrationData?.college_name,
          admin_name: res.data?.admin_name || registrationData?.admin_name,
        },
      });
    } catch (err) {
      console.error("OTP Verification Failed:", err);
      const errorMsg =
        err.response?.data?.detail ||
        (err.response ? "Invalid or expired verification code. Please try again." : err.message);
      setSubmitError(errorMsg);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      await authApi.collegeRegistrationRequestOtp({
        college_name: registrationData.college_name,
        admin_name: registrationData.admin_name,
        email: registrationData.email,
        mobile: registrationData.mobile || null,
        mobile_number: registrationData.mobile || null,
      });
      showToast("A fresh verification code has been dispatched to your email.");
      setResendCooldown(60);
    } catch (err) {
      showError(
        "Resend Failed",
        err.response?.data?.detail || "Unable to resend verification code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-4">
          <KeyRound className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
          Verify Official Email
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We sent a 6-digit confirmation code to{" "}
          <span className="font-semibold text-slate-900">{email}</span>
        </p>

        {/* Progress Step Indicator */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">✓</span>
            <span>Institution Info</span>
          </div>
          <div className="w-8 h-0.5 bg-indigo-600" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
            <span>Verify Email</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">3</span>
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

          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="font-medium text-slate-800">Registration for:</div>
            <div className="font-semibold text-slate-900">{registrationData?.college_name}</div>
            <div>Admin: {registrationData?.admin_name}</div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="6-Digit Verification Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              autoComplete="one-time-code"
              {...register("otp")}
              error={errors.otp?.message}
              helperText="Codes remain valid for 10 minutes."
              required
            />

            <div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" isLoading={isSubmitting}>
                Confirm & Continue
              </Button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleResendOtp}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  resendCooldown > 0 || isResending
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-indigo-600 hover:text-indigo-800"
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              to="/register-college"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Edit institution information
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
