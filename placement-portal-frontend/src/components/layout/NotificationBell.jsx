// Lives in Navbar on all 3 dashboards and SuperAdmin Console; polls GET /notifications every 20s
// via React Query's refetchInterval for a near-live feel without WebSockets.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Flag,
  Inbox,
  Puzzle,
  CreditCard,
  Clock,
  XCircle,
} from "lucide-react";
import { notificationsApi } from "../../api/notifications.api";
import { useHoverPinnedDropdown } from "../../hooks/useHoverPinnedDropdown";

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function getNotificationVisual(notification) {
  const type = notification.type;
  const message = String(notification.message || "").toLowerCase();

  // Specific notification types first
  if (type === "feature_request_received") {
    return {
      Icon: Puzzle,
      chipBg: "bg-blue-50",
      chipText: "text-blue-600",
      emphasis: "text-blue-600",
      title: "Feature Request Received",
    };
  }

  if (type === "feature_request_decided") {
    const isApproved = message.includes("approved");
    return {
      Icon: isApproved ? CheckCircle2 : XCircle,
      chipBg: isApproved ? "bg-emerald-50" : "bg-red-50",
      chipText: isApproved ? "text-emerald-600" : "text-red-600",
      emphasis: isApproved ? "text-emerald-600" : "text-red-600",
      title: isApproved ? "Feature Approved" : "Feature Request Rejected",
    };
  }

  if (type === "payment_completion_required") {
    return {
      Icon: CreditCard,
      chipBg: "bg-amber-50",
      chipText: "text-amber-600",
      emphasis: "text-amber-600",
      title: "Payment Action Required",
    };
  }

  if (type === "payment_reminder") {
    return {
      Icon: Clock,
      chipBg: "bg-amber-50",
      chipText: "text-amber-600",
      emphasis: "text-amber-600",
      title: "Payment Reminder",
    };
  }

  if (type === "subscription_expiring_soon") {
    return {
      Icon: AlertTriangle,
      chipBg: "bg-amber-50",
      chipText: "text-amber-600",
      emphasis: "text-amber-600",
      title: "Subscription Expiring Soon",
    };
  }

  if (type === "approval_expired") {
    return {
      Icon: XCircle,
      chipBg: "bg-red-50",
      chipText: "text-red-600",
      emphasis: "text-red-600",
      title: "Approval Expired",
    };
  }

  const isStatusUpdate =
    message.includes("shortlisted") ||
    message.includes("selected") ||
    message.includes("rejected") ||
    message.includes("eligible") ||
    message.includes("applied");

  if (message.includes("rejected")) {
    return {
      Icon: AlertTriangle,
      chipBg: "bg-red-50",
      chipText: "text-red-600",
      emphasis: "text-red-600",
      title: "Application Update",
    };
  }

  if (message.includes("selected") || message.includes("shortlisted")) {
    return {
      Icon: CheckCircle2,
      chipBg: "bg-green-50",
      chipText: "text-green-600",
      emphasis: "text-green-600",
      title: "Application Update",
    };
  }

  if (
    type === "warning" ||
    type === "test_violation" ||
    type === "test_auto_ended"
  ) {
    return {
      Icon: AlertTriangle,
      chipBg: "bg-amber-50",
      chipText: "text-amber-600",
      emphasis: "text-amber-600",
      title: "Warning Alert",
    };
  }

  if (type === "notice") {
    return {
      Icon: Bell,
      chipBg: "bg-blue-50",
      chipText: "text-blue-600",
      emphasis: "text-blue-600",
      title: "General Notice",
    };
  }

  if (isStatusUpdate) {
    return {
      Icon: Flag,
      chipBg: "bg-blue-50",
      chipText: "text-blue-600",
      emphasis: "text-blue-600",
      title: "Application Update",
    };
  }

  return {
    Icon: Bell,
    chipBg: "bg-blue-50",
    chipText: "text-blue-600",
    emphasis: "text-blue-600",
    title: type === "system" ? "System Notice" : "Notification",
  };
}

function renderMessage(message, emphasisClass) {
  const text = String(message || "");
  const quotedRegex = /'([^']+)'/g;
  const parts = [];

  let lastIndex = 0;
  let match;
  while ((match = quotedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "emphasis", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", value: text });
  }

  return parts.map((part, index) => {
    if (part.type === "emphasis") {
      return (
        <span key={`${part.value}-${index}`} className={`font-medium ${emphasisClass}`}>
          {part.value}
        </span>
      );
    }
    return <span key={`${part.value}-${index}`}>{part.value}</span>;
  });
}

export default function NotificationBell({ variant = "default" }) {
  const isCommandDeck = variant === "commandDeck";
  const {
    isOpen,
    wrapperRef,
    handleMouseEnter,
    handleMouseLeave,
    handleTogglePin,
  } = useHoverPinnedDropdown();

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

  const handleMarkAllRead = () => {
    notifications
      .filter((n) => !n.is_read)
      .forEach((n) => {
        markReadMutation.mutate(n.id);
      });
  };

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleTogglePin}
        className={
          isCommandDeck
            ? "relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none"
            : "relative rounded-md p-2 text-neutral-600 hover:bg-neutral-100"
        }
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={isCommandDeck ? 18 : 20} />
        {unreadCount > 0 && (
          <span
            className={
              isCommandDeck
                ? "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white shadow-sm"
                : "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold text-white ring-2 ring-white shadow-md animate-pulse"
            }
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={
            isCommandDeck
              ? "absolute right-0 z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
              : "absolute right-0 z-20 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-lg"
          }
        >
          <div
            className={
              isCommandDeck
                ? "flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-4 py-2.5"
                : "flex items-center justify-between border-b border-gray-100 px-4 py-3"
            }
          >
            <p className={isCommandDeck ? "text-xs font-bold tracking-wider uppercase text-slate-700" : "text-base font-semibold text-gray-900"}>
              Notifications
            </p>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Inbox size={18} />
                </div>
                <p className="text-sm font-medium text-gray-700">No notifications yet</p>
                <p className="mt-1 text-xs text-gray-500">Updates and alerts will appear here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markReadMutation.mutate(notification.id)}
                  className="block w-full cursor-pointer border-b border-gray-100 p-3 text-left transition-colors last:border-0 hover:rounded-lg hover:bg-gray-50"
                >
                  {(() => {
                    const visual = getNotificationVisual(notification);
                    return (
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full ${visual.chipBg} ${visual.chipText}`}>
                          <visual.Icon size={14} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <p className={`text-sm font-semibold ${notification.is_read ? "text-gray-700" : "text-gray-900"}`}>
                                {visual.title}
                              </p>
                              {notification.sender_name && (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                  From {notification.sender_name} {notification.sender_role ? `(${notification.sender_role})` : ""}
                                </span>
                              )}
                            </div>
                            {!notification.is_read && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-blue-500" />}
                          </div>

                          <p className={`mt-1 text-sm leading-5 ${notification.is_read ? "text-gray-500" : "text-gray-600"}`}>
                            {renderMessage(notification.message, visual.emphasis)}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(notification.created_at)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
