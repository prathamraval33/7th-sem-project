import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
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
  Plus,
  Lightbulb,
  MessageSquare,
  Calendar,
  Layers,
  Send,
  HelpCircle,
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
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synced main tabs: "catalog" (default) or "proposals"
  const activeMainTab = searchParams.get("tab") || "catalog";
  const handleMainTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // State for Catalog tab
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [payingFeatureId, setPayingFeatureId] = useState(null);

  // State for Proposals tab
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState("all");
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalFormData, setProposalFormData] = useState({
    title: "",
    target_user: "student",
    category: "General",
    priority: "medium",
    description: "",
  });

  // Queries
  const { data: features = [], isLoading: isCatalogLoading, refetch: refetchCatalog } = useQuery({
    queryKey: ["adminFeatures"],
    queryFn: () => adminApi.getFeatures().then((res) => res.data),
  });

  const { data: customProposals = [], isLoading: isProposalsLoading, refetch: refetchProposals } = useQuery({
    queryKey: ["adminCustomFeatures"],
    queryFn: () => adminApi.getCustomFeatures().then((res) => res.data),
  });

  // Mutations for Catalog
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

  // Mutations for Custom Proposals
  const submitProposalMutation = useMutation({
    mutationFn: (payload) => adminApi.createCustomFeature(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminCustomFeatures"]);
      setShowProposalModal(false);
      setProposalFormData({
        title: "",
        target_user: "student",
        category: "General",
        priority: "medium",
        description: "",
      });
      showSuccess(
        "Proposal Submitted!",
        "Your feature proposal has been delivered to the SuperAdmin engineering team. You can monitor review notes and roadmap updates directly here."
      );
    },
    onError: (err) => {
      showError("Submission Failed", err.response?.data?.detail || "Could not submit custom feature proposal.");
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
        prefill: {
          name: "Placement Administrator",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: function () {
            setPayingFeatureId(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (failRes) {
        setPayingFeatureId(null);
        showError("Payment Failed", failRes.error?.description || "Transaction was rejected or cancelled.");
      });
      rzp.open();
    } catch (err) {
      setPayingFeatureId(null);
      const msg = err.response?.data?.detail || "Failed to initiate payment. Please try again.";
      showError("Payment Initiation Failed", msg);
    }
  };

  const getCatalogStatusDisplay = (status) => {
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

  const getProposalStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending Review",
          className: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
        };
      case "under_review":
        return {
          label: "Under Review",
          className: "bg-blue-50 text-blue-700 border-blue-200",
          icon: HelpCircle,
        };
      case "planned":
        return {
          label: "Planned on Roadmap",
          className: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Layers,
        };
      case "in_progress":
        return {
          label: "In Development",
          className: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: Zap,
        };
      case "completed":
        return {
          label: "Completed & Live",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
      case "declined":
        return {
          label: "Declined",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          className: "bg-slate-100 text-slate-700 border-slate-200",
          icon: Clock,
        };
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return { label: "Critical Priority", className: "bg-red-50 text-red-700 border-red-200" };
      case "high":
        return { label: "High Priority", className: "bg-orange-50 text-orange-700 border-orange-200" };
      case "medium":
        return { label: "Medium Priority", className: "bg-blue-50 text-blue-700 border-blue-200" };
      case "low":
        return { label: "Low Priority", className: "bg-slate-100 text-slate-600 border-slate-200" };
      default:
        return { label: priority || "Normal", className: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  };

  const filteredCatalogFeatures = features.filter((feat) => {
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

  const filteredCustomProposals = customProposals.filter((prop) => {
    const matchesSearch =
      prop.title.toLowerCase().includes(proposalSearch.toLowerCase()) ||
      prop.description.toLowerCase().includes(proposalSearch.toLowerCase()) ||
      prop.category.toLowerCase().includes(proposalSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (proposalStatusFilter !== "all" && prop.status !== proposalStatusFilter) {
      return false;
    }

    return true;
  });

  const handleProposalSubmit = (e) => {
    e.preventDefault();
    if (!proposalFormData.title.trim() || !proposalFormData.description.trim()) {
      showError("Validation Error", "Please provide both a feature title and detailed description.");
      return;
    }
    submitProposalMutation.mutate(proposalFormData);
  };

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
              Modules & Add-ons Store
            </h1>
          </div>
          <p className="text-slate-600 mt-1 text-sm">
            Browse optional departmental capabilities, request add-on features, or submit custom proposals to the SuperAdmin engineering team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === "catalog" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchCatalog()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Catalog
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchProposals()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setShowProposalModal(true)}
                className="flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Propose New Feature
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Core Institutional License Banner Linking to Billing */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-indigo-200 border border-white/10 flex-shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Core Campus License
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                ₹10,000 / month
              </span>
            </div>
            <p className="text-xs text-indigo-100 mt-0.5">
              Your primary institution operates on the <strong>Campus Standard License</strong>. View your 30-day billing cycle dates, invoices, and renewal settings in Billing.
            </p>
          </div>
        </div>

        <Link
          to="/admin/billing"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 transition shadow-xs whitespace-nowrap self-start sm:self-auto"
        >
          <span>Open Billing & Subscription</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleMainTabChange("catalog")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeMainTab === "catalog"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Catalog Modules</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-normal">
            {features.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleMainTabChange("proposals")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeMainTab === "proposals"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          <span>Custom Feature Proposals</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
            {customProposals.length}
          </span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CATALOG MODULES */}
      {/* ------------------------------------------------------------- */}
      {activeMainTab === "catalog" && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-semibold">How feature lifecycle works:</span> Select any catalog feature to submit an institutional request. Once approved by SuperAdmin, paid features unlock a direct <span className="font-semibold">Pay Now</span> button powered by Razorpay test checkout. Free features are activated automatically upon approval.
            </div>
          </div>

          {/* Search & Sub-filters */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog by name, category, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "All Modules" },
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

          {/* Catalog Grid */}
          {isCatalogLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : filteredCatalogFeatures.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 font-heading">No Features Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No catalog features match your current filter or search criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCatalogFeatures.map((feature) => {
                const statusInfo = getCatalogStatusDisplay(feature.status);
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
                      {feature.status === "active" && (
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Enabled for Institution
                        </div>
                      )}

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

                      {feature.status === "pending_review" && (
                        <div className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          Review in Progress by SuperAdmin
                        </div>
                      )}

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
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CUSTOM FEATURE PROPOSALS */}
      {/* ------------------------------------------------------------- */}
      {activeMainTab === "proposals" && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 leading-relaxed">
              <span className="font-semibold">Co-create platform capabilities:</span> Have an idea or custom workflow specific to your campus placement needs? Propose new features directly to the SuperAdmin engineering team. You will receive roadmap updates and feedback notes here.
            </div>
          </div>

          {/* Search & Filters Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search proposals by title, category, or keyword..."
                value={proposalSearch}
                onChange={(e) => setProposalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "All Proposals" },
                { id: "pending", label: "Pending" },
                { id: "under_review", label: "Under Review" },
                { id: "planned", label: "Planned" },
                { id: "in_progress", label: "In Progress" },
                { id: "completed", label: "Completed" },
                { id: "declined", label: "Declined" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProposalStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    proposalStatusFilter === tab.id
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proposals Directory */}
          {isProposalsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : filteredCustomProposals.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 font-heading">
                {customProposals.length === 0
                  ? "No Custom Feature Proposals Yet"
                  : "No Proposals Match Filters"}
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {customProposals.length === 0
                  ? "Suggest a new tool, workflow, or AI feature to be reviewed and prioritized by the SuperAdmin team."
                  : "Try clearing your search query or selecting a different status filter."}
              </p>
              {customProposals.length === 0 && (
                <Button
                  onClick={() => setShowProposalModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Propose Your First Feature
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomProposals.map((proposal) => {
                const statusBadge = getProposalStatusBadge(proposal.status);
                const priorityBadge = getPriorityBadge(proposal.priority);
                const StatusIcon = statusBadge.icon;

                return (
                  <div
                    key={proposal.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all duration-200 space-y-4"
                  >
                    {/* Top Row: Title, Priority, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${priorityBadge.className}`}>
                            {priorityBadge.label}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                            {proposal.category}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700">
                            Target: {proposal.target_user.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 font-heading">
                          {proposal.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${statusBadge.className}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{statusBadge.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Description */}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      {proposal.description}
                    </p>

                    {/* SuperAdmin Feedback Dialogue Box */}
                    {proposal.superadmin_feedback && (
                      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          <span>SuperAdmin Feedback & Dialogue</span>
                        </div>
                        <p className="text-xs text-blue-900/90 leading-relaxed whitespace-pre-line pl-6">
                          {proposal.superadmin_feedback}
                        </p>
                      </div>
                    )}

                    {/* Footer Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Submitted on {new Date(proposal.created_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        Proposal #{proposal.id}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: PROPOSE NEW FEATURE */}
      {/* ------------------------------------------------------------- */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Lightbulb size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Propose New Platform Feature
                </h2>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleProposalSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Feature Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Coding Sandbox, Dynamic ATS Checker"
                  value={proposalFormData.title}
                  onChange={(e) => setProposalFormData({ ...proposalFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Persona
                  </label>
                  <select
                    value={proposalFormData.target_user}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, target_user: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="tpo">TPO</option>
                    <option value="admin">College Admin</option>
                    <option value="all">All Roles</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={proposalFormData.category}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Placements">Placements</option>
                    <option value="Assessments">Assessments</option>
                    <option value="AI & Learning">AI & Learning</option>
                    <option value="Analytics">Analytics</option>
                    <option value="Communications">Communications</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urgency / Priority
                  </label>
                  <select
                    value={proposalFormData.priority}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Description & Rationale <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the problem this feature solves, which workflows it enhances, and how your students or placement officers would use it..."
                  value={proposalFormData.description}
                  onChange={(e) => setProposalFormData({ ...proposalFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Minimum 10 characters. Detailed context helps SuperAdmin evaluate and roadmap your proposal faster.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProposalModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={submitProposalMutation.isPending}
                  className="flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Proposal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
