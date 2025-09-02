'use client';

import React, { useState } from 'react';
import BillingDashboard from '../components/BillingDashboard';
import PaymentMethodManager from '../components/PaymentMethodManager';
import { CreditCard, Settings, FileText, Plus } from 'lucide-react';

interface BillingPageProps {
  params: { userId: string };
}

export default function BillingPage({ params }: BillingPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payment-methods'>('overview');
  const userId = params.userId;

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
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* Header */}
      <div className="border-b border-[#374151] bg-[#151519]">
        <div className="container-frame py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#F8F9FA] font-bold text-3xl mb-2">Billing & Payments</h1>
              <p className="text-[#9CA3AF]">Manage your subscription and payment methods</p>
            </div>
            <div className="flex items-center gap-2 text-[#6B7280]">
              <FileText className="w-5 h-5" />
              <span className="text-sm">Secure & Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-[#374151] bg-[#151519]">
        <div className="container-frame">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'payment-methods')}
                  className={`flex items-center gap-3 py-4 px-2 border-b-2 transition-all duration-200 ${
                    isActive
                      ? 'border-[#3B82F6] text-[#3B82F6]'
                      : 'border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]'
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
      <div className="container-frame py-12">
        {activeTab === 'overview' && (
          <div>
            <div className="mb-8">
              <h2 className="text-[#F8F9FA] font-bold text-2xl mb-2">Billing Overview</h2>
              <p className="text-[#9CA3AF]">Manage your subscription, view invoices, and control your billing settings.</p>
            </div>
            <BillingDashboard userId={userId} />
          </div>
        )}

        {activeTab === 'payment-methods' && (
          <div>
            <div className="mb-8">
              <h2 className="text-[#F8F9FA] font-bold text-2xl mb-2">Payment Methods</h2>
              <p className="text-[#9CA3AF]">Add and manage your payment methods securely.</p>
            </div>
            <PaymentMethodManager 
              userId={userId} 
              onPaymentMethodAdded={() => {
                // Refresh billing info when payment method is added
                setActiveTab('overview');
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Security Notice */}
      <div className="border-t border-[#374151] bg-[#151519] mt-16">
        <div className="container-frame py-8">
          <div className="flex items-center justify-center gap-4 text-[#6B7280] text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
              <span>PCI DSS Compliant</span>
            </div>
            <div className="w-px h-4 bg-[#374151]"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#3B82F6] rounded-full"></div>
              <span>256-bit SSL Encryption</span>
            </div>
            <div className="w-px h-4 bg-[#374151]"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F59E0B] rounded-full"></div>
              <span>Stripe Powered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
