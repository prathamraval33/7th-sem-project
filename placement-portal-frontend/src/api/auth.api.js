// Auth: signup OTP flow, login, refresh/logout, forgot-password OTP flow,
// OTP-gated change-password, and profile fetch/update.
import axiosClient from "./axiosClient";

export const authApi = {
  signupRequestOtp: (email) => axiosClient.post("/auth/signup/request-otp", { email }),
  signupVerifyOtp: (email, otp) => axiosClient.post("/auth/signup/verify-otp", { email, otp }),
  signupComplete: (email, signupToken, password) =>
    axiosClient.post("/auth/signup/complete", { email, signup_token: signupToken, password }),

  login: (email, password) => axiosClient.post("/auth/login", { email, password }),
  refresh: (refreshToken) => axiosClient.post("/auth/refresh", { refresh_token: refreshToken }),
  logout: (refreshToken) => axiosClient.post("/auth/logout", { refresh_token: refreshToken }),

  getMe: () => axiosClient.get("/auth/me"),
  updateProfile: (payload) => axiosClient.patch("/auth/profile", payload),
  updateMyProfile: (payload) => axiosClient.patch("/auth/profile", payload),

  changePasswordRequestOtp: () => axiosClient.post("/auth/change-password/request-otp"),
  changePasswordVerifyOtp: (email, otp) => axiosClient.post("/auth/change-password/verify-otp", { email, otp }),
  changePasswordComplete: (currentPassword, newPassword, changeToken) =>
    axiosClient.post("/auth/change-password/complete", {
      current_password: currentPassword,
      new_password: newPassword,
      change_token: changeToken,
    }),

  forgotPasswordRequestOtp: (email) => axiosClient.post("/auth/forgot-password/request-otp", { email }),
  forgotPasswordVerifyOtp: (email, otp) => axiosClient.post("/auth/forgot-password/verify-otp", { email, otp }),
  forgotPasswordReset: (email, resetToken, newPassword) =>
    axiosClient.post("/auth/forgot-password/reset", {
      email,
      reset_token: resetToken,
      new_password: newPassword,
    }),
};
