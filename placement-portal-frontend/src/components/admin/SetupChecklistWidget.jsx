import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  Info,
  XCircle,
  CreditCard,
} from "lucide-react";
import Button from "../common/Button";
import { loadRazorpayScript } from "../../utils/razorpay";
import { showSuccess, showError } from "../../utils/swal";

export default function SetupChecklistWidget() {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPayingSubscription, setIsPayingSubscription] = useState(false);

  const { data: checklist, isLoading, error } = useQuery({
    queryKey: ["collegeSetupChecklist"],
    queryFn: () => adminApi.getSetupChecklist().then((res) => res.data),
    staleTime: 30000,
  });

  if (isLoading || error || !checklist) {
    return null;
  }

  const handlePaySubscription = async () => {
    try {
      setIsPayingSubscription(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showError("Gateway Error", "Failed to load Razorpay checkout SDK. Please check your internet connection.");
        setIsPayingSubscription(false);
        return;
      }

      const collegeId = checklist.college_id;
      const orderRes = await adminApi.createSubscriptionOrder(collegeId);
      const order = orderRes.data;

      const options = {
        key: order.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TXqWyY8wIQsVyy",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Placement Portal",
        description: "Campus Standard License (₹10,000/mo)",
        order_id: order.order_id,
        handler: async function (response) {
          try {
            await adminApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await showSuccess(
              "Subscription Activated!",
              "Your ₹10,000/month Campus License is now active. All required steps updated."
            );
            queryClient.invalidateQueries(["collegeSetupChecklist"]);
          } catch (verifyErr) {
            showError("Verification Error", verifyErr.response?.data?.detail || "Payment verification failed.");
          } finally {
            setIsPayingSubscription(false);
          }
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: function () {
            setIsPayingSubscription(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (failRes) {
        setIsPayingSubscription(false);
        showError("Payment Failed", failRes.error?.description || "Transaction was rejected or cancelled.");
      });
      rzp.open();
    } catch (err) {
      setIsPayingSubscription(false);
      showError("Payment Error", err.response?.data?.detail || "Could not initiate payment.");
    }
  };

  // Normalize checklist data
  const allItems = checklist.items || [];
  const rawBlocking =
    checklist.blocking_items && checklist.blocking_items.length > 0
      ? checklist.blocking_items
      : allItems.filter((i) => i.is_blocking);
  const rawRecommended =
    checklist.recommended_items && checklist.recommended_items.length > 0
      ? checklist.recommended_items
      : allItems.filter((i) => !i.is_blocking);

  const blockingItems = rawBlocking.map((i) => ({
    ...i,
    completed: i.completed ?? i.is_completed ?? false,
    action_url: i.action_url ?? i.deep_link ?? "",
  }));

  const recommendedItems = rawRecommended.map((i) => ({
    ...i,
    completed: i.completed ?? i.is_completed ?? false,
    action_url: i.action_url ?? i.deep_link ?? "",
  }));

  const completedBlockingCount =
    checklist.blocking_completed ?? blockingItems.filter((i) => i.completed).length;
  const totalBlockingCount = checklist.blocking_total ?? blockingItems.length;

  const completedRecommendedCount =
    checklist.optional_completed ?? recommendedItems.filter((i) => i.completed).length;
  const totalRecommendedCount = checklist.optional_total ?? recommendedItems.length;

  const progressPct =
    checklist.total_percentage ??
    checklist.total_progress_pct ??
    Math.round(
      ((completedBlockingCount + completedRecommendedCount) /
        Math.max(totalBlockingCount + totalRecommendedCount, 1)) *
        100
    );

  const isBlockingComplete =
    checklist.all_blocking_complete ??
    checklist.blocking_complete ??
    (completedBlockingCount === totalBlockingCount && totalBlockingCount > 0);
  const isRecommendedComplete =
    checklist.recommended_complete ??
    (completedRecommendedCount === totalRecommendedCount && totalRecommendedCount > 0);

  // If college is fully active and all items complete, or user dismissed when active, hide
  const isFullyActive = checklist.status === "active";
  const allComplete = isBlockingComplete && isRecommendedComplete;

  if (isFullyActive && allComplete && isDismissed) {
    return null;
  }

  // Status Styling & Messaging
  let statusBadge = null;
  let statusBannerClass = "bg-amber-50/80 border-amber-200 text-amber-900";
  let statusTitle = "Institution Setup in Progress";
  let statusSubtitle = `Complete ${Math.max(totalBlockingCount - completedBlockingCount, 0)} required item(s) to submit your college for SuperAdmin platform activation.`;

  if (checklist.status === "ready_for_review") {
    statusBannerClass = "bg-indigo-50/80 border-indigo-200 text-indigo-950";
    statusTitle = "Ready for Review — Pending SuperAdmin Approval";
    statusSubtitle = "All required setup items are complete! SuperAdmin has been notified to review and activate student registrations.";
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
        <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Ready for Review
      </span>
    );
  } else if (checklist.status === "active") {
    statusBannerClass = "bg-emerald-50/80 border-emerald-200 text-emerald-950";
    statusTitle = allComplete ? "Setup 100% Completed" : "Institution Active — Recommended Steps";
    statusSubtitle = allComplete
      ? "Your institution is fully activated on the platform."
      : "Your institution is active. Finish recommended configurations for an optimal experience.";
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Platform Active
      </span>
    );
  } else if (checklist.status === "rejected") {
    statusBannerClass = "bg-red-50/80 border-red-200 text-red-950";
    statusTitle = "Registration Needs Attention";
    statusSubtitle = "Your registration was rejected or needs corrections. Please review your setup details.";
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
        <XCircle className="w-3.5 h-3.5 text-red-600" /> Action Required
      </span>
    );
  } else {
    // pending_setup
    statusBadge = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Setup Mode
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border ${statusBannerClass} p-5 shadow-sm transition-all duration-200 mb-6`}>
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white rounded-xl shadow-xs border border-inherit flex-shrink-0 mt-0.5">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold font-heading text-slate-900">{statusTitle}</h3>
              {statusBadge}
              <span className="text-xs font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                {progressPct}% Complete
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{statusSubtitle}</p>
          </div>
        </div>

        {/* Action / Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:bg-white/60"
          >
            {isExpanded ? (
              <>
                Hide Checklist <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                View Checklist ({completedBlockingCount}/{totalBlockingCount} req) <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
          {isFullyActive && (
            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
              title="Dismiss banner"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 w-full bg-white/80 rounded-full h-2 overflow-hidden border border-inherit">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isBlockingComplete ? "bg-emerald-500" : "bg-indigo-600"
          }`}
          style={{ width: `${Math.max(progressPct, 5)}%` }}
        />
      </div>

      {/* Expanded Checklist Details */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-inherit space-y-6">
          {/* Section 1: Blocking (Required) Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Required Steps ({completedBlockingCount}/{totalBlockingCount})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Must be completed before SuperAdmin can activate student signups
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {blockingItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.completed
                      ? "bg-white/90 border-emerald-200 text-slate-800"
                      : "bg-white border-amber-300 shadow-xs text-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                    </div>
                    {item.completed ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Done
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{item.description}</p>
                  {item.id === "campus_subscription" && !item.completed ? (
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handlePaySubscription}
                        isLoading={isPayingSubscription}
                        className="bg-indigo-600 hover:bg-indigo-700 text-xs py-1.5 px-2.5 flex items-center gap-1.5 shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pay ₹10,000 Now
                      </Button>
                      <Link
                        to={item.action_url || "/register-college/subscription"}
                        className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 underline"
                      >
                        Details
                      </Link>
                    </div>
                  ) : item.action_url && !item.completed ? (
                    <div className="mt-3">
                      <Link
                        to={item.action_url}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Complete now <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Recommended Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recommended Steps ({completedRecommendedCount}/{totalRecommendedCount})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Can be configured anytime to enhance college workflow
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {recommendedItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    item.completed
                      ? "bg-white/80 border-emerald-200"
                      : "bg-white/70 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {item.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                      )}
                      <span className="font-medium text-xs text-slate-800">{item.title}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  {item.action_url && !item.completed && (
                    <div className="mt-2">
                      <Link
                        to={item.action_url}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-indigo-600"
                      >
                        Set up <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
