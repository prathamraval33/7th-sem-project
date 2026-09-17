import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, User, Mail, Phone, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { collegeRegistrationRequestSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function RegisterCollegePage() {
  const [submitError, setSubmitError] = useState("");
  const [collisionError, setCollisionError] = useState(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(collegeRegistrationRequestSchema),
    defaultValues: {
      college_name: "",
      admin_name: "",
      email: "",
      mobile: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      setCollisionError(null);
      const payload = {
        college_name: data.college_name.trim(),
        admin_name: data.admin_name.trim(),
        email: data.email.trim().toLowerCase(),
        mobile: data.mobile?.trim() || null,
        mobile_number: data.mobile?.trim() || null,
      };

      await authApi.collegeRegistrationRequestOtp(payload);

      // Navigate to OTP verification with registration context
      navigate("/register-college/otp", {
        state: {
          email: payload.email,
          college_name: payload.college_name,
          admin_name: payload.admin_name,
          mobile: payload.mobile,
        },
      });
    } catch (err) {
      console.error("College Registration Request Failed:", err);
      const detail = err.response?.data?.detail;
      const isCollision = err.response?.status === 409 || err.response?.data?.domain_in_use;

      if (isCollision) {
        setCollisionError(
          typeof detail === "string"
            ? detail
            : "This college domain is already registered on our platform. A security notice has been sent to the existing administrative team."
        );
      } else {
        setSubmitError(
          typeof detail === "string"
            ? detail
            : "Failed to submit registration. Please verify the information and try again."
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
          Register Your Institution
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Start your campus placement management. Register your college with an official institution email to get started.
        </p>

        {/* Progress Step Indicator */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
            <span>Institution Info</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">2</span>
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
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 sm:rounded-2xl">
          {/* Domain Collision Alert Banner */}
          {collisionError && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold text-amber-900">Institution Domain Already Registered</h4>
                <p className="mt-1 text-amber-800 leading-relaxed">{collisionError}</p>
                <div className="mt-3 flex items-center gap-4">
                  <Link
                    to="/login"
                    className="font-semibold text-amber-900 underline hover:text-amber-950"
                  >
                    Go to Sign In
                  </Link>
                  <Link
                    to="/contact"
                    className="font-medium text-amber-800 hover:text-amber-900 underline"
                  >
                    Contact Platform Support
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Standard Submission Error */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{submitError}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                label="College / Institution Name"
                placeholder="e.g. Birla Vishvakarma Mahavidyalaya"
                autoComplete="organization"
                {...register("college_name")}
                error={errors.college_name?.message}
                required
              />
            </div>

            <div>
              <Input
                label="Administrator Full Name"
                placeholder="e.g. Dr. Rajesh Patel"
                autoComplete="name"
                {...register("admin_name")}
                error={errors.admin_name?.message}
                required
              />
            </div>

            <div>
              <Input
                label="Official Institution Email"
                type="email"
                placeholder="e.g. admin@bvmengineering.ac.in"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
                helperText="Must use your official institutional domain. Free domains (gmail, yahoo, etc.) are strictly rejected."
                required
              />
            </div>

            <div>
              <Input
                label="Administrator Mobile Number (Optional)"
                type="tel"
                placeholder="e.g. 9876543210"
                autoComplete="tel"
                {...register("mobile")}
                error={errors.mobile?.message}
                helperText="Used for urgent operational alerts. Displayed as unverified until verified by SuperAdmin."
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" isLoading={isSubmitting}>
                Continue to Email Verification
              </Button>
            </div>
          </form>

          {/* Bottom Links */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              Already registered?{" "}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800 underline">
                Sign in to Dashboard
              </Link>
            </span>
            <span>
              Are you a student?{" "}
              <Link to="/signup/email" className="font-semibold text-slate-700 hover:text-slate-900 underline">
                Student Sign Up
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
