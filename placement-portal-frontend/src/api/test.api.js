import axiosClient from "./axiosClient";

export const testApi = {
  getStudentTests: () => axiosClient.get("/instant-tests"),
  getTestDetails: (testId) => axiosClient.get(`/instant-tests/${testId}`),
  startAttempt: (testId) => axiosClient.post(`/instant-tests/${testId}/start`),
  sendHeartbeat: (attemptId) => axiosClient.post(`/instant-tests/attempts/${attemptId}/heartbeat`),
  logViolation: (attemptId, violationType, meta = {}) =>
    axiosClient.post(`/instant-tests/attempts/${attemptId}/violations`, {
      violation_type: violationType,
      meta,
    }),
  autosaveAnswer: (attemptId, questionId, selectedOptionIndex) =>
    axiosClient.post(`/instant-tests/attempts/${attemptId}/answer`, {
      question_id: questionId,
      selected_option_index: selectedOptionIndex,
    }),
  submitAttempt: (attemptId) => axiosClient.post(`/instant-tests/attempts/${attemptId}/submit`),
  getAttemptResults: (attemptId) => axiosClient.get(`/instant-tests/attempts/${attemptId}/results`),

  // TPO endpoints
  createTest: (testData) => axiosClient.post("/tpo/instant-tests", testData),
  createDriveTest: (driveId, testData) => axiosClient.post(`/tpo/drives/${driveId}/instant-test`, testData),
  getAttemptViolations: (attemptId) => axiosClient.get(`/tpo/instant-tests/attempts/${attemptId}/violations`),
  getTestResults: (testId) => axiosClient.get(`/tpo/instant-tests/${testId}/results`),
};
