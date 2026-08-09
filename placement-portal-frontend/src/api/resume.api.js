import axiosClient from "./axiosClient";

export const resumeApi = {
  upload: (formData) =>
    axiosClient.post("/student/resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadResume: (fileOrFormData) => {
    let formData = fileOrFormData;
    if (fileOrFormData instanceof File) {
      formData = new FormData();
      formData.append("file", fileOrFormData);
    }
    return axiosClient.post("/student/resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getHistory: () => axiosClient.get("/student/resumes"),
  setActive: (resumeId) => axiosClient.patch(`/student/resumes/${resumeId}/activate`),

  analyze: (resumeId) => axiosClient.post(`/resume-analyzer/${resumeId}`),

  enhancerStart: (resumeId) => axiosClient.post(`/resume-enhancer/start?resume_id=${resumeId}`),
  enhancerFinalize: (payload) => axiosClient.post("/resume-enhancer/finalize", payload),
};
