import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import {
  Activity,
  MessageSquare,
  Mail,
  ShieldCheck,
  Send,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  User,
  Users,
  Building2,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Phone,
  RefreshCw,
  X,
  FileText,
  Copy,
  Check,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import { showToast, showSuccess, showError } from "../../utils/swal";

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso) {
  if (!iso) return "";
  const sec = Math.floor((new Date() - new Date(iso)) / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(iso);
}

const CATEGORY_STYLES = {
  inquiry: { label: "Contact Inquiry", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  broadcast: { label: "Admin Broadcast", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  warning: { label: "Disciplinary Warning", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  notice: { label: "Notice", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  system: { label: "System Notification", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

const SEVERITY_CONFIG = {
  info: { label: "Info", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: Info },
  warning: { label: "Warning", badge: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle },
  critical: { label: "Critical", badge: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertTriangle },
  success: { label: "Success", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

export default function AdminActivitiesPage() {
  const queryClient = useQueryClient();
  const [activeWindow, setActiveWindow] = useState("messages"); // "messages" | "audit"

  // ── Window 1: Messages State ──
  const [msgFilter, setMsgFilter] = useState("all"); // all, inquiry, broadcast, warning, notice
  const [msgStatusFilter, setMsgStatusFilter] = useState("all"); // all, new, resolved
  const [msgSearch, setMsgSearch] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [whatsAppPhoneOverride, setWhatsAppPhoneOverride] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  // ── Window 2: Audit Logs State ──
  const [auditCategoryFilter, setAuditCategoryFilter] = useState("all");
  const [auditSeverityFilter, setAuditSeverityFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // ── Broadcast Form State ──
  const [broadcastForm, setBroadcastForm] = useState({
    target_audience: "all_students",
    subject: "",
    message: "",
    severity: "notice",
    target_email: "",
  });
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // ── Queries ──
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["admin", "messages"],
    queryFn: async () => {
      const res = await adminApi.getMessages();
      return res.data || [];
    },
  });

  const {
    data: activityLogs = [],
    isLoading: isLoadingActivity,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["admin", "activity_feed"],
    queryFn: async () => {
      const res = await adminApi.getActivityFeed();
      return res.data || [];
    },
  });

  // ── Mutations ──
  const updateStatusMutation = useMutation({
    mutationFn: async ({ sourceType, messageId, status }) => {
      return await adminApi.updateMessageStatus(sourceType, messageId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity_feed"] });
      showToast("Message status updated", "success");
    },
    onError: (err) => {
      showError("Status Update Failed", err?.response?.data?.detail || "Could not update status.");
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (payload) => {
      return await adminApi.sendBroadcastMessage(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity_feed"] });
      setIsBroadcastModalOpen(false);
      setBroadcastForm({
        target_audience: "all_students",
        subject: "",
        message: "",
        severity: "notice",
        target_email: "",
      });
      showSuccess("Broadcast Dispatched", res?.data?.message || "Notification sent successfully.");
    },
    onError: (err) => {
      showError("Broadcast Failed", err?.response?.data?.detail || "Failed to deliver broadcast.");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (payload) => {
      return await adminApi.replyMessage(payload);
    },
    onSuccess: () => {
      setReplyText("");
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity_feed"] });
      showToast("Reply sent to recipient", "success");
    },
    onError: (err) => {
      showError("Reply Failed", err?.response?.data?.detail || "Could not dispatch reply.");
    },
  });

  // ── Filtered Messages ──
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (msgFilter !== "all" && m.category !== msgFilter) return false;
      if (msgStatusFilter === "new" && (m.status !== "new" && m.is_read)) return false;
      if (msgStatusFilter === "resolved" && m.status !== "resolved") return false;
      if (msgSearch.trim()) {
        const q = msgSearch.toLowerCase();
        const matchSubject = m.subject?.toLowerCase().includes(q);
        const matchContent = m.content?.toLowerCase().includes(q);
        const matchSender = m.sender_name?.toLowerCase().includes(q) || m.sender_email?.toLowerCase().includes(q);
        if (!matchSubject && !matchContent && !matchSender) return false;
      }
      return true;
    });
  }, [messages, msgFilter, msgStatusFilter, msgSearch]);

  // Selected Active Message
  const activeMessage = useMemo(() => {
    if (!messages.length) return null;
    if (!selectedMessageId) return filteredMessages[0] || messages[0];
    return messages.find((m) => m.id === selectedMessageId) || filteredMessages[0] || messages[0];
  }, [messages, selectedMessageId, filteredMessages]);

  // Unread Messages Count
  const unreadCount = useMemo(() => {
    return messages.filter((m) => m.status === "new" || !m.is_read).length;
  }, [messages]);

  // ── Filtered Audit Logs ──
  const filteredAuditLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (auditCategoryFilter !== "all" && log.category !== auditCategoryFilter) return false;
      if (auditSeverityFilter !== "all" && log.severity !== auditSeverityFilter) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const matchDesc = log.description?.toLowerCase().includes(q);
        const matchActor = log.actor_email?.toLowerCase().includes(q);
        const matchTarget = log.target_entity?.toLowerCase().includes(q);
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        if (!matchDesc && !matchActor && !matchTarget && !matchAction && !matchDetails) return false;
      }
      return true;
    });
  }, [activityLogs, auditCategoryFilter, auditSeverityFilter, auditSearch]);

  // ── Audit KPI Stats ──
  const auditMetrics = useMemo(() => {
    return {
      total: activityLogs.length,
      drives: activityLogs.filter((l) => l.category === "drives").length,
      applications: activityLogs.filter((l) => l.category === "applications").length,
      warnings: activityLogs.filter((l) => l.category === "warnings" || l.severity === "warning").length,
      audits: activityLogs.filter((l) => l.category === "audit").length,
    };
  }, [activityLogs]);

  // ── Export CSV Handler ──
  const handleExportCSV = () => {
    if (!filteredAuditLogs.length) {
      showToast("No audit logs to export", "info");
      return;
    }
    const headers = ["Timestamp", "Category", "Severity", "Action", "Target Entity", "Actor Email", "Details"];
    const rows = filteredAuditLogs.map((l) => [
      `"${new Date(l.timestamp || l.created_at).toISOString()}"`,
      `"${l.category || 'general'}"`,
      `"${l.severity || 'info'}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.target_entity || '').replace(/"/g, '""')}"`,
      `"${(l.actor_email || '').replace(/"/g, '""')}"`,
      `"${(l.details || l.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `institutional_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Audit logs downloaded as CSV", "success");
  };

  // ── WhatsApp Direct Opener ──
  const handleOpenWhatsApp = (recipientNumber, customText) => {
    let cleanPhone = (recipientNumber || whatsAppPhoneOverride || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`; // default India prefix if 10-digit
    if (!cleanPhone) {
      const input = window.prompt("Enter recipient WhatsApp phone number (with country code, e.g. 919876543210):");
      if (!input) return;
      cleanPhone = input.replace(/[^0-9]/g, "");
      if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    }

    const defaultMsg = `Hello ${activeMessage?.sender_name || "there"}, this is from the BVM Placement & Administrative Office regarding: "${activeMessage?.subject || "your inquiry"}".`;
    const messageToSend = encodeURIComponent(customText || defaultMsg);
    window.open(`https://wa.me/${cleanPhone}?text=${messageToSend}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header & Window Switcher ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-slate-900">
                Institutional Activities & Communications
              </h1>
              <p className="text-sm text-slate-500">
                Unified messaging hub (WhatsApp & Mail) alongside full-scope institutional audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* Dual-Window Tab Navigation */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-xs">
            <button
              onClick={() => setActiveWindow("messages")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeWindow === "messages"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquare size={16} className={activeWindow === "messages" ? "text-emerald-600" : ""} />
              <span>Messages Hub</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveWindow("audit")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeWindow === "audit"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={16} className={activeWindow === "audit" ? "text-accent" : ""} />
              <span>Audit Logs</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                {activityLogs.length}
              </span>
            </button>
          </div>

          {activeWindow === "messages" ? (
            <Button
              variant="brand"
              size="sm"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="flex items-center gap-2 rounded-xl shadow-xs"
            >
              <Radio size={15} />
              <span>New Broadcast</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl shadow-xs bg-white text-slate-700"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* WINDOW 1: MESSAGES HUB (MAIL & WHATSAPP INTERFACE)                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeWindow === "messages" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Messages List (38% on desktop) */}
          <div className="lg:col-span-5 flex flex-col h-[750px] rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* List Header & Search */}
            <div className="p-4 border-b border-border bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-sm font-bold text-slate-800">Inbox & Notice Feeds</h2>
                  <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {filteredMessages.length}
                  </span>
                </div>
                <button
                  onClick={() => refetchMessages()}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-all"
                  title="Refresh messages"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search sender, message, subject..."
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
                {msgSearch && (
                  <button
                    onClick={() => setMsgSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] scrollbar-none">
                {[
                  { id: "all", label: "All" },
                  { id: "inquiry", label: "Inquiries" },
                  { id: "broadcast", label: "Broadcasts" },
                  { id: "warning", label: "Warnings" },
                  { id: "notice", label: "Notices" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setMsgFilter(pill.id)}
                    className={`rounded-lg px-2.5 py-1 font-medium whitespace-nowrap transition-all ${
                      msgFilter === pill.id
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {isLoadingMessages ? (
                <div className="flex h-48 items-center justify-center">
                  <Spinner />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Mail size={36} className="mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">No messages found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search keywords.</p>
                </div>
              ) : (
                filteredMessages.map((m) => {
                  const isSelected = activeMessage?.id === m.id;
                  const cat = CATEGORY_STYLES[m.category] || CATEGORY_STYLES.system;
                  const isUnread = m.status === "new" || !m.is_read;

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedMessageId(m.id);
                        if (isUnread) {
                          updateStatusMutation.mutate({
                            sourceType: m.source_type,
                            messageId: m.source_id,
                            status: "read",
                          });
                        }
                      }}
                      className={`group relative flex cursor-pointer items-start gap-3 p-3.5 transition-all ${
                        isSelected
                          ? "bg-accent/8 border-l-4 border-accent shadow-2xs"
                          : "hover:bg-slate-50/80 border-l-4 border-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs ${
                            m.category === "inquiry"
                              ? "bg-blue-100 text-blue-700"
                              : m.category === "warning"
                              ? "bg-rose-100 text-rose-700"
                              : m.category === "broadcast"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {m.sender_name ? m.sender_name.slice(0, 2).toUpperCase() : "US"}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white" />
                          </span>
                        )}
                      </div>

                      {/* Content Preview */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs truncate ${
                              isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                            }`}
                          >
                            {m.sender_name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(m.created_at)}</span>
                        </div>

                        <div className="text-xs font-medium text-slate-800 truncate mb-1">{m.subject}</div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{m.content}</p>

                        <div className="mt-2 flex items-center gap-1.5">
                          <span
                            className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-medium border ${cat.bg} ${cat.text} ${cat.border}`}
                          >
                            {cat.label}
                          </span>
                          {m.status === "resolved" && (
                            <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-medium">
                              Resolved
                            </span>
                          )}
                          {m.contact_phone && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                              <Phone size={10} /> WA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation Viewer (Mail + WhatsApp Web Style) */}
          <div className="lg:col-span-7 flex flex-col h-[750px] rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {activeMessage ? (
              <div className="flex flex-col h-full">
                {/* Active Header */}
                <div className="p-4 border-b border-border bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent font-bold text-sm shadow-xs ring-1 ring-accent/20">
                      {activeMessage.sender_name ? activeMessage.sender_name.slice(0, 2).toUpperCase() : "US"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-heading text-base font-bold text-slate-900">
                          {activeMessage.sender_name}
                        </h2>
                        <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                          {activeMessage.sender_role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{activeMessage.sender_email}</span>
                        <span>•</span>
                        <span>{formatDate(activeMessage.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Top Action Buttons (WhatsApp, Mail, Status) */}
                  <div className="flex items-center gap-2">
                    {/* WhatsApp Quick Link */}
                    <button
                      onClick={() => handleOpenWhatsApp(activeMessage.contact_phone)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all"
                      title="Open WhatsApp chat with sender"
                    >
                      <Phone size={14} className="fill-current" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Mail Direct Link */}
                    <a
                      href={`mailto:${activeMessage.sender_email}?subject=Re: ${encodeURIComponent(
                        activeMessage.subject
                      )}`}
                      className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all"
                      title="Send email"
                    >
                      <Mail size={14} />
                      <span>Mail</span>
                    </a>

                    {/* Status Toggle */}
                    {activeMessage.status !== "resolved" ? (
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({
                            sourceType: activeMessage.source_type,
                            messageId: activeMessage.source_id,
                            status: "resolved",
                          })
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-medium transition-all"
                      >
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Resolve</span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          updateStatusMutation.mutate({
                            sourceType: activeMessage.source_type,
                            messageId: activeMessage.source_id,
                            status: "read",
                          })
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 text-xs font-medium"
                      >
                        <Check size={14} />
                        <span>Resolved</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* WhatsApp / Mail Canvas Body */}
                <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-b from-slate-50/40 via-white to-slate-50/30 space-y-4">
                  {/* Subject Banner */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-slate-700">Subject / Category</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                          CATEGORY_STYLES[activeMessage.category]?.bg
                        } ${CATEGORY_STYLES[activeMessage.category]?.text} ${
                          CATEGORY_STYLES[activeMessage.category]?.border
                        }`}
                      >
                        {CATEGORY_STYLES[activeMessage.category]?.label || "Notice"}
                      </span>
                    </div>
                    <h3 className="font-heading text-sm font-bold text-slate-900">{activeMessage.subject}</h3>
                  </div>

                  {/* Student Academic Card (if available) */}
                  {activeMessage.academic_info && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 flex items-center justify-between text-xs text-blue-900">
                      <div className="flex items-center gap-2">
                        <User size={15} className="text-blue-600" />
                        <span className="font-semibold">Student Profile Verified:</span>
                        <span>ID: {activeMessage.academic_info.student_id}</span>
                        <span>•</span>
                        <span>Branch: {activeMessage.academic_info.branch}</span>
                      </div>
                      <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        CGPA: {activeMessage.academic_info.cgpa}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble (WhatsApp/Mail hybrid format) */}
                  <div className="flex flex-col space-y-2">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-slate-200 p-4 shadow-xs text-slate-800 leading-relaxed text-sm whitespace-pre-wrap">
                      <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1.5">
                        <span>{activeMessage.sender_name}</span>
                        <span>({activeMessage.sender_role})</span>
                      </div>
                      {activeMessage.content}
                      <div className="mt-2 text-right text-[10px] text-slate-400">
                        {formatDate(activeMessage.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Quick Response Helper Box */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <Phone size={13} className="text-emerald-600" />
                        Direct WhatsApp Communication
                      </span>
                      <span className="text-[11px] text-emerald-700">Open in WhatsApp Web</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Instantly open a private WhatsApp thread with {activeMessage.sender_name} containing official placement instructions.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Recipient WhatsApp number (e.g. 9876543210)"
                        defaultValue={activeMessage.contact_phone || ""}
                        onChange={(e) => setWhatsAppPhoneOverride(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 outline-none w-52"
                      />
                      <button
                        onClick={() =>
                          handleOpenWhatsApp(
                            null,
                            `Hello ${activeMessage.sender_name}, regarding: "${activeMessage.subject}" - BVM Placement Office response.`
                          )
                        }
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-semibold transition-all"
                      >
                        Launch WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Reply Composer */}
                <div className="p-4 border-t border-border bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Send size={13} className="text-accent" />
                      In-Portal Reply / Official Notification
                    </span>
                    {/* Quick Response Presets */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-400">Quick template:</span>
                      <button
                        onClick={() =>
                          setReplyText(
                            "Inquiry acknowledged. Please visit the TPO office during working hours (2:00 PM - 5:00 PM) for in-person review."
                          )
                        }
                        className="text-accent hover:underline"
                      >
                        TPO Hours
                      </button>
                      <span>•</span>
                      <button
                        onClick={() =>
                          setReplyText(
                            "Your documents have been verified. You are eligible to apply for upcoming placement drives."
                          )
                        }
                        className="text-accent hover:underline"
                      >
                        Eligible
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Draft an official notice to ${activeMessage.sender_name} (${activeMessage.sender_email})...`}
                      className="flex-1 rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
                    />
                    <Button
                      variant="brand"
                      size="sm"
                      disabled={!replyText.trim() || replyMutation.isPending}
                      onClick={() =>
                        replyMutation.mutate({
                          reply_message: replyText.trim(),
                          target_email: activeMessage.sender_email,
                          target_name: activeMessage.sender_name,
                          send_as_notification: true,
                        })
                      }
                      className="self-end rounded-xl shadow-xs"
                    >
                      <Send size={14} />
                      <span>Reply</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                <MessageSquare size={48} className="mb-3 text-slate-300" />
                <h3 className="font-heading text-base font-bold text-slate-700">No Conversation Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Choose an inquiry or notification from the inbox on the left to review messages, open WhatsApp chat, or send an official response.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* WINDOW 2: AUDIT LOGS ("ALL AUDIT MESSAGES")                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeWindow === "audit" && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4 bg-white border border-border/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Total Audits</span>
                <ShieldCheck size={16} className="text-accent" />
              </div>
              <div className="text-2xl font-bold font-heading text-slate-900">{auditMetrics.total}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Tracked institutional events</p>
            </Card>

            <Card className="p-4 bg-white border border-border/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Placement Drives</span>
                <Briefcase size={16} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-heading text-slate-900">{auditMetrics.drives}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Drive creations & updates</p>
            </Card>

            <Card className="p-4 bg-white border border-border/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Applications</span>
                <Users size={16} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-heading text-slate-900">{auditMetrics.applications}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Student submissions & status</p>
            </Card>

            <Card className="p-4 bg-white border border-border/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Warnings & Alerts</span>
                <AlertTriangle size={16} className="text-rose-600" />
              </div>
              <div className="text-2xl font-bold font-heading text-slate-900">{auditMetrics.warnings}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Disciplinary notices issued</p>
            </Card>
          </div>

          {/* Audit Controls & Filters */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by action, actor, target entity, or details..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
                {auditSearch && (
                  <button
                    onClick={() => setAuditSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetchActivity()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <RefreshCw size={13} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {/* Category & Severity Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  Category:
                </span>
                {[
                  { id: "all", label: "All Events" },
                  { id: "drives", label: "Drives" },
                  { id: "applications", label: "Applications" },
                  { id: "warnings", label: "Warnings" },
                  { id: "audit", label: "Platform Audits" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAuditCategoryFilter(c.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      auditCategoryFilter === c.id
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  Severity:
                </span>
                {["all", "info", "warning", "critical", "success"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setAuditSeverityFilter(sev)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold capitalize transition-all ${
                      auditSeverityFilter === sev
                        ? "bg-accent text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Logs Table / Stream */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {isLoadingActivity ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner />
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <ShieldCheck size={44} className="mb-2 text-slate-300" />
                <h3 className="font-heading text-base font-bold text-slate-700">No Audit Events Match Filters</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Adjust your search or category filters to view recorded platform activities.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-3">Category</th>
                      <th className="py-3.5 px-3">Severity</th>
                      <th className="py-3.5 px-4">Action & Operation</th>
                      <th className="py-3.5 px-4">Target Entity</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredAuditLogs.map((log) => {
                      const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                      const SevIcon = sevConfig.icon;

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          onClick={() => setSelectedAuditLog(log)}
                        >
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {formatDate(log.timestamp || log.created_at)}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="rounded px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {log.category || "general"}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${sevConfig.badge}`}
                            >
                              <SevIcon size={11} />
                              {sevConfig.label}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{log.action}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{log.description}</div>
                          </td>

                          <td className="py-3 px-4 font-medium text-slate-700 max-w-xs truncate">
                            {log.target_entity}
                          </td>

                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                              {log.actor_email}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAuditLog(log);
                              }}
                              className="rounded-lg bg-slate-100 hover:bg-slate-200 p-1.5 text-slate-600 transition-all"
                              title="View log payload"
                            >
                              <ExternalLink size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: NEW BROADCAST / NOTICE COMPOSER                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Radio size={16} />
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Broadcast Campus Notice</h3>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Target Audience */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Audience</label>
                <select
                  value={broadcastForm.target_audience}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, target_audience: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 outline-none focus:border-accent"
                >
                  <option value="all_students">All Registered Students (BVM)</option>
                  <option value="all_tpos">Training & Placement Officers (TPOs)</option>
                  <option value="all">Entire Institution (Students + TPOs)</option>
                  <option value="email">Specific User Email</option>
                </select>
              </div>

              {broadcastForm.target_audience === "email" && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Recipient Email</label>
                  <input
                    type="email"
                    placeholder="student@bvmengineering.ac.in"
                    value={broadcastForm.target_email}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, target_email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 outline-none focus:border-accent"
                  />
                </div>
              )}

              {/* Severity */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notice Severity</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "notice", label: "Notice (Normal)", color: "text-blue-700 border-blue-200 bg-blue-50" },
                    { id: "warning", label: "Warning (Disciplinary)", color: "text-rose-700 border-rose-200 bg-rose-50" },
                    { id: "info", label: "Info (General)", color: "text-emerald-700 border-emerald-200 bg-emerald-50" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setBroadcastForm({ ...broadcastForm, severity: s.id })}
                      className={`rounded-xl border p-2 text-center font-medium transition-all ${
                        broadcastForm.severity === s.id
                          ? `${s.color} font-bold ring-2 ring-accent/30`
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subject Header</label>
                <input
                  type="text"
                  placeholder="e.g. Mandatory Placement Orientation or Campus Drive Update"
                  value={broadcastForm.subject}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 outline-none focus:border-accent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Message Body</label>
                <textarea
                  rows={3}
                  placeholder="Type official notification message..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-accent"
                />
              </div>

              {/* WhatsApp Broadcast Text Preview & Copy */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <Phone size={12} className="text-emerald-600" />
                    WhatsApp Group Format Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const waText = `📢 *BVM PLACEMENT NOTICE*\n*Subject:* ${broadcastForm.subject || "Announcement"}\n\n${broadcastForm.message || ""}\n\n_Delivered via Placement Portal_`;
                      navigator.clipboard.writeText(waText);
                      setCopiedWhatsApp(true);
                      setTimeout(() => setCopiedWhatsApp(false), 2000);
                    }}
                    className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                  >
                    {copiedWhatsApp ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedWhatsApp ? "Copied" : "Copy for WhatsApp"}</span>
                  </button>
                </div>
                <p className="text-[11px] font-mono text-slate-700 bg-white/80 p-2 rounded border border-emerald-200/60 whitespace-pre-wrap">
                  📢 *BVM PLACEMENT NOTICE*{"\n"}
                  *Subject:* {broadcastForm.subject || "..."}{"\n\n"}
                  {broadcastForm.message || "..."}{"\n\n"}
                  _Delivered via Placement Portal_
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border/80 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsBroadcastModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={!broadcastForm.message.trim() || broadcastMutation.isPending}
                onClick={() => broadcastMutation.mutate(broadcastForm)}
                className="flex items-center gap-2"
              >
                {broadcastMutation.isPending ? <Spinner size="sm" /> : <Send size={14} />}
                <span>Send Broadcast</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: AUDIT LOG DETAILS VIEWER                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-accent" />
                <h3 className="font-heading text-lg font-bold text-slate-900">Audit Event Record</h3>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block mb-0.5">Action & Operation:</span>
                <p className="font-heading text-sm font-bold text-slate-900">{selectedAuditLog.action}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-500 block text-[10px]">TIMESTAMP:</span>
                  <p className="font-mono text-slate-800">{formatDate(selectedAuditLog.timestamp || selectedAuditLog.created_at)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-500 block text-[10px]">CATEGORY & SEVERITY:</span>
                  <p className="capitalize font-semibold text-slate-800">
                    {selectedAuditLog.category || "General"} • {selectedAuditLog.severity || "Info"}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-500 block text-[10px]">ACTOR:</span>
                <p className="font-mono text-slate-800">{selectedAuditLog.actor_email}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-500 block text-[10px]">TARGET ENTITY:</span>
                <p className="text-slate-800 font-medium">{selectedAuditLog.target_entity}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">EVENT DETAILS & DESCRIPTION:</span>
                <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedAuditLog.details || selectedAuditLog.description}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-border/80 pt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedAuditLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
