import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import SubscriptionBannerCard from "../../components/admin/SubscriptionBannerCard";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import {
  CreditCard,
  ShieldCheck,
  Clock,
  Sparkles,
  Receipt,
  FileCheck2,
  Layers,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Building2,
  CheckCircle2,
} from "lucide-react";

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export default function AdminBillingPage() {
  const { data: college, isLoading: isCollegeLoading } = useQuery({
    queryKey: ["adminCollegeInfo"],
    queryFn: () => adminApi.getCollegeInfo().then((res) => res.data),
    staleTime: 30000,
  });

  const { data: transactions = [], isLoading: isTxnsLoading } = useQuery({
    queryKey: ["adminBillingTransactions"],
    queryFn: () => adminApi.getBillingTransactions().then((res) => res.data),
    staleTime: 15000,
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight">
              Billing & Subscription
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <CreditCard className="w-3.5 h-3.5" /> Institutional Account
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Manage your campus license, 30-day billing cycle, renewal payments, and transaction history for{" "}
            <span className="font-semibold text-slate-800">{college?.name || "your institution"}</span>.
          </p>
        </div>

        <Link
          to="/admin/features"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/40 shadow-xs hover:shadow-sm transition-all flex-shrink-0 whitespace-nowrap self-start sm:self-center group"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 transition-transform group-hover:scale-110" />
          <span>Browse Modules & Add-ons</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Core Subscription Banner & Action Card */}
      <SubscriptionBannerCard collegeData={college} />

      {/* Plan Details & Entitlements 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Inclusions */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Campus Standard License Coverage
                  </h3>
                  <p className="text-xs text-slate-500">
                    Included turnkey capabilities with your ₹10,000 monthly subscription
                  </p>
                </div>
              </div>
              <Badge variant="success" className="text-xs">
                Active Tier
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <Building2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Multi-Tenant Campus Isolation</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Isolated institutional database and allowed student email domain restriction.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <Layers className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Placement Drive Pipeline</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Full drive lifecycle, round tracking, eligibility filters, and automated notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">AI Student Prep Suite</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    AI Resume ATS scoring, interactive mock interview station, and study resources.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <FileCheck2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">OCR Fee Receipt Gate</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automated multi-template matching and clearance verification before test access.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Transaction Ledger / Invoices */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Payment & Invoice History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Records of monthly license renewals and feature purchases via Razorpay
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                {transactions.length} Transaction(s)
              </span>
            </div>

            {isTxnsLoading ? (
              <div className="py-12 flex justify-center">
                <Spinner />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No online payment transactions recorded yet for this institution.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 pr-4">Description</th>
                      <th className="py-2.5 pr-4">Order ID</th>
                      <th className="py-2.5 pr-4">Payment ID</th>
                      <th className="py-2.5 pr-4">Amount</th>
                      <th className="py-2.5 pr-4">Date</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pr-4 font-semibold text-slate-900">
                          {tx.description}
                        </td>
                        <td className="py-3 pr-4 font-mono text-[11px] text-slate-500">
                          {tx.razorpay_order_id}
                        </td>
                        <td className="py-3 pr-4 font-mono text-[11px] text-slate-600">
                          {tx.razorpay_payment_id || "—"}
                        </td>
                        <td className="py-3 pr-4 font-bold text-slate-900">
                          ₹{tx.amount?.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">
                          {formatDateTime(tx.paid_at || tx.created_at)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : tx.status === "created"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {tx.status === "paid" ? "✓ Paid" : tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Terms & Quick Info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h4 className="text-sm font-bold text-slate-900 font-heading mb-3 flex items-center gap-2">
              <Clock className="text-indigo-600" size={17} /> Renewal Policy
            </h4>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>Fixed 30-Day Windows:</strong> Your campus subscription extends for 30 consecutive calendar days per payment.
              </p>
              <p>
                <strong>Pay Button Lock:</strong> While your current 30-day window is active, the Pay button remains locked to prevent accidental double charges.
              </p>
              <p>
                <strong>Automatic Enablement:</strong> The Pay button automatically enables the moment your 30-day subscription concludes (e.g. 1 Jan to 31 Jan).
              </p>
              <p>
                <strong>Uninterrupted Access:</strong> Active recruitment rounds and student profiles remain preserved during renewal periods.
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-2">
              <Sparkles className="w-4 h-4" /> Need Add-on Modules?
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Explore extra departmental add-ons, test proctoring tools, or submit custom feature proposals for your institution.
            </p>
            <Link
              to="/admin/features"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Open Modules & Add-ons <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
