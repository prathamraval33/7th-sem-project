import axiosClient from "./axiosClient";

export const tpoReportsApi = {
  getReportSummary: () => axiosClient.get("/tpo/reports/summary"),
  getReportPreview: (reportType) =>
    axiosClient.get("/tpo/reports/data", { params: { report_type: reportType } }),
  downloadReportCSV: (reportType) =>
    axiosClient.get("/tpo/reports/export/csv", {
      params: { report_type: reportType },
      responseType: "blob",
    }),
  printReportPDF: (reportType) =>
    axiosClient.get("/tpo/reports/export/pdf", {
      params: { report_type: reportType },
      responseType: "blob",
      headers: { Accept: "text/html" },
    }),
};
