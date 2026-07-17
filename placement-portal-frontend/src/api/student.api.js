// Student-facing profile, fee-verification, applications tracker, and
// weak-area tracking. Instant-test *attempt* calls (the student side, as
// opposed to the TPO-authoring side in tpo.api.js) are grouped here too —
// ASSUMPTION: the master prompt doesn't give an explicit path for the
// student-facing instant-test fetch/submit, so `/instant-tests/{id}` and
// `/instant-tests/{id}/attempt` are used, mirroring the `instant_test.py`
// router named in the backend folder structure.
import axiosClient from "./axiosClient";

export const studentApi = {
  createProfile: (payload) => axiosClient.post("/student/profile", payload),
  getWeakAreas: () => axiosClient.get("/student/weak-areas"),

  getFeeVerificationStatus: () => axiosClient.get("/fee-verification/status"),
  uploadFeeReceipt: (formData) =>
    axiosClient.post("/fee-verification/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getApplications: () => axiosClient.get("/student/applications"),
  withdrawApplication: (applicationId) =>
    axiosClient.post(`/student/applications/${applicationId}/withdraw`),

  getInstantTest: (testId) => axiosClient.get(`/instant-tests/${testId}`),
  submitInstantTestAttempt: (testId, answers) =>
    axiosClient.post(`/instant-tests/${testId}/attempt`, { answers }),
};
