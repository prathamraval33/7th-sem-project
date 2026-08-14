import React, { useState } from "react";
import { useLocation, useNavigate, Navigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordOtpSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import { showToast, showError } from "../../utils/swal";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function ForgotPasswordOtpPage() {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordOtpSchema),
  });

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      const res = await authApi.forgotPasswordVerifyOtp(email, data.otp);
      navigate("/forgot-password/reset", { 
        state: { resetToken: res.data.reset_token } 
      });
    } catch (err) {
      console.error("OTP Verification Failed:", err);
      setSubmitError(err.response?.data?.detail || "Invalid or expired OTP code.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
          Enter Verification Code
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {submitError && (
              <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">
                {submitError}
              </div>
            )}

            <Input
              label="6-Digit OTP Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="e.g. 123456"
              {...register("otp")}
              error={errors.otp?.message}
            />

            <div>
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Verify Code & Continue
              </Button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <Link to="/forgot-password" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Change email
            </Link>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={async () => {
                try {
                  await authApi.forgotPasswordRequestOtp(email);
                  showToast("A new OTP code has been sent to your email.");
                } catch (e) {
                  showError("Resend Failed", "Failed to resend OTP code.");
                }
              }}
            >
              Resend Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
