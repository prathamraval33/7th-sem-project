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

export const studentEmailSchema = z
  .string()
  .email("Invalid email address");

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
  email: studentEmailSchema,
});

export const signupOtpSchema = z.object({
  email: studentEmailSchema,
  otp: otpSchema,
});

export const signupPasswordSchema = z.object({
  email: studentEmailSchema,
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
  branch: z.string().min(1, "Branch is required"),
  cgpa: z.coerce.number().min(0).max(10, "CGPA must be between 0 and 10"),
  active_backlogs: z.coerce.number().int().min(0, "Backlogs cannot be negative"),
  tenth_percentage: z.coerce.number().min(0).max(100, "Percentage must be between 0 and 100"),
  twelfth_percentage: z.coerce.number().min(0).max(100, "Percentage must be between 0 and 100"),
  competitive_exam_name: z.preprocess((val) => (val && typeof val === "string" && val.trim() !== "" ? val.trim() : null), z.string().nullable().optional()),
  competitive_exam_percentile: z.preprocess((val) => (val === "" || val === null || val === undefined || isNaN(val) ? null : Number(val)), z.number().min(0).max(100).nullable().optional()),
  skills: z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),
});

// --- Contact Us Schema ---
export const contactUsSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  category: z.enum(["general", "placement"]),
  message: z.string().min(10, "Message must be at least 10 characters long"),
});

// --- College Self-Service Onboarding Schemas ---
const BLOCKED_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me", "protonmail.com"];

export const collegeRegistrationRequestSchema = z.object({
  college_name: z.string().min(3, "College name must be at least 3 characters"),
  admin_name: z.string().min(2, "Administrator name must be at least 2 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .refine((val) => {
      const parts = val.toLowerCase().split("@");
      if (parts.length !== 2) return true;
      return !BLOCKED_DOMAINS.includes(parts[1].trim());
    }, {
      message: "Public/free email domains (gmail, yahoo, etc.) are not accepted. Please use your official institution email.",
    }),
  mobile: z
    .string()
    .regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
});

export const collegeRegistrationOtpSchema = z.object({
  otp: otpSchema,
});

export const collegeRegistrationPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

