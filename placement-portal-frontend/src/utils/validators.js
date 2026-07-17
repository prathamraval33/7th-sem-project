import { z } from "zod";

// --- Base Rules ---
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/\d/, "Password must contain at least one number");

export const bvmEmailSchema = z
  .string()
  .email("Invalid email address")
  .regex(/@bvmengineering\.ac\.in$/i, "Email must be a valid @bvmengineering.ac.in address");

export const otpSchema = z
  .string()
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d+$/, "OTP must contain only numbers");

// --- Auth Schemas ---
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupEmailSchema = z.object({
  email: bvmEmailSchema,
});

export const signupOtpSchema = z.object({
  email: bvmEmailSchema,
  otp: otpSchema,
});

export const signupPasswordSchema = z.object({
  email: bvmEmailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const forgotPasswordEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const forgotPasswordOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: otpSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// --- Student Profile/Onboarding Schemas ---
export const studentOnboardingSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  branch: z.string().min(2, "Branch is required"),
  cgpa: z.coerce.number().min(0).max(10, "CGPA must be between 0 and 10"),
  active_backlogs: z.coerce.number().int().min(0, "Backlogs cannot be negative"),
  tenth_percentage: z.coerce.number().min(0).max(100, "Percentage must be between 0 and 100"),
  twelfth_percentage: z.coerce.number().min(0).max(100, "Percentage must be between 0 and 100"),
  competitive_exam_name: z.string().transform((val) => val.trim() === "" ? null : val.trim()).optional().nullable(),
  competitive_exam_percentile: z.union([z.coerce.number().min(0).max(100), z.literal("")]).transform((val) => val === "" ? null : val).optional().nullable(),
  skills: z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),
});

// --- Contact Us Schema ---
export const contactUsSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  category: z.enum(["general", "placement"]),
  message: z.string().min(10, "Message must be at least 10 characters long"),
});
