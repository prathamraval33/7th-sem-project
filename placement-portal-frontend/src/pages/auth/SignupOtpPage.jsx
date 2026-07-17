import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupOtpSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function SignupOtpPage() {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupOtpSchema),
    defaultValues: { email: email || "" },
  });

  // If accessed directly without an email in state, redirect to email step
  if (!email) {
    return <Navigate to="/signup/email" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      const res = await authApi.signupVerifyOtp(data.email, data.otp);
      const signupToken = res.data.token;
      
      navigate("/signup/password", { 
        state: { email: data.email, signupToken } 
      });
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Invalid or expired OTP. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          We sent a 6-digit code to <span className="font-semibold text-slate-900">{email}</span>
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
              label="6-digit Verification Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              {...register("otp")}
              error={errors.otp?.message}
            />

            <div>
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Verify Code
              </Button>
            </div>
            
            <div className="text-center mt-4">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={async () => {
                  try {
                    await authApi.signupRequestOtp(email);
                    alert("A new OTP has been sent to your email.");
                  } catch (e) {
                    alert("Failed to resend OTP.");
                  }
                }}
              >
                Resend Code
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
