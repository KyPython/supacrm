// hooks/usePricing.ts - React hook for pricing data
// Fetches pricing from Supabase - never hardcodes prices

import { useState, useEffect } from 'react';
import {
  getAllPlanPricing,
  getPlanPricing,
  getNextPlanPricing,
  formatPricing,
  type PlanPricing,
  type FormattedPricing,
  type PlanType,
} from '@/lib/pricing';
import { logger } from '@/lib/logger';

export function usePricing() {
  const [allPricing, setAllPricing] = useState<FormattedPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        setLoading(true);
        setError(null);
        const pricing = await getAllPlanPricing();
        const formatted = pricing.map(formatPricing);
        setAllPricing(formatted);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load pricing';
        setError(errorMessage);
        logger.error('Failed to load pricing', err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
    
    // Refresh every 5 minutes to get updated pricing
    const interval = setInterval(loadPricing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getPlanPrice = (planType: PlanType): FormattedPricing | null => {
    return allPricing.find((p) => p.plan_type === planType) || null;
  };

  const getNextPlan = async (currentPlan: PlanType): Promise<FormattedPricing | null> => {
    return await getNextPlanPricing(currentPlan);
  };

  return {
    allPricing,
    loading,
    error,
    getPlanPrice,
    getNextPlan,
  };
}

export function usePlanPricing(planType: PlanType) {
  const [pricing, setPricing] = useState<FormattedPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        setLoading(true);
        setError(null);
        const planPricing = await getPlanPricing(planType);
        if (planPricing) {
          setPricing(formatPricing(planPricing));
        } else {
          setError(`Pricing not found for plan: ${planType}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load pricing';
        setError(errorMessage);
        logger.error('Failed to load plan pricing', err instanceof Error ? err : new Error(String(err)), { planType });
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadPricing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [planType]);

  return {
    pricing,
    loading,
    error,
  };
}
