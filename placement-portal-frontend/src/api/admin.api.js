// Admin: platform-wide drives/students/activity/analytics + moderation.
import axiosClient from "./axiosClient";

export const adminApi = {
  getDrives: () => axiosClient.get("/admin/drives"),
  updateDrive: (driveId, payload) => axiosClient.patch(`/admin/drives/${driveId}`, payload),
  deleteDrive: (driveId) => axiosClient.delete(`/admin/drives/${driveId}`),

  getStudents: (params) => axiosClient.get("/admin/students", { params }),
  getAllStudents: () => axiosClient.get("/admin/students/all"),

  // Direct User Management (Admin can create, update, delete any user bypassing OTP)
  createUser: (payload) => axiosClient.post("/admin/users", payload),
  updateUser: (userId, payload) => axiosClient.patch(`/admin/users/${userId}`, payload),
  deleteUser: (userId) => axiosClient.delete(`/admin/users/${userId}`),

  deactivateStudent: (userId) => axiosClient.post(`/admin/students/${userId}/deactivate`),
  deleteStudent: (userId) => axiosClient.delete(`/admin/students/${userId}`),
  warnStudent: (userId, message) => axiosClient.post(`/admin/students/${userId}/warn`, { message }),
  setPlacementLockOverride: (userId, enabled) =>
    axiosClient.post("/admin/placement-override", { placement_lock_override: enabled }, { params: { user_id: userId } }),
  notifyTpo: (tpoId, message) => axiosClient.post(`/admin/tpo/${tpoId}/notify`, { message }),

  getActivityFeed: () => axiosClient.get("/admin/activity"),
  getAnalytics: () => axiosClient.get("/admin/analytics"),

  // Available Features & Razorpay Payment Flow
  getFeatures: () => axiosClient.get("/admin/features"),
  requestFeature: (featureId) => axiosClient.post(`/admin/features/${featureId}/request`),
  createPaymentOrder: (payload) => axiosClient.post("/payments/create-order", payload),
  createSubscriptionOrder: (collegeId) =>
    axiosClient.post("/payments/subscription/create-order", { college_id: collegeId }),
  verifyPayment: (payload) => axiosClient.post("/payments/verify", payload),
  getBillingTransactions: () => axiosClient.get("/admin/billing/transactions"),

  // Institution Settings & Allowed Domains
  getCollegeInfo: () => axiosClient.get("/admin/college"),
  getSetupChecklist: () => axiosClient.get("/admin/college/setup-checklist"),
  updateCollegeDomain: (domain) => axiosClient.patch("/admin/college/domain", { domain }),

  // Reference Sample Fee Templates (Multi-template support)
  getFeeTemplates: () => axiosClient.get("/admin/college/fee-templates"),
  getFeeTemplate: () => axiosClient.get("/admin/college/fee-template"),
  uploadFeeTemplate: (formData) =>
    axiosClient.post("/admin/college/fee-template", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  toggleFeeTemplateActive: (templateId) =>
    axiosClient.patch(`/admin/college/fee-templates/${templateId}/toggle-active`),
  deleteFeeTemplateById: (templateId) =>
    axiosClient.delete(`/admin/college/fee-templates/${templateId}`),
  deleteFeeTemplate: () => axiosClient.delete("/admin/college/fee-template"),

  // Custom Feature Requests / Proposals to SuperAdmin
  getCustomFeatures: () => axiosClient.get("/admin/custom-features"),
  createCustomFeature: (payload) => axiosClient.post("/admin/custom-features", payload),
};

