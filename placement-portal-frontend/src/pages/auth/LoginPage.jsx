import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../../utils/validators";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { ROLES } from "../../utils/constants";

export default function LoginPage() {
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      const user = await login(data.email, data.password);
      
      // Determine redirect path
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }
      
      if (user.user_type === ROLES.STUDENT) {
        if (!user.profile_complete) {
          navigate("/student/onboarding", { replace: true });
        } else {
          navigate("/student/dashboard", { replace: true });
        }
      } else if (user.user_type === ROLES.TPO) {
        navigate("/tpo/dashboard", { replace: true });
      } else if (user.user_type === ROLES.ADMIN) {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-heading">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{" "}
          <Link to="/signup/email" className="font-medium text-slate-900 hover:text-slate-800 underline">
            create a new student account
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

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
            />

            <div>
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                error={errors.password?.message}
              />
              <div className="flex items-center justify-end mt-1">
                <div className="text-sm">
                  <Link to="/forgot-password/email" className="font-medium text-slate-600 hover:text-slate-900">
                    Forgot your password?
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
