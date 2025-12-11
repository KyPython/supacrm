"use client";

import React, { useState, useEffect } from 'react';
import { usePricing } from '@/hooks/usePricing';
import { useUsage } from '@/hooks/useUsage';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { calculateAnnualDiscount } from '@/lib/pricing';
import CheckoutButton from '@/components/CheckoutButton';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Container from '@/components/Container';
import { logger } from '@/lib/logger';

interface PlanFeatures {
  max_users: number | null;
  max_contacts: number | null;
  max_storage_bytes: number | null;
  features: {
    api_access?: boolean;
    gmail_sync?: boolean;
    automation?: boolean;
    custom_fields?: number | null;
    webhooks?: boolean;
    sso?: boolean;
    advanced_analytics?: boolean;
    [key: string]: any;
  };
}

export default function PricingPage() {
  const { user } = useAuth() ?? {};
  const { allPricing, loading: pricingLoading } = usePricing();
  const { plan: currentPlan, limits: currentLimits } = useUsage();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [planFeatures, setPlanFeatures] = useState<Record<string, PlanFeatures>>({});
  const [loadingFeatures, setLoadingFeatures] = useState(true);

  // Fetch plan limits/features for all plans
  useEffect(() => {
    const loadPlanFeatures = async () => {
      if (!supabase) {
        setLoadingFeatures(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('plan_limits')
          .select('plan_type, max_users, max_contacts, max_storage_bytes, features')
          .in('plan_type', ['free', 'starter', 'professional', 'business', 'enterprise']);

        if (error) {
          logger.error('Failed to load plan features', error as Error);
          setLoadingFeatures(false);
          return;
        }

        const featuresMap: Record<string, PlanFeatures> = {};
        (data || []).forEach((row: any) => {
          featuresMap[row.plan_type] = {
            max_users: row.max_users,
            max_contacts: row.max_contacts,
            max_storage_bytes: row.max_storage_bytes,
            features: row.features || {},
          };
        });
        setPlanFeatures(featuresMap);
      } catch (error) {
        logger.error('Error loading plan features', error as Error);
      } finally {
        setLoadingFeatures(false);
      }
    };

    loadPlanFeatures();
  }, []);

  const formatStorage = (bytes: number | null): string => {
    if (bytes === null) return 'Unlimited';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${Math.round(gb)}GB`;
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb)}MB`;
  };

  const formatNumber = (num: number | null): string => {
    if (num === null) return 'Unlimited';
    return num.toLocaleString();
  };

  const getFeatureValue = (features: any, key: string): string | boolean | number => {
    const value = features?.[key];
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value;
    return String(value);
  };

  const renderFeature = (label: string, value: any) => {
    if (value === false || value === null || value === undefined) return null;
    const checkmarkStyle = { color: 'var(--success)' };
    if (value === true) {
      return (
        <div key={label} className="flex items-center gap-2">
          <span style={checkmarkStyle}>✓</span>
          <span>{label}</span>
        </div>
      );
    }
    if (typeof value === 'number') {
      return (
        <div key={label} className="flex items-center gap-2">
          <span style={checkmarkStyle}>✓</span>
          <span>{label}: {formatNumber(value)}</span>
        </div>
      );
    }
    return (
      <div key={label} className="flex items-center gap-2">
        <span style={checkmarkStyle}>✓</span>
        <span>{label}: {String(value)}</span>
      </div>
    );
  };

  const getPlanFeatures = (planType: string) => {
    return planFeatures[planType] || {
      max_users: null,
      max_contacts: null,
      max_storage_bytes: null,
      features: {},
    };
  };

  if (pricingLoading || loadingFeatures) {
    return (
      <Container>
        <Card>
          <div className="text-center py-12">
            <p style={{ color: 'var(--muted)' }}>Loading pricing...</p>
          </div>
        </Card>
      </Container>
    );
  }

  const activePlans = allPricing.filter(p => p.is_active && p.plan_type !== 'enterprise');

  return (
    <Container>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="h1 mb-4">Choose Your Plan</h1>
          <p className="text-lg" style={{ color: 'var(--muted)' }}>
            All plans include core CRM features. Upgrade anytime.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg p-1" style={{ background: 'var(--card)' }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md transition-colors ${
                billingPeriod === 'monthly' ? 'font-semibold' : ''
              }`}
              style={{
                background: billingPeriod === 'monthly' ? 'var(--brand)' : 'transparent',
                color: billingPeriod === 'monthly' ? 'var(--fg)' : 'var(--muted)',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md transition-colors ${
                billingPeriod === 'yearly' ? 'font-semibold' : ''
              }`}
              style={{
                background: billingPeriod === 'yearly' ? 'var(--brand)' : 'transparent',
                color: billingPeriod === 'yearly' ? 'var(--fg)' : 'var(--muted)',
              }}
            >
              Yearly
              <span className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>
                (Save up to 21%)
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {activePlans.map((plan) => {
            const features = getPlanFeatures(plan.plan_type);
            const isCurrentPlan = plan.plan_type === currentPlan;
            const price = billingPeriod === 'yearly' && plan.price_yearly
              ? plan.price_yearly
              : plan.price_monthly;
            const priceFormatted = billingPeriod === 'yearly' && plan.price_yearly_formatted
              ? plan.price_yearly_formatted
              : plan.price_monthly_formatted;
            const discount = billingPeriod === 'yearly' && plan.price_yearly && plan.price_monthly
              ? calculateAnnualDiscount(plan.price_monthly * 100, plan.price_yearly * 100)
              : null;

            return (
              <Card
                key={plan.plan_type}
                className={`relative ${isCurrentPlan ? 'ring-2' : ''}`}
                style={{
                  ringColor: isCurrentPlan ? 'var(--brand)' : 'transparent',
                }}
              >
                {isCurrentPlan && (
                  <div
                    className="absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-semibold"
                    style={{
                      background: 'var(--brand)',
                      color: 'var(--fg)',
                    }}
                  >
                    Current Plan
                  </div>
                )}

                <div className="p-6">
                  <h3 className="h2 mb-2">{plan.display_name}</h3>
                  {plan.description && (
                    <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                      {plan.description}
                    </p>
                  )}

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{priceFormatted}</span>
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        /{billingPeriod === 'yearly' ? 'month' : 'month'}
                      </span>
                    </div>
                    {billingPeriod === 'yearly' && discount && (
                      <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                        Billed annually • Save {discount}%
                      </p>
                    )}
                    {plan.plan_type === 'free' && (
                      <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                        Forever free
                      </p>
                    )}
                  </div>

                  {/* Key Features */}
                  <div className="space-y-3 mb-6">
                    {features.max_users !== null && (
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--success)' }}>✓</span>
                        <span>
                          {formatNumber(features.max_users)} {features.max_users === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                    )}
                    {features.max_contacts !== null && (
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--success)' }}>✓</span>
                        <span>
                          {formatNumber(features.max_contacts)} contacts
                        </span>
                      </div>
                    )}
                    {features.max_storage_bytes !== null && (
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--success)' }}>✓</span>
                        <span>
                          {formatStorage(features.max_storage_bytes)} storage
                        </span>
                      </div>
                    )}
                    {renderFeature('API Access', getFeatureValue(features.features, 'api_access'))}
                    {renderFeature('Gmail Sync', getFeatureValue(features.features, 'gmail_sync'))}
                    {renderFeature('Automation', getFeatureValue(features.features, 'automation'))}
                    {renderFeature('Webhooks', getFeatureValue(features.features, 'webhooks'))}
                    {renderFeature('SSO', getFeatureValue(features.features, 'sso'))}
                    {renderFeature('Advanced Analytics', getFeatureValue(features.features, 'advanced_analytics'))}
                    {getFeatureValue(features.features, 'custom_fields') && (
                      <div className="flex items-center gap-2">
                        <span style={{ color: 'var(--success)' }}>✓</span>
                        <span>
                          Custom Fields: {getFeatureValue(features.features, 'custom_fields') === true
                            ? 'Unlimited'
                            : formatNumber(getFeatureValue(features.features, 'custom_fields') as number)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  {plan.plan_type === 'free' ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? 'Current Plan' : 'Get Started'}
                    </Button>
                  ) : (
                    <CheckoutButton
                      planType={plan.plan_type as 'starter' | 'professional' | 'business'}
                      billingPeriod={billingPeriod}
                      className="w-full"
                    >
                      {isCurrentPlan
                        ? 'Current Plan'
                        : user
                          ? `Upgrade to ${plan.display_name}`
                          : 'Sign Up'}
                    </CheckoutButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-12 text-center">
          <Card>
            <div className="p-8">
              <h3 className="h2 mb-4">Need Enterprise Features?</h3>
              <p className="mb-6" style={{ color: 'var(--muted)' }}>
                Custom pricing, dedicated support, and advanced features for large teams.
              </p>
              <Button
                href="mailto:sales@supacrm.com"
                variant="primary"
              >
                Contact Sales
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}
