'use client';

import React, { useState } from 'react';
import { CreditCard, Plus, Shield, AlertCircle } from 'lucide-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethodManagerProps {
  userId: string;
  onPaymentMethodAdded?: () => void;
}

function PaymentMethodForm({ userId, onPaymentMethodAdded }: PaymentMethodManagerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cardError, setCardError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setCardError('');

    try {
      // Create payment method using Stripe Elements
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
        billing_details: {
          name: cardholderName,
        },
      });

      if (stripeError) {
        setCardError(stripeError.message || 'Card validation failed');
        setLoading(false);
        return;
      }

      // Send payment method ID to your backend
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          paymentMethodId: paymentMethod.id,
          cardholderName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess('Payment method added successfully!');
        setCardholderName('');
        elements.getElement(CardElement)?.clear();
        onPaymentMethodAdded?.();
      } else {
        setError(data.error || 'Failed to add payment method. Please try again.');
      }
    } catch (err) {
      console.error('Payment method error:', err);
      if (err instanceof Error) {
        setError(`Payment setup failed: ${err.message}. Please try again.`);
      } else {
        setError('Payment setup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#F8F9FA',
        fontFamily: 'Inter, sans-serif',
        '::placeholder': {
          color: '#6B7280',
        },
        backgroundColor: '#1F1F23',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '12px',
      },
      invalid: {
        color: '#EF4444',
        borderColor: '#EF4444',
      },
    },
  };

  return (
    <div className="bg-[#151519] border border-[#374151] rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Plus className="w-6 h-6 text-[#3B82F6]" />
        <h2 className="text-[#F8F9FA] font-bold text-2xl">Add Payment Method</h2>
      </div>
      <div>
        <form onSubmit={handleSubmit} className="space-y-4 payment-form">
          {/* Card Element */}
          <div className="space-y-2">
            <label className="text-[#D1D5DB] font-medium text-sm">Card Information</label>
            <div className="relative">
              <CardElement options={cardElementOptions} />
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
            </div>
            {cardError && (
              <p className="text-red-500 text-sm mt-1">{cardError}</p>
            )}
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
              autoComplete="cc-name"
              className="w-full px-4 py-3 bg-[#1F1F23] border border-[#374151] rounded-lg text-[#F8F9FA] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-[#1F1F23] border border-[#374151] rounded-lg">
            <Shield className="h-5 w-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
            <p className="text-[#D1D5DB] text-sm">
              Your payment information is encrypted and secure. We use Stripe Elements and industry-standard SSL encryption to protect your data.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-state rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm mb-3">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-sm underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="success-state rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !stripe}
            className="w-full btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed payment-button"
          >
            {loading ? 'Adding Payment Method...' : 'Add Payment Method'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PaymentMethodManager(props: PaymentMethodManagerProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodForm {...props} />
    </Elements>
  );
}
