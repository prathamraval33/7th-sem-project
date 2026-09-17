import axiosClient from "./axiosClient";

export const superadminApi = {
  getDashboard: () => axiosClient.get("/superadmin/dashboard"),
  getColleges: () => axiosClient.get("/superadmin/colleges"),
  getCollege: (collegeId) => axiosClient.get(`/superadmin/colleges/${collegeId}`),
  createCollege: (payload) => axiosClient.post("/superadmin/colleges", payload),
  deleteCollege: (collegeId) => axiosClient.delete(`/superadmin/colleges/${collegeId}`),
  updateCollegeStatus: (collegeId, payload) =>
    axiosClient.patch(`/superadmin/colleges/${collegeId}/status`, payload),
  approveCollege: (collegeId) =>
    axiosClient.patch(`/superadmin/colleges/${collegeId}/approve`),
  rejectCollege: (collegeId, rejectionReason) =>
    axiosClient.patch(`/superadmin/colleges/${collegeId}/reject`, { rejection_reason: rejectionReason }),

  getFeatures: () => axiosClient.get("/superadmin/features"),
  createFeature: (payload) => axiosClient.post("/superadmin/features", payload),
  updateFeature: (featureId, payload) => axiosClient.patch(`/superadmin/features/${featureId}`, payload),
  deleteFeature: (featureId) => axiosClient.delete(`/superadmin/features/${featureId}`),
  getFeatureCollegeStatus: (featureId) => axiosClient.get(`/superadmin/features/${featureId}/colleges`),
  grantFeatureToCollege: (featureId, collegeId) =>
    axiosClient.post(`/superadmin/features/${featureId}/colleges/${collegeId}/grant`),
  revokeFeatureFromCollege: (featureId, collegeId) =>
    axiosClient.post(`/superadmin/features/${featureId}/colleges/${collegeId}/revoke`),

  getFeatureRequests: () => axiosClient.get("/superadmin/feature-requests"),
  approveFeatureRequest: (requestId) => axiosClient.post(`/superadmin/feature-requests/${requestId}/approve`),
  rejectFeatureRequest: (requestId) => axiosClient.post(`/superadmin/feature-requests/${requestId}/reject`),

  getAnnouncements: () => axiosClient.get("/superadmin/announcements"),
  createAnnouncement: (payload) => axiosClient.post("/superadmin/announcements", payload),

  getAuditLog: () => axiosClient.get("/superadmin/audit-log"),

  getAnalytics: () => axiosClient.get("/superadmin/analytics"),

  getSubscriptions: () => axiosClient.get("/superadmin/subscriptions"),
  getSubscriptionTransactions: (subscriptionId) =>
    axiosClient.get(`/superadmin/subscriptions/${subscriptionId}/transactions`),
  sendPaymentReminder: (subscriptionId) =>
    axiosClient.post(`/superadmin/subscriptions/${subscriptionId}/remind`),
  sendRenewalReminder: (subscriptionId) =>
    axiosClient.post(`/superadmin/subscriptions/${subscriptionId}/remind-renewal`),

  // Custom Feature Proposals from College Admins
  getCustomFeatureRequests: () => axiosClient.get("/superadmin/custom-features"),
  updateCustomFeatureRequest: (id, payload) =>
    axiosClient.patch(`/superadmin/custom-features/${id}`, payload),
};

