'use client';

import React, { useState } from 'react';
import { CreditCard, Plus, Shield, AlertCircle } from 'lucide-react';

interface PaymentMethodManagerProps {
  userId: string;
  onPaymentMethodAdded?: () => void;
}

export default function PaymentMethodManager({ userId, onPaymentMethodAdded }: PaymentMethodManagerProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create payment method using Stripe Elements (in production)
      // For now, we'll simulate the process
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cardNumber,
          expiryDate,
          cvv,
          cardholderName
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Payment method added successfully!');
        setCardNumber('');
        setExpiryDate('');
        setCvv('');
        setCardholderName('');
        onPaymentMethodAdded?.();
      } else {
        setError(data.error || 'Failed to add payment method');
      }
    } catch (err) {
      setError('An error occurred while adding the payment method');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="bg-[#151519] border border-[#374151] rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Plus className="w-6 h-6 text-[#3B82F6]" />
        <h2 className="text-[#F8F9FA] font-bold text-2xl">Add Payment Method</h2>
      </div>
      <div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Number */}
          <div className="space-y-2">
            <label htmlFor="cardNumber" className="text-[#D1D5DB] font-medium text-sm">Card Number</label>
            <div className="relative">
              <input
                id="cardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                required
                className="w-full px-4 py-3 pl-10 bg-[#1F1F23] border border-[#374151] rounded-lg text-[#F8F9FA] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200"
              />
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            </div>
          </div>

          {/* Cardholder Name */}
          <div className="space-y-2">
            <label htmlFor="cardholderName" className="text-[#D1D5DB] font-medium text-sm">Cardholder Name</label>
            <input
              id="cardholderName"
              type="text"
              placeholder="John Doe"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1F1F23] border border-[#374151] rounded-lg text-[#F8F9FA] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Expiry Date and CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="expiryDate" className="text-[#D1D5DB] font-medium text-sm">Expiry Date</label>
              <input
                id="expiryDate"
                type="text"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                maxLength={5}
                required
                className="w-full px-4 py-3 bg-[#1F1F23] border border-[#374151] rounded-lg text-[#F8F9FA] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cvv" className="text-[#D1D5DB] font-medium text-sm">CVV</label>
              <input
                id="cvv"
                type="text"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                maxLength={4}
                required
                className="w-full px-4 py-3 bg-[#1F1F23] border border-[#374151] rounded-lg text-[#F8F9FA] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-[#1F1F23] border border-[#374151] rounded-lg">
            <Shield className="h-5 w-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
            <p className="text-[#D1D5DB] text-sm">
              Your payment information is encrypted and secure. We use industry-standard SSL encryption to protect your data.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-[#EF4444] mt-0.5 flex-shrink-0" />
              <p className="text-[#EF4444] text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-3 p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-[#10B981] mt-0.5 flex-shrink-0" />
              <p className="text-[#10B981] text-sm">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-lg font-medium"
          >
            {loading ? 'Adding Payment Method...' : 'Add Payment Method'}
          </button>
        </form>
      </div>
    </div>
  );
}
