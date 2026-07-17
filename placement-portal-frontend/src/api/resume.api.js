// Resume upload/history/activation, resume analyzer, resume enhancer.
// ASSUMPTION: `GET /resume` (history list) and `PATCH /resume/{id}/activate`
// ("make active" toggle) aren't given explicit paths in the master prompt
// but are required by ResumeUploadPage's documented behavior.
import axiosClient from "./axiosClient";

export const resumeApi = {
  upload: (formData) =>
    axiosClient.post("/student/resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getHistory: () => axiosClient.get("/student/resumes"),
  setActive: (resumeId) => axiosClient.patch(`/student/resumes/${resumeId}/activate`),

  analyze: (resumeId) => axiosClient.post(`/resume-analyzer/${resumeId}`),

  enhancerStart: (resumeId) => axiosClient.post(`/resume-enhancer/start?resume_id=${resumeId}`),
  enhancerFinalize: (payload) => axiosClient.post("/resume-enhancer/finalize", payload),
};
