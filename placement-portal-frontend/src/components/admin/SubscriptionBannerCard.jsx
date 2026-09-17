import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import { loadRazorpayScript } from "../../utils/razorpay";
import { showSuccess, showError } from "../../utils/swal";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  Calendar,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Button from "../common/Button";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export default function SubscriptionBannerCard({ collegeData = null, compact = false }) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: fetchedCollege } = useQuery({
    queryKey: ["adminCollegeInfo"],
    queryFn: () => adminApi.getCollegeInfo().then((res) => res.data),
    enabled: !collegeData,
    staleTime: 30000,
  });

  const college = collegeData || fetchedCollege;

  if (!college) {
    return null;
  }

  const status = college.subscription_status || "active";
  const amount = college.subscription_amount || 10000;
  const startedAt = college.subscription_started_at;
  const expiresAt = college.subscription_expires_at;
  const daysRemaining = college.days_remaining ?? 0;
  const isExpired = college.is_subscription_expired || status === "expired";
  const canRenew = college.can_renew ?? (isExpired || status === "pending_payment");

  // Calculate elapsed progress in 30-day window
  let cycleProgressPct = 100;
  if (startedAt && expiresAt) {
    const start = new Date(startedAt).getTime();
    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    if (end > start) {
      cycleProgressPct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    }
  }

  const handleRenewPayment = async () => {
    try {
      setIsProcessing(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showError(
          "Gateway Error",
          "Failed to load Razorpay checkout SDK. Please check your internet connection and try again."
        );
        setIsProcessing(false);
        return;
      }

      const orderRes = await adminApi.createSubscriptionOrder(college.id);
      const order = orderRes.data;

      if (order.order_id?.startsWith("order_mock_")) {
        showError(
          "Gateway In Mock Mode",
          `Backend generated a mock order (${order.order_id}). Razorpay client was not active when the backend started. Please restart your FastAPI backend server so it connects to Razorpay live test mode.`
        );
        setIsProcessing(false);
        return;
      }

      const options = {
        key: order.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TXqWyY8wIQsVyy",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Placement Portal",
        description: `Campus Standard License Renewal (${college.name})`,
        order_id: order.order_id,
        handler: async function (response) {
          try {
            await adminApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await showSuccess(
              "Subscription Renewed!",
              `Your ₹${amount.toLocaleString("en-IN")}/month Campus License has been extended for another 30 days.`
            );

            queryClient.invalidateQueries(["adminCollegeInfo"]);
            queryClient.invalidateQueries(["collegeSetupChecklist"]);
          } catch (verifyErr) {
            showError("Verification Error", verifyErr.response?.data?.detail || "Payment verification failed.");
          } finally {
            setIsProcessing(false);
          }
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (failRes) {
        setIsProcessing(false);
        showError(
          "Payment Failed",
          failRes.error?.description || "Transaction was rejected or cancelled."
        );
      });
      rzp.open();
    } catch (err) {
      setIsProcessing(false);
      showError(
        "Payment Initiation Failed",
        err.response?.data?.detail || "Could not initiate payment. Please try again."
      );
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 mb-6 shadow-sm overflow-hidden ${
        isExpired
          ? "bg-rose-50/70 border-rose-200 text-rose-950"
          : "bg-white border-slate-200 text-slate-900"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left info column */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Campus Standard License
              </span>

              {isExpired ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5" /> Subscription Expired
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active ({daysRemaining} days left)
                </span>
              )}

              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                ₹{amount.toLocaleString("en-IN")}/mo
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900">
              {isExpired
                ? "Your 30-Day Institutional Subscription Has Ended"
                : "Active Campus Platform Subscription"}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              {isExpired
                ? `Your previous 30-day billing cycle ended on ${formatDate(expiresAt)}. The Pay button is now unlocked to renew your campus license for ₹${amount.toLocaleString("en-IN")}.`
                : `Your institution is currently covered under the 30-day billing cycle valid until ${formatDate(expiresAt)}. The renewal button will automatically enable when the cycle completes.`}
            </p>

            {/* Cycle Dates Badge Group */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Started: <strong>{formatDate(startedAt)}</strong></span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Valid Until: <strong>{formatDate(expiresAt)}</strong></span>
              </div>
            </div>
          </div>

          {/* Right Action column */}
          <div className="flex flex-col items-start lg:items-end justify-center gap-2 flex-shrink-0">
            {canRenew ? (
              <Button
                onClick={handleRenewPayment}
                isLoading={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 text-sm"
              >
                <CreditCard className="w-4 h-4" /> Renew License (Pay ₹{amount.toLocaleString("en-IN")})
              </Button>
            ) : (
              <div className="flex flex-col items-start lg:items-end gap-1">
                <button
                  disabled
                  title={`Pay button enables after subscription time ends (${formatDate(expiresAt)})`}
                  className="bg-slate-100 border border-slate-200 text-slate-400 font-semibold py-2 px-4 rounded-xl cursor-not-allowed flex items-center gap-2 text-xs"
                >
                  <Lock className="w-3.5 h-3.5" /> Renews on {formatDate(expiresAt)}
                </button>
                <span className="text-[10px] text-slate-400">
                  Enables after 30-day subscription ends
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar of current 30-day period */}
        {!isExpired && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span>Current 30-Day Period: {formatDate(startedAt)}</span>
              <span>Ends: {formatDate(expiresAt)} ({daysRemaining} days left)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(5, cycleProgressPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
