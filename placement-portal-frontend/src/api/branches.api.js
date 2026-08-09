import axiosClient from "./axiosClient";

export const branchesApi = {
  getBranches: () => axiosClient.get("/branches"),
  createBranch: (payload) => axiosClient.post("/admin/branches", payload),
  deleteBranch: (branchId) => axiosClient.delete(`/admin/branches/${branchId}`),
};
