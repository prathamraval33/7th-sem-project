// TPO-side: drive management, eligible students, instant-test authoring,
// applicants/warnings, dashboard summary, and department/package analytics.
import axiosClient from "./axiosClient";

export const tpoApi = {
  getDashboardSummary: () => axiosClient.get("/tpo/dashboard/summary"),

  getCompanies: () => axiosClient.get("/tpo/companies"),
  createCompany: (payload) => axiosClient.post("/tpo/companies", payload),

  createDrive: (payload) => axiosClient.post("/tpo/drives", payload),
  getDrives: () => axiosClient.get("/tpo/drives"),
  getEligibleStudents: (driveId) => axiosClient.get(`/tpo/drives/${driveId}/eligible-students`),
  getApplicants: (driveId) => axiosClient.get(`/tpo/drives/${driveId}/applicants`),
  closeDrive: (driveId) => axiosClient.post(`/tpo/drives/${driveId}/close`),
  closeTest: (driveId) => axiosClient.post(`/tpo/drives/${driveId}/close-test`),
  removeStudentFromDrive: (driveId, userId) =>
    axiosClient.delete(`/tpo/drives/${driveId}/remove-student/${userId}`),

  getAllStudents: () => axiosClient.get("/tpo/students/all"),
  deactivateStudent: (userId) => axiosClient.post(`/tpo/students/${userId}/deactivate`),
  warnStudent: (userId, message) => axiosClient.post(`/tpo/students/${userId}/warn`, { message }),
  // ASSUMPTION: no explicit path given for toggling the dream-company
  // override; named consistently with the other /tpo/students/{id}/* actions.
  setPlacementLockOverride: (userId, enabled) =>
    axiosClient.patch(`/tpo/students/${userId}/placement-override`, { placement_lock_override: enabled }),

  createInstantTest: (driveId, payload) => axiosClient.post(`/tpo/drives/${driveId}/instant-test`, payload),
  getInstantTestResults: (testId) => axiosClient.get(`/tpo/instant-tests/${testId}/results`),
  getInstantTestAnalytics: (testId) => axiosClient.get(`/tpo/instant-tests/${testId}/analytics`),
  closeInstantTest: (testId) => axiosClient.post(`/tpo/instant-tests/${testId}/close`),
  getInstantTestHistory: () => axiosClient.get("/tpo/instant-tests/history"),

  getAnalytics: (driveId) => axiosClient.get(`/tpo/analytics/${driveId}`),
};
