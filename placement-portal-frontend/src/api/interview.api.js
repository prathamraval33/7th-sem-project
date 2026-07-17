// AI mock interview: start (manual or from-resume), answer submission,
// and final result retrieval — matches section 4 of the master prompt.
import axiosClient from "./axiosClient";

export const interviewApi = {
  start: ({ companyName, skills, mode, driveId }) =>
    axiosClient.post("/mock-interview/start", {
      company_name: companyName,
      skills,
      mode,
      drive_id: driveId,
    }),
  startFromResume: (resumeId, companyName) =>
    axiosClient.post("/mock-interview/from-resume", { resume_id: resumeId, company_name: companyName }),
  submitAnswer: (sessionId, answerText) =>
    axiosClient.post(`/mock-interview/${sessionId}/answer`, { answer_text: answerText }),
  getResult: (sessionId) => axiosClient.get(`/mock-interview/${sessionId}/result`),
};
