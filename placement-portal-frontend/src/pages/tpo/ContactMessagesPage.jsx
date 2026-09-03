import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactApi } from "../../api/contact.api";
import { MessageSquare, Mail, Clock, CheckCircle2, Inbox } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { showToast } from "../../utils/swal";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  new: {
    label: "New",
    badgeVariant: "brand",
    borderClass: "border-l-4 border-blue-500",
    bgClass: "bg-blue-50/40",
    nameClass: "font-semibold text-slate-900",
    pillActive: "bg-blue-500 text-white",
  },
  read: {
    label: "Read",
    badgeVariant: "warning",
    borderClass: "border-l-4 border-amber-400",
    bgClass: "",
    nameClass: "font-medium text-slate-800",
    pillActive: "bg-amber-400 text-white",
  },
  resolved: {
    label: "Resolved",
    badgeVariant: "success",
    borderClass: "border-l-4 border-emerald-500",
    bgClass: "",
    nameClass: "font-medium text-slate-700",
    pillActive: "bg-emerald-500 text-white",
  },
};

const ALL_STATUSES = ["new", "read", "resolved"];

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── MessageCard ──────────────────────────────────────────────────────────────
function MessageCard({ msg, onStatusChange, isPending }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[msg.status] ?? STATUS_CONFIG.new;
  const isLong = msg.message.length > 200;

  return (
    <div
      className={`rounded-xl border border-border shadow-sm overflow-hidden transition-all ${cfg.borderClass} ${cfg.bgClass}`}
    >
      <div className="px-5 py-4 space-y-3 bg-card">
        {/* ── Header row ── */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className={`text-base ${cfg.nameClass}`}>{msg.name}</span>
            <a
              href={`mailto:${msg.email}`}
              className="ml-2 text-sm text-slate-500 hover:text-accent hover:underline"
            >
              {msg.email}
            </a>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="accent" className="capitalize">
              {msg.category}
            </Badge>
            <Badge variant={cfg.badgeVariant} className="capitalize">
              {cfg.label}
            </Badge>
          </div>
        </div>

        {/* ── Message body ── */}
        <p className={`text-sm text-slate-700 leading-relaxed ${!expanded && isLong ? "line-clamp-2" : ""}`}>
          {msg.message}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}

        {/* ── Footer row ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock size={12} />
            {formatDate(msg.created_at)}
          </span>

          {/* Status switcher pills */}
          <div className="flex items-center gap-1">
            {ALL_STATUSES.map((s) => {
              const isActive = msg.status === s;
              const pillCfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  disabled={isActive || isPending}
                  onClick={() => onStatusChange(msg.id, s)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors
                    ${isActive
                      ? pillCfg.pillActive
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {pillCfg.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContactMessagesPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ["tpo-contact-messages"],
    queryFn: async () => {
      const { data } = await contactApi.getPlacementMessages();
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ messageId, status }) =>
      contactApi.updateMessageStatus(messageId, status),
    onSuccess: () => {
      queryClient.invalidateQueries(["tpo-contact-messages"]);
      showToast("Message status updated");
    },
    onError: () => {
      showToast("Failed to update status");
    },
  });

  // ── Derived counts ──
  const counts = {
    all: messages?.length ?? 0,
    new: messages?.filter((m) => m.status === "new").length ?? 0,
    read: messages?.filter((m) => m.status === "read").length ?? 0,
    resolved: messages?.filter((m) => m.status === "resolved").length ?? 0,
  };

  const filtered =
    activeFilter === "all"
      ? messages ?? []
      : (messages ?? []).filter((m) => m.status === activeFilter);

  // ── Loading / error states ──
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );

  if (error)
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading messages: {error.message}
      </div>
    );

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">
          Contact Messages
        </h1>
        <p className="text-slate-600 mt-1">
          Placement-related inquiries submitted through the Contact Us form.
        </p>
      </div>

      {/* ── Summary stat strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "all",      label: "Total",    icon: Inbox,         color: "text-slate-500",  bg: "bg-slate-50"   },
          { key: "new",      label: "New",      icon: MessageSquare, color: "text-blue-600",   bg: "bg-blue-50"    },
          { key: "read",     label: "Read",     icon: Mail,          color: "text-amber-600",  bg: "bg-amber-50"   },
          { key: "resolved", label: "Resolved", icon: CheckCircle2,  color: "text-emerald-600",bg: "bg-emerald-50" },
        ].map(({ key, label, icon: Icon, color, bg }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`flex items-center gap-3 rounded-xl p-4 border transition-all text-left
              ${activeFilter === key
                ? "border-accent ring-2 ring-accent/20 shadow-sm"
                : "border-border hover:border-slate-300"
              } ${bg}`}
          >
            <div className={`p-2 rounded-lg bg-white shadow-sm ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className={`text-2xl font-bold font-heading ${color}`}>
                {counts[key]}
              </div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 border-b border-border">
        {[
          { key: "all",      label: "All" },
          { key: "new",      label: "New" },
          { key: "read",     label: "Read" },
          { key: "resolved", label: "Resolved" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
              ${activeFilter === key
                ? "border-accent text-accent"
                : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            {label}
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs
                ${activeFilter === key
                  ? "bg-accent/10 text-accent"
                  : "bg-slate-100 text-slate-500"
                }`}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Message list ── */}
      {filtered.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <MessageSquare size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">
              {activeFilter === "all"
                ? "No placement messages yet."
                : `No ${activeFilter} messages.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              isPending={statusMutation.isPending}
              onStatusChange={(messageId, status) =>
                statusMutation.mutate({ messageId, status })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
