import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/common/Button";
import {
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { showConfirm, showSuccess, showError, showToast } from "../../utils/swal";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AdminFeaturesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [payingFeatureId, setPayingFeatureId] = useState(null);

  const { data: features = [], isLoading, refetch } = useQuery({
    queryKey: ["adminFeatures"],
    queryFn: () => adminApi.getFeatures().then((res) => res.data),
  });

  const requestMutation = useMutation({
    mutationFn: (featureId) => adminApi.requestFeature(featureId),
    onSuccess: (res, featureId) => {
      queryClient.invalidateQueries(["adminFeatures"]);
      queryClient.invalidateQueries(["activeFeatures"]);
      showToast("Feature requested successfully! Awaiting SuperAdmin review.");
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || "Failed to request feature";
      showError("Request Failed", msg);
    },
  });

  const handleRequest = async (feature) => {
    const isFree = !feature.price || feature.price <= 0;
    const confirmed = await showConfirm({
      title: `Request ${feature.name}?`,
      text: isFree
        ? "This is a free feature. Once approved by SuperAdmin, it will be activated immediately for your college."
        : `This feature is priced at ₹${feature.price} (${feature.billing_type.replace('_', ' ')}). After approval, you will be able to complete checkout via Razorpay.`,
      confirmButtonText: "Submit Request",
      confirmButtonColor: "#2563eb",
    });

    if (confirmed) {
      requestMutation.mutate(feature.id);
    }
  };

  const handlePay = async (feature) => {
    try {
      setPayingFeatureId(feature.id);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showError("Gateway Error", "Failed to load Razorpay checkout SDK. Please check your internet connection.");
        setPayingFeatureId(null);
        return;
      }

      // Step 1: Create Order on backend
      const orderRes = await adminApi.createPaymentOrder({ feature_id: feature.id });
      const order = orderRes.data;

      // Step 2: Open Razorpay Modal
      const options = {
        key: order.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TXqWyY8wIQsVyy",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Placement Portal",
        description: `Activation: ${feature.name}`,
        order_id: order.order_id,
        handler: async function (response) {
          try {
            // Step 3: Verify signature on backend
            await adminApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await showSuccess(
              "Payment Successful!",
              `${feature.name} has been activated for your institution.`
            );

            // Refetch data
            queryClient.invalidateQueries(["adminFeatures"]);
            queryClient.invalidateQueries(["activeFeatures"]);
          } catch (verifyErr) {
            const msg = verifyErr.response?.data?.detail || "Payment verification failed.";
            showError("Verification Error", msg);
          } finally {
            setPayingFeatureId(null);
          }
        },
        theme: {
          color: "#2563EB",
        },
        modal: {
          ondismiss: function () {
            setPayingFeatureId(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (failResponse) {
        showError("Payment Failed", failResponse.error?.description || "Payment attempt failed.");
        setPayingFeatureId(null);
        queryClient.invalidateQueries(["adminFeatures"]);
      });
      rzp.open();
    } catch (err) {
      setPayingFeatureId(null);
      const msg = err.response?.data?.detail || "Failed to initiate payment.";
      showError("Payment Initiation Failed", msg);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "active":
        return {
          label: "Active & Enabled",
          variant: "success",
          icon: CheckCircle2,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        };
      case "approved_awaiting_payment":
        return {
          label: "Approved — Ready for Payment",
          variant: "primary",
          icon: CreditCard,
          color: "text-blue-700 bg-blue-50 border-blue-200",
        };
      case "pending_review":
        return {
          label: "Under SuperAdmin Review",
          variant: "warning",
          icon: Clock,
          color: "text-amber-700 bg-amber-50 border-amber-200",
        };
      case "payment_failed":
        return {
          label: "Payment Failed",
          variant: "danger",
          icon: AlertTriangle,
          color: "text-rose-700 bg-rose-50 border-rose-200",
        };
      case "expired":
        return {
          label: "Subscription Expired",
          variant: "warning",
          icon: AlertCircle,
          color: "text-amber-700 bg-amber-50 border-amber-200",
        };
      case "rejected":
        return {
          label: "Request Declined",
          variant: "danger",
          icon: XCircle,
          color: "text-rose-700 bg-rose-50 border-rose-200",
        };
      case "revoked":
        return {
          label: "Access Revoked",
          variant: "default",
          icon: ShieldCheck,
          color: "text-slate-600 bg-slate-50 border-slate-200",
        };
      default:
        return {
          label: "Available to Request",
          variant: "outline",
          icon: Zap,
          color: "text-slate-500 bg-slate-50/50 border-slate-200",
        };
    }
  };

  const filteredFeatures = features.filter((feat) => {
    const matchesSearch =
      feat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feat.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === "active") return feat.status === "active";
    if (filterTab === "pending") return feat.status === "pending_review";
    if (filterTab === "payment") return feat.status === "approved_awaiting_payment" || feat.status === "payment_failed";
    if (filterTab === "available") return feat.status === "not_requested";

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-heading">
              Available Features & Add-ons
            </h1>
          </div>
          <p className="text-slate-600 mt-1 text-sm">
            Browse optional modules, request institutional access, and unlock capabilities with Razorpay sandbox payments.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="self-start sm:self-auto flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-semibold">How feature lifecycle works:</span> Select any feature to submit an institutional request. Once approved by the SuperAdmin, paid features unlock a direct <span className="font-semibold">Pay Now</span> button powered by Razorpay test checkout. Free features are unlocked automatically upon review.
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search features by name, category, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Features" },
            { id: "active", label: "Active" },
            { id: "payment", label: "Needs Payment" },
            { id: "pending", label: "Pending Review" },
            { id: "available", label: "Not Requested" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      {filteredFeatures.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 font-heading">No Features Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            No features match your current filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeatures.map((feature) => {
            const statusInfo = getStatusDisplay(feature.status);
            const StatusIcon = statusInfo.icon;
            const isPaying = payingFeatureId === feature.id;
            const isFree = !feature.price || feature.price <= 0;

            return (
              <div
                key={feature.id}
                className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {feature.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700">
                        {feature.target_role}
                      </span>
                    </div>

                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-blue-600 transition-colors">
                    {feature.name}
                  </h3>

                  <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed flex-1">
                    {feature.description}
                  </p>

                  {/* Pricing Display */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Pricing</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        {isFree ? (
                          <span className="text-base font-bold text-emerald-600 font-heading">Free</span>
                        ) : (
                          <>
                            <span className="text-lg font-bold text-slate-900 font-heading">
                              ₹{feature.price}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              / {feature.billing_type?.replace("_", " ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {feature.is_auto_granted && (
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Institutional Grant
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-2">
                  {/* Active */}
                  {feature.status === "active" && (
                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Enabled for Institution
                    </div>
                  )}

                  {/* Awaiting payment or retry */}
                  {(feature.status === "approved_awaiting_payment" || feature.status === "payment_failed" || feature.status === "expired") && (
                    <Button
                      onClick={() => handlePay(feature)}
                      disabled={isPaying}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs py-2.5 shadow-sm"
                    >
                      {isPaying ? (
                        <>
                          <Spinner size="sm" className="text-white" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          {feature.status === "payment_failed"
                            ? "Retry Payment (Razorpay)"
                            : feature.status === "expired"
                            ? "Renew with Razorpay"
                            : `Pay ₹${feature.price} via Razorpay`}
                        </>
                      )}
                    </Button>
                  )}

                  {/* Pending review */}
                  {feature.status === "pending_review" && (
                    <div className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      Review in Progress by SuperAdmin
                    </div>
                  )}

                  {/* Not requested or Rejected/Revoked */}
                  {(feature.status === "not_requested" || feature.status === "rejected" || feature.status === "revoked") && (
                    <Button
                      onClick={() => handleRequest(feature)}
                      disabled={requestMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {feature.status === "rejected" || feature.status === "revoked"
                        ? "Submit New Request"
                        : "Request Feature"}
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
