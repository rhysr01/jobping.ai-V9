'use client';

import React, { useState } from 'react';
import BillingDashboard from '../components/BillingDashboard';
import PaymentMethodManager from '../components/PaymentMethodManager';
import { CreditCard, Settings, FileText } from 'lucide-react';

interface BillingPageProps {
  params: Promise<{ userId: string }>;
}

export default function BillingPage({ params }: BillingPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payment-methods'>('overview');
  const [userId, setUserId] = useState<string>('');

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setUserId(resolvedParams.userId);
    });
  }, [params]);

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
      <div className="border-b border-white/10">
        <div className="container-page py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Billing & Payments</h1>
              <p className="text-zinc-400">{tabs.find(t => t.id===activeTab)?.description}</p>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <FileText className="w-5 h-5" />
              <span className="text-sm">Secure & Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="container-page">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'payment-methods')}
                  className={`flex items-center gap-3 py-4 px-2 border-b-2 transition-all duration-200 ${
                    isActive ? 'border-brand-500 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-page py-12">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">Billing Overview</h2>
              <p className="text-zinc-400">Manage your subscription, view invoices, and control your billing settings.</p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <BillingDashboard userId={userId} />
            </div>
          </div>
        )}

        {activeTab === 'payment-methods' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">Payment Methods</h2>
              <p className="text-zinc-400">Add and manage your payment methods securely.</p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <PaymentMethodManager
                userId={userId}
                onPaymentMethodAdded={() => setActiveTab('overview')}
              />
            </div>
          </div>
        )}
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
