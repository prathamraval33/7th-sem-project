// Lives in Navbar on all 3 dashboards; polls GET /notifications every 20s
// via React Query's refetchInterval for a near-live feel without WebSockets.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsApi } from "../../api/notifications.api";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getNotifications().then((res) => res.data),
    refetchInterval: 20000,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => notificationsApi.markRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-neutral-200 bg-white shadow-soft">
          <div className="border-b border-neutral-200 px-4 py-3">
            <p className="font-heading text-sm font-semibold text-neutral-800">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-neutral-500">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markReadMutation.mutate(notification.id)}
                  className={`block w-full border-b border-neutral-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-neutral-50 ${
                    notification.is_read ? "text-neutral-500" : "font-medium text-neutral-800"
                  }`}
                >
                  {notification.message}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
