import React, { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupPasswordSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import { useAuth } from "../../auth/useAuth";
import { setTokens } from "../../utils/tokenStorage";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function SignupPasswordPage() {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  
  const email = location.state?.email;
  const signupToken = location.state?.signupToken;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupPasswordSchema),
    defaultValues: { email: email || "" },
  });

  // If accessed directly without tokens, redirect to start
  if (!email || !signupToken) {
    return <Navigate to="/signup/email" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      const res = await authApi.signupComplete(data.email, signupToken, data.password);
      
      // The backend returns a JWT access_token & refresh_token upon successful completion
      setTokens({ 
        accessToken: res.data.access_token, 
        refreshToken: res.data.refresh_token 
      });
      
      // Hydrate user
      const { data: me } = await authApi.getMe();
      setUser(me);
      
      // Redirect to onboarding
      navigate("/student/onboarding", { replace: true });
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Failed to create account. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
          Set your password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Almost done! Create a secure password for <span className="font-semibold">{email}</span>.
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
              label="Password"
              type="password"
              {...register("password")}
              error={errors.password?.message}
              helperText="Must be at least 8 characters and contain at least one number."
            />
            
            <Input
              label="Confirm Password"
              type="password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />

            <div>
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Create Account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
