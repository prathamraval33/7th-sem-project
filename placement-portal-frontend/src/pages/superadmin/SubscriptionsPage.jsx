import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Download,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  X,
  ExternalLink,
  ChevronRight,
  Receipt,
  Layers,
  Sparkles,
} from "lucide-react";
import { useSuperAdminStore } from "./superAdminStore";
import KpiCard from "../../components/superadmin/KpiCard";
import DataTable from "../../components/superadmin/DataTable";
import StatusPill from "../../components/superadmin/StatusPill";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount) {
  if (amount == null) return "₹0.00";
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SubscriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const subscriptions = useSuperAdminStore((s) => s.subscriptions);
  const summary = useSuperAdminStore((s) => s.subscriptionSummary);
  const loading = useSuperAdminStore((s) => s.subscriptionsLoading);
  const fetchSubscriptions = useSuperAdminStore((s) => s.fetchSubscriptions);
  const sendPaymentReminder = useSuperAdminStore((s) => s.sendPaymentReminder);
  const sendRenewalReminder = useSuperAdminStore((s) => s.sendRenewalReminder);
  const fetchSubscriptionTransactions = useSuperAdminStore(
    (s) => s.fetchSubscriptionTransactions
  );

  // Synchronized search & filter state with URL
  const query = searchParams.get("q") || "";
  const statusFilter = searchParams.get("status") || "all";
  const billingFilter = searchParams.get("billing") || "all";

  // Active state for actions
  const [remindingId, setRemindingId] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  };

  const handleClearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  // Filter subscriptions according to active URL parameters
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        const collegeMatch = (sub.college_name || "").toLowerCase().includes(q);
        const featureMatch = (sub.feature_name || "").toLowerCase().includes(q);
        const codeMatch = (sub.feature_code || "").toLowerCase().includes(q);
        if (!collegeMatch && !featureMatch && !codeMatch) return false;
      }
      if (statusFilter !== "all" && sub.status !== statusFilter) {
        return false;
      }
      if (billingFilter !== "all" && sub.billing_type !== billingFilter) {
        return false;
      }
      return true;
    });
  }, [subscriptions, query, statusFilter, billingFilter]);

  // Handle Send Reminder for pending payment
  const handlePaymentReminder = async (subId, e) => {
    if (e) e.stopPropagation();
    setRemindingId(subId);
    try {
      await sendPaymentReminder(subId);
    } catch {
      // toast handled in store
    } finally {
      setRemindingId(null);
    }
  };

  // Handle Send Reminder for upcoming renewal
  const handleRenewalReminder = async (subId, e) => {
    if (e) e.stopPropagation();
    setRemindingId(subId);
    try {
      await sendRenewalReminder(subId);
    } catch {
      // toast handled in store
    } finally {
      setRemindingId(null);
    }
  };

  // Open Detail / Transaction audit modal
  const handleOpenDetail = async (sub) => {
    setSelectedSub(sub);
    setTxLoading(true);
    try {
      const txs = await fetchSubscriptionTransactions(sub.id);
      setTransactions(txs);
    } finally {
      setTxLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredSubs.length) return;
    const headers = [
      "ID",
      "College Name",
      "Feature Name",
      "Feature Code",
      "Billing Type",
      "Price (INR)",
      "Amount Charged (INR)",
      "Status",
      "Requested At",
      "Approved At",
      "Paid At",
      "Expires At",
      "Payment Due At",
      "Reminder Count",
      "Last Reminder Sent At",
    ];

    const rows = filteredSubs.map((s) => [
      s.id,
      `"${(s.college_name || "").replace(/"/g, '""')}"`,
      `"${(s.feature_name || "").replace(/"/g, '""')}"`,
      s.feature_code,
      s.billing_type,
      s.price ?? "",
      s.amount_charged ?? "",
      s.status,
      s.requested_at ? new Date(s.requested_at).toISOString() : "",
      s.approved_at ? new Date(s.approved_at).toISOString() : "",
      s.paid_at ? new Date(s.paid_at).toISOString() : "",
      s.expires_at ? new Date(s.expires_at).toISOString() : "",
      s.payment_due_at ? new Date(s.payment_due_at).toISOString() : "",
      s.reminder_count ?? 0,
      s.last_reminder_sent_at ? new Date(s.last_reminder_sent_at).toISOString() : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `subscriptions_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: "college_name",
      header: "Institution",
      render: (row) => (
        <div className="flex flex-col gap-1 min-w-[200px] max-w-[280px]">
          <span className="font-semibold text-slate-900 leading-snug">{row.college_name}</span>
          <span className="font-mono text-[11px] text-slate-500">ID #{row.college_id}</span>
        </div>
      ),
    },
    {
      key: "feature_name",
      header: "Feature",
      render: (row) => (
        <div className="flex flex-col gap-1 min-w-[160px]">
          <span className="font-medium text-slate-800">{row.feature_name}</span>
          <span className="font-mono text-[11px] text-slate-400">{row.feature_code}</span>
        </div>
      ),
    },
    {
      key: "billing_type",
      header: "Billing",
      render: (row) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700">
          {row.billing_type?.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Fee / Price",
      render: (row) => (
        <div className="flex flex-col gap-0.5 min-w-[100px]">
          <span className="font-mono text-xs font-bold text-slate-900">
            {row.amount_charged != null ? formatCurrency(row.amount_charged) : formatCurrency(row.price)}
          </span>
          {row.amount_charged != null && (
            <span className="text-[10px] font-medium text-emerald-600">Paid</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="min-w-[120px]">
          <StatusPill status={row.status} />
        </div>
      ),
    },
    {
      key: "dates",
      header: "Timeline & Dates",
      render: (row) => (
        <div className="flex flex-col gap-1 text-xs text-slate-600 min-w-[190px]">
          <span>
            <strong className="text-slate-500 font-medium">Started:</strong> {formatDate(row.paid_at || row.approved_at || row.requested_at)}
          </span>
          {row.expires_at && (
            <span className={row.days_until_expiry != null && row.days_until_expiry <= 7 ? "text-amber-600 font-semibold" : ""}>
              <strong className="text-slate-500 font-medium">Expires:</strong> {formatDate(row.expires_at)}
              {row.days_until_expiry != null && ` (${row.days_until_expiry}d left)`}
            </span>
          )}
          {row.payment_due_at && row.status === "approved_awaiting_payment" && (
            <span className="text-rose-600 font-semibold">
              <strong className="text-slate-500 font-medium">Due:</strong> {formatDate(row.payment_due_at)}
              {row.days_until_payment_due != null && ` (${row.days_until_payment_due}d left)`}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "reminders",
      header: "Reminders",
      render: (row) => (
        <div className="flex flex-col gap-1 min-w-[110px]">
          {row.reminder_count > 0 ? (
            <span className="cd-reminder-badge">
              <Clock size={11} /> {row.reminder_count} sent
            </span>
          ) : (
            <span className="text-xs text-slate-400">None sent</span>
          )}
          {row.last_reminder_sent_at && (
            <span className="text-[10px] text-slate-500">
              Last: {formatDate(row.last_reminder_sent_at)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const isReminding = remindingId === row.id;
        return (
          <div className="flex items-center gap-2.5 min-w-[130px]" onClick={(e) => e.stopPropagation()}>
            {(row.status === "approved_awaiting_payment" || row.status === "payment_failed") && (
              <button
                type="button"
                onClick={(e) => handlePaymentReminder(row.id, e)}
                disabled={isReminding}
                className="cd-reminder-btn"
                title="Send payment reminder notification to college admin"
              >
                {isReminding ? <RefreshCw size={12} className="animate-spin" /> : <Clock size={12} />}
                Send Reminder
              </button>
            )}

            {row.status === "active" && row.expires_at && row.days_until_expiry != null && row.days_until_expiry <= 7 && (
              <button
                type="button"
                onClick={(e) => handleRenewalReminder(row.id, e)}
                disabled={isReminding}
                className="cd-reminder-btn"
                title="Send renewal reminder notification to college admin"
              >
                {isReminding ? <RefreshCw size={12} className="animate-spin" /> : <Clock size={12} />}
                Remind Renewal
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenDetail(row)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
              title="View Transactions & Audit Trail"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* ---- Topbar ---- */}
      <div className="cd-topbar">
        <div>
          <h1 className="cd-topbar__title">Subscriptions & Licensing</h1>
          <p className="mt-1 text-xs text-slate-500">
            Tenant subscription oversight, recurring billing cycles, payment deadlines, and audit trail.
          </p>
        </div>

        <div className="cd-topbar__actions">
          <button
            type="button"
            className="cd-btn cd-btn--secondary"
            onClick={fetchSubscriptions}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            className="cd-btn cd-btn--primary"
            onClick={handleExportCsv}
            disabled={filteredSubs.length === 0}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ---- KPI Row (4 Cards) ---- */}
      <div className="cd-kpi-grid">
        <KpiCard
          label="Active Subscriptions"
          value={summary.active_count}
          onClick={() => {
            updateParam("status", "active");
            updateParam("billing", "monthly");
          }}
        />
        <KpiCard
          label="One-Time Purchases"
          value={summary.one_time_count}
          onClick={() => {
            updateParam("status", "active");
            updateParam("billing", "one_time");
          }}
        />
        <KpiCard
          label="Expired / Lapsed"
          value={summary.expired_count}
          onClick={() => updateParam("status", "expired")}
        />
        <KpiCard
          label="Pending Payments"
          value={summary.pending_payment_count}
          warning={true}
          onClick={() => updateParam("status", "approved_awaiting_payment")}
        />
      </div>

      {/* ---- Expiring Soon Warning Panel ---- */}
      {summary.expiring_soon && summary.expiring_soon.length > 0 && (
        <div className="cd-expiring-panel">
          <div className="cd-expiring-panel__header">
            <div className="cd-expiring-panel__title">
              <AlertTriangle size={18} className="text-amber-600" />
              <span>Subscriptions Expiring Soon (Within 7 Days)</span>
              <span className="cd-expiring-panel__count">
                {summary.expiring_soon.length}
              </span>
            </div>
            <span className="text-xs text-amber-800">
              Requires renewal confirmation or manual extension
            </span>
          </div>

          <div className="cd-expiring-panel__grid">
            {summary.expiring_soon.map((item) => (
              <div key={item.id} className="cd-expiring-card">
                <div className="cd-expiring-card__info">
                  <div className="cd-expiring-card__name">{item.college_name}</div>
                  <div className="cd-expiring-card__sub">
                    <span className="font-semibold text-slate-700">{item.feature_name}</span> &bull;{" "}
                    <span className="cd-expiring-card__days">
                      Expires in {item.days_until_expiry ?? 0}d
                    </span>{" "}
                    ({formatDate(item.expires_at)})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRenewalReminder(item.id)}
                  disabled={remindingId === item.id}
                  className="cd-reminder-btn"
                >
                  {remindingId === item.id ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Clock size={12} />
                  )}
                  {item.reminder_count > 0 ? `Remind (${item.reminder_count})` : "Send Reminder"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Search & Filter Bar ---- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
          {/* Text Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search college, feature, or code..."
              value={query}
              onChange={(e) => updateParam("q", e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => updateParam("status", e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="approved_awaiting_payment">Awaiting Payment</option>
              <option value="payment_failed">Payment Failed</option>
              <option value="expired">Expired</option>
              <option value="approval_expired">Approval Expired</option>
              <option value="pending_review">Pending Review</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Billing Type Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={billingFilter}
              onChange={(e) => updateParam("billing", e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Billing Types</option>
              <option value="one_time">One-Time</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          {(query || statusFilter !== "all" || billingFilter !== "all") && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5"
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-900">{filteredSubs.length}</span> of {subscriptions.length} records
        </div>
      </div>

      {/* ---- Subscriptions Data Table ---- */}
      <DataTable
        columns={columns}
        data={filteredSubs}
        onRowClick={handleOpenDetail}
        emptyState={{
          icon: CreditCard,
          title: "No subscriptions found",
          text: query || statusFilter !== "all" || billingFilter !== "all"
            ? "Try adjusting your search query or status filters."
            : "No tenant institutions have active subscriptions or requests yet.",
          actionLabel: (query || statusFilter !== "all" || billingFilter !== "all") ? "Reset Filters" : undefined,
          onAction: handleClearFilters,
        }}
      />

      {/* ---- Detail & Transaction Audit Modal ---- */}
      {selectedSub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setSelectedSub(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/75 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Subscription & Transaction Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Record #{selectedSub.id} &bull; {selectedSub.college_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Overview Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs">
                <div>
                  <span className="text-slate-400">Institution</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedSub.college_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Feature</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedSub.feature_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Current Status</span>
                  <div className="mt-0.5">
                    <StatusPill status={selectedSub.status} />
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Billing Type</span>
                  <p className="font-semibold text-slate-900 uppercase mt-0.5">{selectedSub.billing_type?.replace("_", " ")}</p>
                </div>
                <div>
                  <span className="text-slate-400">Price / Rate</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(selectedSub.price)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Amount Charged</span>
                  <p className="font-mono font-bold text-emerald-600 mt-0.5">
                    {selectedSub.amount_charged != null ? formatCurrency(selectedSub.amount_charged) : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Requested Date</span>
                  <p className="text-slate-700 mt-0.5">{formatDateTime(selectedSub.requested_at)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Approved Date</span>
                  <p className="text-slate-700 mt-0.5">{formatDateTime(selectedSub.approved_at)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Payment Due</span>
                  <p className={`mt-0.5 font-medium ${selectedSub.status === "approved_awaiting_payment" ? "text-rose-600" : "text-slate-700"}`}>
                    {formatDateTime(selectedSub.payment_due_at)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Expires At</span>
                  <p className="text-slate-700 mt-0.5">{formatDateTime(selectedSub.expires_at)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Reminders Sent</span>
                  <p className="text-slate-700 mt-0.5">{selectedSub.reminder_count ?? 0} nudges</p>
                </div>
                <div>
                  <span className="text-slate-400">Last Reminder</span>
                  <p className="text-slate-700 mt-0.5">{formatDateTime(selectedSub.last_reminder_sent_at)}</p>
                </div>
              </div>

              {/* Transactions Audit Trail Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Receipt size={16} className="text-blue-600" />
                    Transaction Audit Trail
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Razorpay Gateway Logs
                  </span>
                </div>

                {txLoading ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    <RefreshCw size={18} className="mx-auto mb-2 animate-spin text-blue-600" />
                    Loading transaction records...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    No Razorpay transactions recorded yet for this feature.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5">Order ID</th>
                          <th className="px-3 py-2.5">Payment ID</th>
                          <th className="px-3 py-2.5">Amount</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2.5 text-slate-900 font-semibold truncate max-w-[140px]" title={tx.razorpay_order_id}>
                              {tx.razorpay_order_id}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 truncate max-w-[140px]" title={tx.razorpay_payment_id || "—"}>
                              {tx.razorpay_payment_id || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-slate-900 font-bold">
                              {formatCurrency(tx.amount)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  tx.status === "paid"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : tx.status === "failed"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-slate-500 font-sans">
                              {formatDateTime(tx.paid_at || tx.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
              <div className="text-xs text-slate-500">
                {(selectedSub.status === "approved_awaiting_payment" || selectedSub.status === "payment_failed") && (
                  <span>Awaiting payment completion by institution admin</span>
                )}
              </div>
              <button
                type="button"
                className="cd-btn cd-btn--secondary"
                onClick={() => setSelectedSub(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
