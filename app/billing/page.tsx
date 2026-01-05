"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Receipt,
  Settings,
  Tag,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Skeleton, { SkeletonText } from "@/components/ui/Skeleton";
import { ApiError, apiCall, apiCallJson } from "@/lib/api-client";

interface BillingPageProps {
  params?: Promise<{ userId?: string }>;
  searchParams?: Promise<{ userId?: string; email?: string }>;
}

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  is_active: boolean;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  pdf?: string;
  hosted_invoice_url?: string;
}

interface BillingData {
  success: boolean;
  currentSubscription: Subscription | null;
  invoices?: Invoice[];
  paymentMethods?: any[];
  hasPaymentCustomer: boolean;
  email?: string; // User email for checkout
}

export default function BillingPage({
  params,
  searchParams,
}: BillingPageProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "payment-methods">(
    "overview",
  );
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  // Handle async params and searchParams
  React.useEffect(() => {
    const loadParams = async () => {
      let resolvedUserId = "";
      let resolvedEmail = "";

      // Try to get userId from params (dynamic route)
      if (params) {
        const resolvedParams = await params;
        resolvedUserId = resolvedParams?.userId || "";
      }

      // Try to get userId/email from searchParams (query string)
      if (searchParams) {
        const resolvedSearchParams = await searchParams;
        if (resolvedSearchParams?.userId) {
          resolvedUserId = resolvedSearchParams.userId;
        }
        if (resolvedSearchParams?.email) {
          resolvedEmail = resolvedSearchParams.email;
        }
      }

      // Also check URL search params directly (fallback)
      if (typeof window !== "undefined" && !resolvedUserId) {
        const urlParams = new URLSearchParams(window.location.search);
        resolvedUserId = urlParams.get("userId") || "";
        resolvedEmail = urlParams.get("email") || resolvedEmail;
      }

      setUserId(resolvedUserId);
      setUserEmail(resolvedEmail);
    };

    loadParams();
  }, [params, searchParams]);

  // Fetch billing data (only if userId is available)
  useEffect(() => {
    if (!userId) {
      // If no userId, still allow checkout but don't fetch billing data
      setLoading(false);
      return;
    }

    const fetchBillingData = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiCallJson<BillingData>(
          `/api/billing?userId=${userId}`,
        );

        setBillingData(data);
        // Update email from billing data if available
        if (data.email && !userEmail) {
          setUserEmail(data.email);
        }
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "Failed to load billing information";
        setError(errorMessage);
        console.error("Billing fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [userId, userEmail]);

  const handleManageBilling = async () => {
    if (!billingData?.currentSubscription) return;

    try {
      setProcessing(true);
      setError("");
      const response = await apiCall("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to open billing portal");
      }
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : "Failed to open billing portal";
      setError(errorMessage);
      console.error("Portal error:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartCheckout = async () => {
    try {
      setProcessing(true);
      setError("");

      // Get user email from billing data, state, or query params
      const emailForCheckout = billingData?.email || userEmail || null;

      // Call API to get checkout URL (product ID is server-side only)
      const response = await apiCall("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: emailForCheckout || undefined,
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        // Redirect to Polar checkout
        window.location.href = data.checkoutUrl;
      } else if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        setError(
          data.error || "Failed to start checkout. Please contact support.",
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "Failed to start checkout. Please try again.";
      setError(errorMessage);
      console.error("Checkout error:", err);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string | number) => {
    const date =
      typeof dateString === "string"
        ? new Date(dateString)
        : new Date(dateString * 1000);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Promo Code Component
  function PromoCodeSection() {
    const [promoCode, setPromoCode] = useState("");
    const [promoEmail, setPromoEmail] = useState("");
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoError, setPromoError] = useState("");
    const [promoSuccess, setPromoSuccess] = useState(false);

    const handlePromoSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setPromoError("");
      setPromoSuccess(false);

      if (!promoEmail || !promoCode) {
        setPromoError("Please enter both email and promo code");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(promoEmail)) {
        setPromoError("Please enter a valid email address");
        return;
      }

      setPromoLoading(true);
      try {
        const response = await apiCall("/api/apply-promo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: promoEmail,
            promoCode: promoCode.trim(),
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setPromoSuccess(true);
          setPromoCode("");
          setPromoEmail("");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setPromoError(data.error || "Invalid promo code");
        }
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "Failed to apply promo code. Please try again.";
        setPromoError(errorMessage);
      } finally {
        setPromoLoading(false);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border-2 border-brand-500/40 p-8 sm:p-10 md:p-12 bg-gradient-to-br from-brand-500/15 via-purple-600/10 to-brand-500/15 backdrop-blur-md shadow-[0_24px_80px_rgba(99,102,241,0.3)]"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/20 mb-4">
            <Tag className="w-8 h-8 text-brand-300" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Have a Promo Code?
          </h3>
          <p className="text-zinc-100 text-base font-medium max-w-xl mx-auto">
            Enter your email and promo code to upgrade to Premium instantly.
          </p>
        </div>

        <form
          onSubmit={handlePromoSubmit}
          className="space-y-4 max-w-md mx-auto"
        >
          <div>
            <label
              htmlFor="promo-email"
              className="block text-sm font-semibold text-white mb-2"
            >
              Email Address
            </label>
            <input
              id="promo-email"
              type="email"
              value={promoEmail}
              onChange={(e) => setPromoEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={promoLoading || promoSuccess}
              className="w-full px-5 py-4 bg-black/50 border-2 border-white/20 rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="promo-code"
              className="block text-sm font-semibold text-white mb-2"
            >
              Promo Code
            </label>
            <input
              id="promo-code"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              required
              disabled={promoLoading || promoSuccess}
              className="w-full px-5 py-4 bg-black/50 border-2 border-white/20 rounded-2xl text-white placeholder-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/30 transition-all text-base font-medium backdrop-blur-sm disabled:opacity-50"
            />
          </div>

          {promoError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-300 text-sm font-medium"
            >
              {promoError}
            </motion.div>
          )}

          {promoSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-xl text-emerald-300 text-sm font-medium"
            >
              Promo code applied! Upgrading your account...
            </motion.div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={promoLoading}
            disabled={promoLoading || promoSuccess}
            className="w-full"
          >
            Apply Promo Code
          </Button>
        </form>
      </motion.div>
    );
  }

  const formatStatus = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: string; icon: React.ReactNode }
    > = {
      active: {
        label: "Active",
        color: "text-green-400",
        icon: <CheckCircle className="w-4 h-4" />,
      },
      canceled: {
        label: "Canceled",
        color: "text-red-400",
        icon: <XCircle className="w-4 h-4" />,
      },
      past_due: {
        label: "Past Due",
        color: "text-yellow-400",
        icon: <XCircle className="w-4 h-4" />,
      },
      trialing: {
        label: "Trialing",
        color: "text-blue-400",
        icon: <CheckCircle className="w-4 h-4" />,
      },
      unpaid: {
        label: "Unpaid",
        color: "text-red-400",
        icon: <XCircle className="w-4 h-4" />,
      },
      paid: {
        label: "Paid",
        color: "text-green-400",
        icon: <CheckCircle className="w-4 h-4" />,
      },
    };

    return (
      statusMap[status] || {
        label: status,
        color: "text-zinc-400",
        icon: <Settings className="w-4 h-4" />,
      }
    );
  };

  const tabs = [
    {
      id: "overview",
      label: "Billing Overview",
      icon: Settings,
      description: "Manage your subscription and view billing history",
    },
    {
      id: "payment-methods",
      label: "Payment Methods",
      icon: CreditCard,
      description: "Add and manage your payment methods",
    },
  ];

  return (
    <div className="min-h-screen premium-bg">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10"
      >
        <div className="container-page py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
                Billing & Payments
              </h1>
              <p className="text-zinc-100 mt-3 text-lg font-medium">
                {tabs.find((t) => t.id === activeTab)?.description}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border-2 border-white/20 bg-white/8 px-4 py-2 text-sm font-medium text-zinc-100 backdrop-blur-sm">
              <FileText className="w-4 h-4 text-brand-300" />
              <span>Secure & Encrypted</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="container-page">
          <div className="flex space-x-6 sm:space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id as "overview" | "payment-methods")
                  }
                  className={`flex items-center gap-3 py-5 px-3 border-b-2 transition-all duration-200 font-semibold ${
                    isActive
                      ? "border-brand-500 text-brand-200"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-page py-16 sm:py-20">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard intent="subtle" className="p-12">
                <div className="text-center">
                  <Skeleton className="h-12 w-12 mx-auto mb-4 rounded-full" />
                  <SkeletonText lines={2} className="max-w-md mx-auto" />
                </div>
              </GlassCard>
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard
                intent="subtle"
                className="p-6 border border-red-500/50"
              >
                <div className="flex items-center gap-3 text-red-400">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {!loading && !error && activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                  Billing Overview
                </h2>
                <p className="text-zinc-100 text-lg font-medium">
                  Manage your subscription, view invoices, and control your
                  billing settings.
                </p>
              </div>

              {billingData?.currentSubscription ? (
                <>
                  {/* Current Subscription Card */}
                  <div className="rounded-3xl border-2 border-white/20 bg-white/[0.08] p-8 sm:p-10 md:p-12 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                          Current Subscription
                        </h3>
                        <div className="flex items-center gap-3">
                          {(() => {
                            const statusInfo = formatStatus(
                              billingData.currentSubscription.status,
                            );
                            return (
                              <>
                                <span className={statusInfo.color}>
                                  {statusInfo.icon}
                                </span>
                                <span
                                  className={`${statusInfo.color} font-bold text-lg`}
                                >
                                  {statusInfo.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <Button
                        onClick={handleManageBilling}
                        isLoading={processing}
                        disabled={processing}
                        variant="primary"
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Manage Subscription
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.05]">
                        <div className="p-3 bg-brand-500/20 rounded-xl">
                          <Calendar className="w-6 h-6 text-brand-300" />
                        </div>
                        <div>
                          <p className="text-zinc-300 text-sm font-medium mb-2">
                            Current Period
                          </p>
                          <p className="text-white font-bold text-base">
                            {formatDate(
                              billingData.currentSubscription
                                .current_period_start,
                            )}{" "}
                            -{" "}
                            {formatDate(
                              billingData.currentSubscription
                                .current_period_end,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.05]">
                        <div className="p-3 bg-brand-500/20 rounded-xl">
                          <DollarSign className="w-6 h-6 text-brand-300" />
                        </div>
                        <div>
                          <p className="text-zinc-300 text-sm font-medium mb-2">
                            Subscription Status
                          </p>
                          <p className="text-white font-bold text-base">
                            {billingData.currentSubscription
                              .cancel_at_period_end
                              ? "Cancels at period end"
                              : "Renews automatically"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing History */}
                  <div className="rounded-3xl border-2 border-white/20 bg-white/[0.08] p-8 sm:p-10 md:p-12 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-8">
                      Billing History
                    </h3>
                    {billingData.invoices && billingData.invoices.length > 0 ? (
                      <div className="space-y-4">
                        {billingData.invoices.map((invoice) => {
                          const statusInfo = formatStatus(invoice.status);
                          return (
                            <motion.div
                              key={invoice.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-5 rounded-2xl border-2 border-white/10 bg-white/[0.05] hover:border-brand-500/30 hover:bg-white/[0.08] transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-glass-default rounded-lg">
                                  <Receipt className="w-5 h-5 text-brand-400" />
                                </div>
                                <div>
                                  <p className="text-white font-bold text-lg">
                                    {formatCurrency(
                                      invoice.amount,
                                      invoice.currency,
                                    )}
                                  </p>
                                  <p className="text-zinc-300 text-sm font-medium">
                                    {formatDate(invoice.created)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div
                                  className={`flex items-center gap-2 ${statusInfo.color}`}
                                >
                                  {statusInfo.icon}
                                  <span className="text-sm font-medium">
                                    {statusInfo.label}
                                  </span>
                                </div>
                                {invoice.hosted_invoice_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    href={invoice.hosted_invoice_url}
                                    target="_blank"
                                  >
                                    <Download className="w-4 h-4" />
                                    View
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-zinc-300">
                        <FileText className="w-16 h-16 mx-auto mb-6 opacity-50" />
                        <p className="mb-6 text-lg font-medium">
                          No invoices yet
                        </p>
                        <Button
                          onClick={handleManageBilling}
                          disabled={processing}
                          variant="secondary"
                          size="lg"
                        >
                          Open Customer Portal
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                  <div className="rounded-3xl border-2 border-white/20 bg-white/[0.08] p-10 sm:p-12 md:p-16 text-center backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                    <CreditCard className="w-20 h-20 mx-auto mb-6 text-zinc-300" />
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                      No Active Subscription
                    </h3>
                    <p className="text-zinc-100 text-lg font-medium mb-8 max-w-xl mx-auto">
                      You don't have an active subscription yet. Upgrade to
                      Premium to unlock more job matches.
                    </p>
                    {error && (
                      <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
                        {error}
                      </div>
                    )}
                    <Button
                      onClick={handleStartCheckout}
                      disabled={processing || loading}
                      variant="primary"
                      size="lg"
                      className="min-w-[240px]"
                    >
                      {processing ? "Processing..." : "Subscribe to Premium"}
                    </Button>
                  </div>

                  {/* Promo Code Section */}
                  <PromoCodeSection />
                </div>
              )}
            </motion.div>
          )}

          {!loading && !error && activeTab === "payment-methods" && (
            <motion.div
              key="payment-methods"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                  Payment Methods
                </h2>
                <p className="text-zinc-100 text-lg font-medium">
                  Add and manage your payment methods securely.
                </p>
              </div>
              <div className="space-y-8">
                <div className="rounded-3xl border-2 border-white/20 bg-white/[0.08] p-10 sm:p-12 md:p-16 text-center backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
                  <CreditCard className="w-20 h-20 mx-auto mb-6 text-zinc-300" />
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    Payment Methods
                  </h3>
                  <p className="text-zinc-100 text-lg font-medium mb-8 max-w-xl mx-auto">
                    Manage your payment methods securely through our billing
                    portal.
                  </p>
                  <Button
                    onClick={handleManageBilling}
                    disabled={processing || !billingData?.currentSubscription}
                    isLoading={processing}
                    variant="primary"
                    size="lg"
                    className="min-w-[240px]"
                  >
                    Manage Payment Methods
                  </Button>
                  {!billingData?.currentSubscription && (
                    <p className="text-sm font-medium text-zinc-300 mt-6">
                      Subscribe first to add payment methods
                    </p>
                  )}
                </div>

                {!billingData?.currentSubscription && <PromoCodeSection />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer bullets */}
      <div className="border-t border-white/10">
        <div className="container-page py-10 sm:py-12">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-zinc-300 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> PCI
              DSS Compliant
            </span>
            <span className="hidden sm:block w-px h-4 bg-white/10" />
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-500 rounded-full"></span>{" "}
              256-bit SSL Encryption
            </span>
            <span className="hidden sm:block w-px h-4 bg-white/10" />
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Secure
              Payments
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
