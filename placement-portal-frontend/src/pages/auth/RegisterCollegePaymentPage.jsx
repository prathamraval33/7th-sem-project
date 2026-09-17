import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Clock,
  Layers,
  FileCheck2,
  HelpCircle,
} from "lucide-react";
import Button from "../../components/common/Button";
import { adminApi } from "../../api/admin.api";
import { loadRazorpayScript } from "../../utils/razorpay";
import { showError, showSuccess } from "../../utils/swal";
import { useAuth } from "../../auth/useAuth";
import { getAccessToken } from "../../utils/tokenStorage";

export default function RegisterCollegePaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const state = location.state || {};
  const [collegeId, setCollegeId] = useState(state.college_id || null);
  const [collegeName, setCollegeName] = useState(state.college_name || "Your Institution");
  const [adminEmail, setAdminEmail] = useState(state.admin_email || state.email || "");
  const [adminName, setAdminName] = useState(state.admin_name || "Administrator");
  const [amount, setAmount] = useState(state.subscription_amount || 10000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCollege, setIsLoadingCollege] = useState(!state.college_id);

  useEffect(() => {
    // If college_id is not in location state, try fetching from authenticated admin profile
    if (!collegeId) {
      const token = getAccessToken();
      if (token) {
        adminApi
          .getCollegeInfo()
          .then((res) => {
            if (res.data?.id) {
              setCollegeId(res.data.id);
              setCollegeName(res.data.name || "Your Institution");
              if (res.data.subscription_amount) {
                setAmount(res.data.subscription_amount);
              }
            }
          })
          .catch((err) => {
            console.error("Could not fetch college details:", err);
          })
          .finally(() => {
            setIsLoadingCollege(false);
          });
      } else {
        setIsLoadingCollege(false);
      }
    }
  }, [collegeId]);

  const handlePayNow = async () => {
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

      // 1. Create order on backend
      const orderRes = await adminApi.createSubscriptionOrder(collegeId);
      const order = orderRes.data;

      // Guard: If backend returned a mock order ID (e.g. backend was running before razorpay was installed)
      if (order.order_id?.startsWith("order_mock_")) {
        showError(
          "Gateway In Mock Mode",
          `Backend generated a mock order (${order.order_id}). Razorpay client was not active when the backend started. Please restart your FastAPI backend server so it connects to Razorpay live test mode.`
        );
        setIsProcessing(false);
        return;
      }

      // 2. Open Razorpay Modal
      const options = {
        key: order.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TXqWyY8wIQsVyy",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Placement Portal",
        description: `Campus Standard License (${collegeName})`,
        order_id: order.order_id,
        handler: async function (response) {
          try {
            // 3. Verify signature on backend
            await adminApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await refreshUser();

            await showSuccess(
              "Subscription Activated!",
              "Your Campus Standard License (₹10,000/mo) is now active! All required subscription checks have been completed."
            );

            navigate("/admin/dashboard", { replace: true });
          } catch (verifyErr) {
            const msg = verifyErr.response?.data?.detail || "Payment verification failed. Please contact support.";
            showError("Verification Error", msg);
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: adminName,
          email: adminEmail,
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
      const msg = err.response?.data?.detail || "Failed to initiate subscription payment. Please try again.";
      showError("Payment Initiation Failed", msg);
    }
  };

  const handleSkipForNow = () => {
    // Proceed to Admin Dashboard in Setup Mode
    navigate("/admin/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
          Campus License Subscription
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Activate institutional access for <span className="font-semibold text-slate-900">{collegeName}</span>
        </p>

        {/* 4-Step Progress Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
            <span className="hidden sm:inline">Institution</span>
          </div>
          <div className="w-6 sm:w-8 h-0.5 bg-emerald-500" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
            <span className="hidden sm:inline">Email</span>
          </div>
          <div className="w-6 sm:w-8 h-0.5 bg-emerald-500" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
            <span className="hidden sm:inline">Admin</span>
          </div>
          <div className="w-6 sm:w-8 h-0.5 bg-indigo-600" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">4</span>
            <span>Subscription</span>
          </div>
        </div>
      </div>

      {/* Pricing Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          {/* Plan Header Accent */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-300" /> Enterprise Campus Plan
                </span>
                <h3 className="text-2xl font-bold font-heading text-white">Campus Standard License</h3>
                <p className="text-indigo-200 text-xs sm:text-sm mt-1">
                  Complete turnkey placement portal infrastructure for your college
                </p>
              </div>

              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">₹{amount.toLocaleString("en-IN")}</span>
                  <span className="text-indigo-200 text-sm font-medium">/ month</span>
                </div>
                <span className="text-[11px] text-indigo-300">Billed monthly • Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="p-6 sm:p-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Everything included in your license:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Building2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Multi-Tenant Campus Isolation</h5>
                  <p className="text-[11px] text-slate-500">Dedicated institutional workspace with custom student domain gates.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Layers className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Full Placement Drive Engine</h5>
                  <p className="text-[11px] text-slate-500">Post drives, coordinate rounds, track shortlists, and auto-notify students.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-slate-800">AI Student Prep Suite</h5>
                  <p className="text-[11px] text-slate-500">AI resume ATS feedback, interactive mock interviews, and skill test bank.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <FileCheck2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Fee Verification AI Gate</h5>
                  <p className="text-[11px] text-slate-500">Automated multi-template matching for student clearance.</p>
                </div>
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="mt-6 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3 text-xs text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Razorpay Verified Secure Gateway:</span> Transactions are encrypted with bank-grade 256-bit SSL. Test card credentials or UPI test IDs can be used in development.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <Button
                onClick={handlePayNow}
                isLoading={isProcessing || isLoadingCollege}
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 text-sm font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Pay ₹{amount.toLocaleString("en-IN")} via Razorpay
              </Button>

              <button
                type="button"
                onClick={handleSkipForNow}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-transparent hover:border-slate-200 flex items-center justify-center gap-1.5"
              >
                Skip for now & set up first <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Explanatory Callout for Skip Option */}
            <div className="mt-4 text-center">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Skipping adds the ₹10,000 subscription to your <strong>Admin Setup Checklist</strong> to pay before launch.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
