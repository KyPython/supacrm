"use client";

import { useState } from 'react';
import Button from './Button';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/lib/logger';

interface CheckoutButtonProps {
  planType: 'starter' | 'professional' | 'business';
  billingPeriod: 'monthly' | 'yearly';
  className?: string;
  children?: React.ReactNode;
}

export default function CheckoutButton({ 
  planType, 
  billingPeriod,
  className = '',
  children
}: CheckoutButtonProps) {
  const { user } = useAuth() ?? {};
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in to subscribe');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType, billingPeriod }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      if (!data.checkout_url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to Polar checkout
      window.location.href = data.checkout_url;
    } catch (error) {
      logger.error('Checkout failed', error as Error, { planType, billingPeriod });
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || !user}
      className={className}
      variant="primary"
    >
      {loading ? 'Loading...' : (children || `Subscribe to ${planType}`)}
    </Button>
  );
}
