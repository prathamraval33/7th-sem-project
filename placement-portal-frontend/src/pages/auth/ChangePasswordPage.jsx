import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "../../utils/validators";
import { authApi } from "../../api/auth.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP, 3: change password, 4: success
  const [otp, setOtp] = useState("");
  const [changeToken, setChangeToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const handleRequestOtp = async () => {
    try {
      setIsLoading(true);
      setError("");
      await authApi.requestChangePasswordOtp();
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to request OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError("");
      const res = await authApi.verifyChangePasswordOtp({ email: user.email, otp });
      setChangeToken(res.data.change_token);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPassword = async (data) => {
    try {
      setError("");
      await authApi.completeChangePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
        change_token: changeToken
      });
      setStep(4);
      reset();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password.");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-100">
          <div className="p-2 bg-slate-100 rounded-lg">
            <KeyRound className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">Change Password</h2>
            <p className="text-sm text-slate-500">Update your account security credentials</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-start space-x-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Security Verification Required</h4>
                <p className="text-sm text-blue-700 mt-1">
                  To protect your account, we need to verify your identity before allowing a password change. We will send a verification code to <strong>{user?.email}</strong>.
                </p>
              </div>
            </div>
            <Button onClick={handleRequestOtp} isLoading={isLoading} className="w-full">
              Send Verification Code
            </Button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <p className="text-sm text-slate-600">
              Enter the 6-digit verification code sent to <strong>{user?.email}</strong>.
            </p>
            <Input
              label="Verification Code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading} className="flex-1" disabled={otp.length !== 6}>
                Verify
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-6">
            <Input
              label="Current Password"
              type="password"
              {...register("currentPassword")}
              error={errors.currentPassword?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...register("newPassword")}
              error={errors.newPassword?.message}
              helperText="Must be at least 8 characters and contain at least one number."
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} className="flex-1">
                Update Password
              </Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Password Updated!</h3>
            <p className="text-sm text-slate-600 mb-6">Your password has been changed successfully.</p>
            <Button onClick={() => setStep(1)} variant="outline">
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
