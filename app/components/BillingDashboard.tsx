'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Settings,
  Shield,
  ChevronRight
} from 'lucide-react';

interface BillingInfo {
  invoices: Array<{
    id: string;
    amount: number;
    status: string;
    created: number;
    period_start: number;
    period_end: number;
    pdf: string;
    hosted_invoice_url: string;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  }>;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  }>;
}

interface Subscription {
  id: string;
  status: string;
  tier: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface BillingDashboardProps {
  userId: string;
}

export default function BillingDashboard({ userId }: BillingDashboardProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'history'>('overview');

  useEffect(() => {
    fetchBillingInfo();
  }, [userId]);

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setBillingInfo(data.billing);
        setCurrentSubscription(data.currentSubscription);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionAction = async (action: string, newTier?: string) => {
    try {
      setActionLoading(action);
      const response = await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          newTier
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchBillingInfo(); // Refresh data
        // Show success notification
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to perform action');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePaymentMethodAction = async (action: string, paymentMethodId?: string) => {
    try {
      setActionLoading(action);
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          paymentMethodId
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchBillingInfo(); // Refresh data
        // Show success notification
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to perform action');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
        active: { color: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
  past_due: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: AlertCircle },
  canceled: { color: 'bg-red-500/20 text-red-500 border-red-500/30', icon: XCircle },
  paused: { color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: Pause }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#EF4444] mx-auto mb-4" />
          <p className="text-[#EF4444]">{error}</p>
          <button 
            onClick={fetchBillingInfo} 
            className="mt-4 btn-primary px-6 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-[#1F1F23] p-1 rounded-lg border border-[#374151]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#3B82F6] text-white'
              : 'text-[#9CA3AF] hover:text-[#D1D5DB]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'payment'
              ? 'bg-[#3B82F6] text-white'
              : 'bg-transparent text-[#9CA3AF] hover:text-[#D1D5DB]'
          }`}
        >
          Payment Methods
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-[#3B82F6] text-white'
              : 'bg-transparent text-[#9CA3AF] hover:text-[#D1D5DB]'
          }`}
        >
          Billing History
        </button>
      </div>

      {/* Payment Recovery Banner */}
      {currentSubscription?.status === 'past_due' && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-[#EF4444] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-[#EF4444] font-semibold text-lg mb-2">Payment Failed - Update Required</h3>
              <p className="text-[#EF4444] text-sm mb-4">
                Your subscription payment failed. Please update your payment method to continue receiving job matches.
              </p>
              <button
                onClick={() => setActiveTab('payment')}
                className="bg-[#EF4444] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#DC2626] transition-colors"
              >
                Update Payment Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription - Overview Tab */}
      {activeTab === 'overview' && (
        <div className="bg-[#151519] border border-[#374151] rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-[#3B82F6]" />
            <h2 className="text-[#F8F9FA] font-bold text-2xl">Current Subscription</h2>
          </div>
          <div>
            {currentSubscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{currentSubscription.tier}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(parseInt(currentSubscription.current_period_start))} - {formatDate(parseInt(currentSubscription.current_period_end))}
                    </p>
                  </div>
                  {getStatusBadge(currentSubscription.status)}
                </div>

                <div className="flex gap-2">
                  {currentSubscription.status === 'active' && (
                    <>
                                          <button
                      className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => handleSubscriptionAction('pause')}
                      disabled={actionLoading === 'pause'}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </button>
                    <button
                      className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => handleSubscriptionAction('cancel')}
                      disabled={actionLoading === 'cancel'}
                    >
                      Cancel
                    </button>
                    </>
                  )}
                  {currentSubscription.status === 'paused' && (
                                      <button
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => handleSubscriptionAction('resume')}
                    disabled={actionLoading === 'resume'}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No active subscription</p>
            )}
          </div>
        </div>
      )}

      {/* Payment Methods - Payment Tab */}
      {activeTab === 'payment' && (
        <div className="bg-[#151519] border border-[#374151] rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-[#3B82F6]" />
            <h2 className="text-[#F8F9FA] font-bold text-2xl">Payment Methods</h2>
          </div>
          <div>
            {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {billingInfo.paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">
                          {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expires {method.exp_month}/{method.exp_year}
                        </p>
                      </div>
                    </div>
                    <button
                      className="btn-secondary px-3 py-1 text-sm"
                      onClick={() => handlePaymentMethodAction('remove_payment_method', method.id)}
                      disabled={actionLoading === 'remove_payment_method'}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#9CA3AF]">No payment methods on file</p>
            )}
          </div>
        </div>
      )}

      {/* Billing History - History Tab */}
      {activeTab === 'history' && (
        <div className="bg-[#151519] border border-[#374151] rounded-2xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-[#3B82F6]" />
            <h2 className="text-[#F8F9FA] font-bold text-2xl">Billing History</h2>
          </div>
          <div>
            {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
              <div className="space-y-3">
                {billingInfo.invoices.slice(0, 10).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(invoice.created)} • {invoice.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary px-3 py-1 text-sm"
                      >
                        View
                      </a>
                      {invoice.pdf && (
                        <a
                          href={invoice.pdf}
                          download
                          className="btn-secondary px-3 py-1 text-sm"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#9CA3AF]">No billing history available</p>
            )}
          </div>
        </div>
      )}
      <div className="bg-[#151519] border border-[#374151] rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-[#3B82F6]" />
          <h2 className="text-[#F8F9FA] font-bold text-2xl">Current Subscription</h2>
        </div>
        <div>
          {currentSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{currentSubscription.tier}</h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(parseInt(currentSubscription.current_period_start))} - {formatDate(parseInt(currentSubscription.current_period_end))}
                  </p>
                </div>
                {getStatusBadge(currentSubscription.status)}
              </div>

              <div className="flex gap-2">
                {currentSubscription.status === 'active' && (
                  <>
                    <button
                      className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => handleSubscriptionAction('pause')}
                      disabled={actionLoading === 'pause'}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </button>
                    <button
                      className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={() => handleSubscriptionAction('cancel')}
                      disabled={actionLoading === 'pause'}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {currentSubscription.status === 'paused' && (
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => handleSubscriptionAction('resume')}
                    disabled={actionLoading === 'resume'}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No active subscription</p>
          )}
        </div>
      </div>
    </div>
  );
}
