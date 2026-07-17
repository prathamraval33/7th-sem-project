// Notifications: list + mark-read, backing the shared NotificationBell.
import axiosClient from "./axiosClient";

export const notificationsApi = {
  getNotifications: () => axiosClient.get("/notifications"),
  markRead: (notificationId) => axiosClient.patch(`/notifications/${notificationId}/read`),
};
