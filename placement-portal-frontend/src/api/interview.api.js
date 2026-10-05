// AI mock interview: start (manual or from-resume), answer submission,
// and final result retrieval — matches section 4 of the master prompt and mockinterview_improvement spec.
import axiosClient from "./axiosClient";

export const interviewApi = {
  start: ({ companyName, skills, mode, difficultyLevel = "fresher", driveId }) =>
    axiosClient.post("/mock-interview/start", {
      company_name: companyName,
      skills,
      mode,
      difficulty_level: difficultyLevel,
      drive_id: driveId,
    }),
  startFromResume: (resumeId, companyName, difficultyLevel = "fresher") =>
    axiosClient.post("/mock-interview/from-resume", {
      resume_id: resumeId,
      company_name: companyName,
      difficulty_level: difficultyLevel,
    }),
  submitAnswer: (sessionId, answerText) =>
    axiosClient.post(`/mock-interview/${sessionId}/answer`, { answer_text: answerText }),
  getNextQuestion: (sessionId) => axiosClient.get(`/mock-interview/${sessionId}/next-question`),
  getResult: (sessionId) => axiosClient.get(`/mock-interview/${sessionId}/result`),
};
