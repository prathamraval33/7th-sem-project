// Drive browsing/matching + applying. ASSUMPTION: `GET /drives` and
// `GET /drives/{id}` (general listing/detail, beyond just the eligibility-
// matched subset) aren't explicitly pathed in the master prompt but are
// required by DrivesListPage/DriveDetailPage; named consistently with the
// documented `GET /drives/matched`.
import axiosClient from "./axiosClient";

export const drivesApi = {
  getMatchedDrives: () => axiosClient.get("/drives/matched"),
  getDrives: (params) => axiosClient.get("/drives", { params }),
  getDrive: (driveId) => axiosClient.get(`/drives/${driveId}`),
  applyToDrive: (driveId) => axiosClient.post("/applications", { drive_id: driveId }),
};
