import React, { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = location.state?.email;
  const resetToken = location.state?.resetToken;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!email || !resetToken) {
    return <Navigate to="/forgot-password/email" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      await authApi.resetPassword({
        email,
        reset_token: resetToken,
        new_password: data.password
      });
      setIsSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Failed to reset password. Please try again.");
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset</h2>
          <p className="text-slate-600 mb-6">Your password has been reset successfully.</p>
          <Button onClick={() => navigate("/login")} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Create a new, strong password for your account.
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
              label="New Password"
              type="password"
              {...register("password")}
              error={errors.password?.message}
              helperText="Must be at least 8 characters and contain at least one number."
            />
            
            <Input
              label="Confirm New Password"
              type="password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />

            <div>
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Reset Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
