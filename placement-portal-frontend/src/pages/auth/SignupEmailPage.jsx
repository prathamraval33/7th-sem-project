import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupEmailSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function SignupEmailPage() {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupEmailSchema),
  });

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      await authApi.signupRequestOtp(data.email);
      navigate("/signup/otp", { state: { email: data.email } });
    } catch (err) {
      console.error("OTP Request Failed:", err);
      setSubmitError(err.response?.data?.detail || "Failed to request OTP. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
          Create student account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-slate-900 hover:text-slate-800 underline">
            Sign in
          </Link>
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
            
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 mb-6">
              Only valid <strong>@bvmengineering.ac.in</strong> emails are allowed.
            </div>

            <Input
              label="College Email address"
              type="email"
              autoComplete="email"
              placeholder="e.g. 23it408@bvmengineering.ac.in"
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
