'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { ShoppingCart, Package, Loader2, CreditCard } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: {
    id: string;
    amount: number;
    currency: string;
    recurring: { interval: string } | null;
  }[];
}

export default function StorePage() {
  const params = useParams();
  const accountId = params.accountId as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (accountId) {
      loadProducts();
    }
  }, [accountId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stripe-connect/list-products?accountId=${accountId}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load products');
      }

      const data = await res.json();
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (priceId: string, productName: string) => {
    try {
      setProcessing(priceId);
      
      const res = await fetch('/api/stripe-connect/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': 'jobping-request',
        },
        body: JSON.stringify({
          accountId,
          priceId,
          customerEmail: 'customer@example.com', // Replace with actual customer email
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create checkout');
      }

      const data = await res.json();
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container-page py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">Store</h1>
            <p className="text-xl text-zinc-300">Browse and purchase products</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
              <p className="text-zinc-400">No products available</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-xl px-6 py-8"
                >
                  <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-zinc-300 text-sm mb-4">{product.description}</p>
                  )}

                  <div className="space-y-3">
                    {product.prices.map((price) => (
                      <div
                        key={price.id}
                        className="flex items-center justify-between p-4 bg-black/30 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">
                            ${price.amount.toFixed(2)} {price.currency.toUpperCase()}
                          </p>
                          {price.recurring && (
                            <p className="text-zinc-400 text-sm">
                              per {price.recurring.interval}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => handlePurchase(price.id, product.name)}
                          disabled={processing === price.id || !product.active}
                          isLoading={processing === price.id}
                          size="sm"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Buy
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

