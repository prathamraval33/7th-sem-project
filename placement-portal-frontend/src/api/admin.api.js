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
};
