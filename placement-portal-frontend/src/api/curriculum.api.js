import axiosClient from "./axiosClient";

export const curriculumApi = {
  // Admin upload and review
  uploadCurriculum: (formData) =>
    axiosClient.post("/curriculum/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getLatestUpload: () => axiosClient.get("/curriculum/latest"),
  confirmCurriculum: (uploadId, payload) =>
    axiosClient.post(`/curriculum/uploads/${uploadId}/confirm`, payload),

  // Branch & Subject retrieval
  getBranches: () => axiosClient.get("/curriculum/branches"),
  getSubjects: (params) => axiosClient.get("/curriculum/subjects", { params }),

  // TPO prioritization & curation
  togglePrioritize: (subjectId) =>
    axiosClient.post(`/curriculum/subjects/${subjectId}/prioritize`),
  curateSubject: (subjectId) =>
    axiosClient.post(`/curriculum/subjects/${subjectId}/curate`),

  // Resources retrieval & review
  getSubjectResources: (subjectId) =>
    axiosClient.get(`/curriculum/subjects/${subjectId}/resources`),
  reviewResource: (resourceId, payload) =>
    axiosClient.patch(`/curriculum/resources/${resourceId}/review`, payload),
};
