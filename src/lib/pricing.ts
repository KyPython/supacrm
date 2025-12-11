// lib/pricing.ts - Pricing utilities (fetches from Supabase)
// CRITICAL: All pricing comes from Supabase. Never hardcode prices in the app.

import { supabase } from './supabase';
import { logger } from './logger';

export type PlanType = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';

export interface PlanPricing {
  plan_type: PlanType;
  price_monthly_cents: number;
  price_yearly_cents: number | null;
  currency: string;
  display_name: string;
  description: string | null;
  polar_product_id_monthly: string | null;
  polar_product_id_yearly: string | null;
  stripe_price_id_monthly: string | null; // Kept for backward compatibility
  stripe_price_id_yearly: string | null; // Kept for backward compatibility
  is_active: boolean;
  sort_order?: number;
}

export interface FormattedPricing {
  plan_type: PlanType;
  price_monthly: number;
  price_yearly: number | null;
  price_monthly_formatted: string;
  price_yearly_formatted: string | null;
  currency: string;
  display_name: string;
  description: string | null;
  polar_product_id_monthly: string | null;
  polar_product_id_yearly: string | null;
  stripe_price_id_monthly: string | null; // Kept for backward compatibility
  stripe_price_id_yearly: string | null; // Kept for backward compatibility
  is_active: boolean;
}

/**
 * Get pricing for a specific plan
 * Fetches from Supabase - always up-to-date
 */
export async function getPlanPricing(planType: PlanType): Promise<PlanPricing | null> {
  if (!supabase) {
    logger.error('Supabase client not initialized', new Error('Supabase is null'));
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('plan_pricing')
      .select('*')
      .eq('plan_type', planType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get plan pricing', error as Error, { planType });
      return null;
    }

    if (!data) {
      logger.warn('Plan pricing not found', { planType });
      return null;
    }

    return data as PlanPricing;
  } catch (error) {
    logger.error('Error getting plan pricing', error as Error);
    return null;
  }
}

/**
 * Get pricing for all active plans
 * Fetches from Supabase - always up-to-date
 */
export async function getAllPlanPricing(): Promise<PlanPricing[]> {
  if (!supabase) {
    logger.error('Supabase client not initialized', new Error('Supabase is null'));
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('plan_pricing')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Failed to get all plan pricing', error as Error);
      return [];
    }

    return (data || []) as PlanPricing[];
  } catch (error) {
    logger.error('Error getting all plan pricing', error as Error);
    return [];
  }
}

/**
 * Format pricing for display
 * Converts cents to dollars and formats currency
 */
export function formatPricing(pricing: PlanPricing): FormattedPricing {
  const formatCurrency = (cents: number, currency: string = 'USD'): string => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(dollars);
  };

  return {
    plan_type: pricing.plan_type,
    price_monthly: pricing.price_monthly_cents / 100,
    price_yearly: pricing.price_yearly_cents ? pricing.price_yearly_cents / 100 : null,
    price_monthly_formatted: formatCurrency(pricing.price_monthly_cents, pricing.currency),
    price_yearly_formatted: pricing.price_yearly_cents
      ? formatCurrency(pricing.price_yearly_cents, pricing.currency)
      : null,
    currency: pricing.currency,
    display_name: pricing.display_name,
    description: pricing.description,
    polar_product_id_monthly: pricing.polar_product_id_monthly,
    polar_product_id_yearly: pricing.polar_product_id_yearly,
    stripe_price_id_monthly: pricing.stripe_price_id_monthly,
    stripe_price_id_yearly: pricing.stripe_price_id_yearly,
    is_active: pricing.is_active,
  };
}

/**
 * Get next plan pricing (for upgrade prompts)
 */
export async function getNextPlanPricing(currentPlan: PlanType): Promise<FormattedPricing | null> {
  const planOrder: PlanType[] = ['free', 'starter', 'professional', 'business', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlan);
  
  if (currentIndex === -1 || currentIndex >= planOrder.length - 1) {
    return null; // No next plan
  }

  const nextPlan = planOrder[currentIndex + 1];
  const pricing = await getPlanPricing(nextPlan);
  
  if (!pricing) {
    return null;
  }

  return formatPricing(pricing);
}

/**
 * Calculate annual discount percentage
 */
export function calculateAnnualDiscount(monthlyCents: number, yearlyCents: number | null): number | null {
  if (!yearlyCents || monthlyCents === 0) {
    return null;
  }

  const monthlyYearly = monthlyCents * 12;
  if (monthlyYearly === 0) {
    return null;
  }

  const discount = ((monthlyYearly - yearlyCents) / monthlyYearly) * 100;
  return Math.round(discount);
}
