// hooks/useUsage.ts - React hook for usage tracking
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext.js';
import {
  getUsageStatus,
  getCurrentPlan,
  getPlanLimits,
  getCurrentUsage,
  checkLimitExceeded,
  type UsageStatus,
  type PlanType,
  type PlanLimits,
  type UsageMetrics,
} from '@/lib/usage-tracking';
import { logger } from '@/lib/logger';

export function useUsage() {
  const { user } = useAuth() ?? {};
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadUsage = async () => {
      try {
        setLoading(true);
        setError(null);
        const status = await getUsageStatus(user.id);
        setUsageStatus(status);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load usage';
        setError(errorMessage);
        logger.error('Failed to load usage', err instanceof Error ? err : new Error(String(err)), { userId: user?.id });
      } finally {
        setLoading(false);
      }
    };

    loadUsage();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUsage, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const checkLimit = async (metric: 'users' | 'contacts' | 'companies' | 'deals' | 'storage_bytes') => {
    if (!user?.id) return false;
    return await checkLimitExceeded(user.id, metric);
  };

  return {
    usageStatus,
    loading,
    error,
    checkLimit,
    plan: usageStatus?.plan || 'free',
    limits: usageStatus?.limits,
    usage: usageStatus?.usage,
    exceeded: usageStatus?.exceeded,
  };
}

