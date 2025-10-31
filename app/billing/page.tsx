'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Settings, FileText, CheckCircle, XCircle, Calendar, DollarSign, ExternalLink, Download, Receipt } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';

interface BillingPageProps {
  params: Promise<{ userId: string }>;
}

interface Subscription {
  id: string;
  stripe_subscription_id: string;
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
  hasStripeCustomer: boolean;
}

export default function BillingPage({ params }: BillingPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payment-methods'>('overview');
  const [userId, setUserId] = useState<string>('');
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setUserId(resolvedParams.userId);
    });
  }, [params]);

  // Fetch billing data
  useEffect(() => {
    if (!userId) return;

    const fetchBillingData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`/api/billing?userId=${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          setBillingData(data);
        } else {
          setError(data.error || 'Failed to load billing information');
        }
      } catch (err) {
        setError('Failed to load billing information');
        console.error('Billing fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [userId]);

  const handleManageBilling = async () => {
    if (!billingData?.currentSubscription) return;

    try {
      setProcessing(true);
      setError('');
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to open billing portal');
      }
    } catch (err) {
      setError('Failed to open billing portal');
      console.error('Portal error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string | number) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      active: { label: 'Active', color: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> },
      canceled: { label: 'Canceled', color: 'text-red-400', icon: <XCircle className="w-4 h-4" /> },
      past_due: { label: 'Past Due', color: 'text-yellow-400', icon: <XCircle className="w-4 h-4" /> },
      trialing: { label: 'Trialing', color: 'text-blue-400', icon: <CheckCircle className="w-4 h-4" /> },
      unpaid: { label: 'Unpaid', color: 'text-red-400', icon: <XCircle className="w-4 h-4" /> },
      paid: { label: 'Paid', color: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> },
    };

    return statusMap[status] || { label: status, color: 'text-zinc-400', icon: <Settings className="w-4 h-4" /> };
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Billing Overview',
      icon: Settings,
      description: 'Manage your subscription and view billing history'
    },
    {
      id: 'payment-methods',
      label: 'Payment Methods',
      icon: CreditCard,
      description: 'Add and manage your payment methods'
    }
  ];

  return (
    <div className="min-h-screen premium-bg">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10"
      >
        <div className="container-page py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Billing & Payments</h1>
              <p className="text-zinc-400 mt-2">{tabs.find(t => t.id === activeTab)?.description}</p>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <FileText className="w-5 h-5" />
              <span className="text-sm">Secure & Encrypted</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="container-page">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'payment-methods')}
                  className={`flex items-center gap-3 py-4 px-2 border-b-2 transition-all duration-200 ${
                    isActive ? 'border-brand-500 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-page py-12">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard variant="subtle" className="p-12">
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
              <GlassCard variant="subtle" className="p-6 border border-red-500/50">
                <div className="flex items-center gap-3 text-red-400">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}
          
          {!loading && !error && activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold">Billing Overview</h2>
                <p className="text-zinc-400 mt-1">Manage your subscription, view invoices, and control your billing settings.</p>
              </div>

              {billingData?.currentSubscription ? (
                <>
                  {/* Current Subscription Card */}
                  <GlassCard variant="elevated" hover="lift" className="p-6 md:p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold mb-2">Current Subscription</h3>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const statusInfo = formatStatus(billingData.currentSubscription.status);
                            return (
                              <>
                                <span className={statusInfo.color}>{statusInfo.icon}</span>
                                <span className={`${statusInfo.color} font-medium`}>{statusInfo.label}</span>
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
                        size="md"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Manage Subscription
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-brand-500/10 rounded-lg">
                          <Calendar className="w-5 h-5 text-brand-400" />
                        </div>
                        <div>
                          <p className="text-zinc-400 text-sm mb-1">Current Period</p>
                          <p className="text-white font-medium">
                            {formatDate(billingData.currentSubscription.current_period_start)} - {formatDate(billingData.currentSubscription.current_period_end)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-brand-500/10 rounded-lg">
                          <DollarSign className="w-5 h-5 text-brand-400" />
                        </div>
                        <div>
                          <p className="text-zinc-400 text-sm mb-1">Subscription Status</p>
                          <p className="text-white font-medium">
                            {billingData.currentSubscription.cancel_at_period_end 
                              ? 'Cancels at period end' 
                              : 'Renews automatically'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Billing History */}
                  <GlassCard variant="subtle" className="p-6 md:p-8">
                    <h3 className="text-xl font-bold mb-6">Billing History</h3>
                    {billingData.invoices && billingData.invoices.length > 0 ? (
                      <div className="space-y-4">
                        {billingData.invoices.map((invoice) => {
                          const statusInfo = formatStatus(invoice.status);
                          return (
                            <motion.div
                              key={invoice.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-4 bg-glass-subtle rounded-xl border border-border-subtle hover:border-border-default transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-glass-default rounded-lg">
                                  <Receipt className="w-5 h-5 text-brand-400" />
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {formatCurrency(invoice.amount, invoice.currency)}
                                  </p>
                                  <p className="text-zinc-400 text-sm">
                                    {formatDate(invoice.created)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className={`flex items-center gap-2 ${statusInfo.color}`}>
                                  {statusInfo.icon}
                                  <span className="text-sm font-medium">{statusInfo.label}</span>
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
                      <div className="text-center py-12 text-zinc-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">No invoices yet</p>
                        <Button
                          onClick={handleManageBilling}
                          disabled={processing}
                          variant="secondary"
                          size="md"
                        >
                          Open Customer Portal
                        </Button>
                      </div>
                    )}
                  </GlassCard>
                </>
              ) : (
                <GlassCard variant="subtle" className="p-12 text-center">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                  <h3 className="text-xl font-semibold mb-2">No Active Subscription</h3>
                  <p className="text-zinc-400 mb-6">You don't have an active subscription yet.</p>
                  <Button href="/signup?tier=premium" variant="primary" size="lg">
                    Subscribe to Premium
                  </Button>
                </GlassCard>
              )}
            </motion.div>
          )}
          
          {!loading && !error && activeTab === 'payment-methods' && (
            <motion.div
              key="payment-methods"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold">Payment Methods</h2>
                <p className="text-zinc-400 mt-1">Add and manage your payment methods securely.</p>
              </div>
              <GlassCard variant="subtle" className="p-12 text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h3 className="text-xl font-semibold mb-2">Payment Methods</h3>
                <p className="text-zinc-400 mb-6">Manage your payment methods securely through Stripe.</p>
                <Button
                  onClick={handleManageBilling}
                  disabled={processing || !billingData?.currentSubscription}
                  isLoading={processing}
                  variant="primary"
                  size="lg"
                >
                  Manage Payment Methods
                </Button>
                {!billingData?.currentSubscription && (
                  <p className="text-sm text-zinc-500 mt-4">Subscribe first to add payment methods</p>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer bullets */}
      <div className="border-t border-white/10">
        <div className="container-page py-8">
          <div className="flex items-center justify-center gap-6 text-zinc-400 text-sm">
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> PCI DSS Compliant</span>
            <span className="w-px h-4 bg-white/10" />
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-brand-500 rounded-full"></span> 256-bit SSL Encryption</span>
            <span className="w-px h-4 bg-white/10" />
            <span className="flex items-center gap-2"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Stripe Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
