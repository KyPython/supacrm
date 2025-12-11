// components/UpgradePrompt.tsx - Upgrade prompt component
// NOTE: Pricing is fetched from Supabase - never hardcoded
"use client";
import React from 'react';
import { useUsage } from '@/hooks/useUsage';
import { usePricing } from '@/hooks/usePricing';
import Button from './Button';
import Card from './Card';
import Link from 'next/link';

interface UpgradePromptProps {
  feature: 'contacts' | 'companies' | 'deals' | 'storage' | 'users';
  currentCount?: number;
  limit?: number;
  className?: string;
  onDismiss?: () => void;
}

const FEATURE_NAMES = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
  storage: 'File Storage',
  users: 'Team Members',
};

const FEATURE_DESCRIPTIONS = {
  contacts: 'You\'ve reached your contact limit. Upgrade to add more contacts and grow your business.',
  companies: 'You\'ve reached your company limit. Upgrade to track more companies.',
  deals: 'You\'ve reached your deal limit. Upgrade to manage more deals in your pipeline.',
  storage: 'You\'ve reached your storage limit. Upgrade to upload more files.',
  users: 'You\'ve reached your user limit. Upgrade to add more team members.',
};

export default function UpgradePrompt({
  feature,
  currentCount,
  limit,
  className = '',
  onDismiss,
}: UpgradePromptProps) {
  const { usageStatus, plan } = useUsage();
  const { getNextPlan } = usePricing();
  const [dismissed, setDismissed] = React.useState(false);
  const [nextPlanPricing, setNextPlanPricing] = React.useState<{ display_name: string; price_monthly_formatted: string | null } | null>(null);

  // Fetch next plan pricing from Supabase
  React.useEffect(() => {
    if (plan && plan !== 'enterprise') {
      getNextPlan(plan as any).then((pricing) => {
        if (pricing) {
          setNextPlanPricing({
            display_name: pricing.display_name,
            price_monthly_formatted: pricing.price_monthly_formatted,
          });
        }
      });
    }
  }, [plan, getNextPlan]);

  if (dismissed || plan === 'enterprise') {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getNextPlanName = (current: string): string => {
    const plans = ['free', 'starter', 'professional', 'business', 'enterprise'];
    const currentIndex = plans.indexOf(current);
    return currentIndex < plans.length - 1 ? plans[currentIndex + 1] : 'enterprise';
  };

  const nextPlanName = getNextPlanName(plan);
  const featureName = FEATURE_NAMES[feature];
  const description = FEATURE_DESCRIPTIONS[feature];
  const displayName = nextPlanPricing?.display_name || nextPlanName.charAt(0).toUpperCase() + nextPlanName.slice(1);

  return (
    <Card className={`mb-4 ${className}`} style={{ 
      background: 'var(--brand-10)',
      border: '1px solid var(--brand-20)',
    }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="h2 mb-2" style={{ color: 'var(--brand)' }}>
            Upgrade to {displayName} Plan
            {nextPlanPricing?.price_monthly_formatted && (
              <span className="ml-2 text-base font-normal" style={{ color: 'var(--muted)' }}>
                {nextPlanPricing.price_monthly_formatted}/month
              </span>
            )}
          </h3>
          <p className="mb-3" style={{ color: 'var(--fg)' }}>
            {description}
          </p>
          {currentCount !== undefined && limit !== undefined && (
            <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
              Current usage: <strong>{currentCount}</strong> / {limit} {FEATURE_NAMES[feature].toLowerCase()}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              href="/pricing"
              variant="primary"
              className="px-4 py-2"
            >
              View Plans & Upgrade
            </Button>
            <button
              onClick={handleDismiss}
              className="text-sm"
              style={{ color: 'var(--muted)' }}
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xl leading-none"
          style={{ color: 'var(--muted)' }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </Card>
  );
}

/**
 * Inline upgrade prompt (smaller, for inline use)
 */
export function InlineUpgradePrompt({
  feature,
  message,
  className = '',
}: {
  feature: 'contacts' | 'companies' | 'deals' | 'storage' | 'users';
  message?: string;
  className?: string;
}) {
  const { plan } = useUsage();
  
  if (plan === 'enterprise') return null;

  return (
    <div className={`p-3 rounded ${className}`} style={{
      background: 'var(--brand-10)',
      border: '1px solid var(--brand-20)',
    }}>
      <p className="text-sm mb-2" style={{ color: 'var(--fg)' }}>
        {message || `You've reached your ${FEATURE_NAMES[feature].toLowerCase()} limit.`}
      </p>
      <Link
        href="/pricing"
        className="text-sm font-medium"
        style={{ color: 'var(--brand)' }}
      >
        Upgrade to continue →
      </Link>
    </div>
  );
}

