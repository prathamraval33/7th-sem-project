// Resources library (student-facing browse + admin CRUD).
// ASSUMPTION: admin create/update/delete paths aren't explicitly given in
// the master prompt; named consistently with the documented `GET /resources`.
import axiosClient from "./axiosClient";

export const resourcesApi = {
  getResources: (params) => axiosClient.get("/resources", { params }),
  createResource: (payload) => axiosClient.post("/resources", payload),
  updateResource: (resourceId, payload) => axiosClient.patch(`/resources/${resourceId}`, payload),
  deleteResource: (resourceId) => axiosClient.delete(`/resources/${resourceId}`),
};
