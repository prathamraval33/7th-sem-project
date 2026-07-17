import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordEmailSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordEmailPage() {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordEmailSchema),
  });

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      await authApi.forgotPasswordRequestOtp(data.email);
      navigate("/forgot-password/otp", { state: { email: data.email } });
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Failed to request OTP. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to login
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 font-heading">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter your email address and we'll send you a verification code.
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
              label="Email address"
              type="email"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
            />

            <div>
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Send Verification Code
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
