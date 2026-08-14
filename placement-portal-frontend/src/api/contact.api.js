// Public Contact Us submission + role-guarded TPO/Admin message views.
// ASSUMPTION: `GET /contact/messages` and the mark read/resolved path aren't
// explicitly given in the master prompt; the backend is expected to scope
// results by the caller's role/category per the documented routing rule
// (placement -> TPO+Admin, general -> Admin only).
import axiosClient from "./axiosClient";

export const contactApi = {
  submit: ({ name, email, message, category }) =>
    axiosClient.post("/contact/submit", { name, email, message, category }),
  getPlacementMessages: () => axiosClient.get("/contact/placement"),
  getGeneralMessages: () => axiosClient.get("/contact/general"),
  getAllMessages: () => axiosClient.get("/contact/all"),
  updateMessageStatus: (messageId, status) =>
    axiosClient.patch(`/contact/${messageId}`, { status }),
};
