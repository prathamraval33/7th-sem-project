// Admin: platform-wide drives/students/activity/analytics + moderation.
import axiosClient from "./axiosClient";

export const adminApi = {
  getDrives: () => axiosClient.get("/admin/drives"),
  updateDrive: (driveId, payload) => axiosClient.patch(`/admin/drives/${driveId}`, payload),
  deleteDrive: (driveId) => axiosClient.delete(`/admin/drives/${driveId}`),

  getStudents: (params) => axiosClient.get("/admin/students", { params }),
  getAllStudents: () => axiosClient.get("/admin/students/all"),
  // ASSUMPTION: mirrors the TPO equivalents (no explicit admin path given).
  deactivateStudent: (userId) => axiosClient.post(`/admin/students/${userId}/deactivate`),
  warnStudent: (userId, message) => axiosClient.post(`/admin/students/${userId}/warn`, { message }),
  setPlacementLockOverride: (userId, enabled) =>
    axiosClient.patch(`/admin/students/${userId}/placement-override`, { placement_lock_override: enabled }),
  notifyTpo: (tpoId, message) => axiosClient.post(`/admin/tpo/${tpoId}/notify`, { message }),

  getActivityFeed: () => axiosClient.get("/admin/activity"),
  getAnalytics: () => axiosClient.get("/admin/analytics"),
};
