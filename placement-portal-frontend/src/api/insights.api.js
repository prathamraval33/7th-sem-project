// Live Career Insights: combined internal-drives + external/AI dashboard
// data, plus the rate-limited manual refresh action.
import axiosClient from "./axiosClient";

export const insightsApi = {
  getDashboardInsights: () => axiosClient.get("/insights/dashboard"),
  refreshInsights: () => axiosClient.post("/insights/refresh"),
};
