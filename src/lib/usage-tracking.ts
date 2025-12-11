// lib/usage-tracking.ts - Usage tracking utilities
import { supabase } from './supabase';
import { logger } from './logger';

export type PlanType = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';
export type MetricType = 'users' | 'contacts' | 'companies' | 'deals' | 'storage_bytes';

export interface PlanLimits {
  max_users: number | null;
  max_contacts: number | null;
  max_companies: number | null;
  max_deals: number | null;
  max_storage_bytes: number;
  features: {
    analytics?: boolean;
    api_access?: boolean;
    custom_fields?: boolean;
    export?: boolean;
    advanced_roles?: boolean;
    sso?: boolean;
    white_label?: boolean;
  };
}

export interface UsageMetrics {
  users: number;
  contacts: number;
  companies: number;
  deals: number;
  storage_bytes: number;
}

export interface UsageStatus {
  plan: PlanType;
  limits: PlanLimits;
  usage: UsageMetrics;
  exceeded: {
    users: boolean;
    contacts: boolean;
    companies: boolean;
    deals: boolean;
    storage_bytes: boolean;
  };
}

/**
 * Get organization ID for current user
 * For now, we'll use user ID as organization ID (single-user orgs)
 * TODO: Implement proper multi-tenant organization support
 */
function getOrganizationId(userId: string): string {
  // For MVP: user ID = organization ID
  // Later: query user_organizations table
  return userId;
}

/**
 * Get current plan for user's organization
 */
export async function getCurrentPlan(userId: string): Promise<PlanType> {
  if (!supabase || !userId) return 'free';
  
  try {
    const orgId = getOrganizationId(userId);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error) {
      logger.debug('Failed to get plan, defaulting to free', { error: error.message });
      return 'free';
    }
    
    return (data?.plan_type as PlanType) || 'free';
  } catch (error) {
    logger.error('Error getting current plan', error as Error);
    return 'free';
  }
}

/**
 * Get plan limits
 */
export async function getPlanLimits(plan: PlanType): Promise<PlanLimits | null> {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan_type', plan)
      .maybeSingle();
    
    if (error || !data) {
      logger.error('Failed to get plan limits', error as Error);
      return null;
    }
    
    return {
      max_users: data.max_users,
      max_contacts: data.max_contacts,
      max_companies: data.max_companies,
      max_deals: data.max_deals,
      max_storage_bytes: data.max_storage_bytes,
      features: data.features || {},
    };
  } catch (error) {
    logger.error('Error getting plan limits', error as Error);
    return null;
  }
}

/**
 * Get current usage for organization
 * Falls back to counting actual records if usage_metrics table is empty
 */
export async function getCurrentUsage(userId: string): Promise<UsageMetrics> {
  if (!supabase || !userId) {
    return {
      users: 0,
      contacts: 0,
      companies: 0,
      deals: 0,
      storage_bytes: 0,
    };
  }
  
  try {
    const orgId = getOrganizationId(userId);
    
    // Try to get from usage_metrics first
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const monthStartISO = currentMonthStart.toISOString();
    
    const { data, error } = await supabase
      .from('usage_metrics')
      .select('metric_type, count')
      .eq('organization_id', orgId)
      .gte('period_start', monthStartISO)
      .lt('period_start', new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 1).toISOString());
    
    const usage: UsageMetrics = {
      users: 0,
      contacts: 0,
      companies: 0,
      deals: 0,
      storage_bytes: 0,
    };
    
    // If we have data from usage_metrics, use it
    if (!error && data && data.length > 0) {
      data.forEach((metric) => {
        if (metric.metric_type in usage) {
          (usage as any)[metric.metric_type] = metric.count || 0;
        }
      });
      return usage;
    }
    
    // Fallback: count actual records
    logger.debug('usage_metrics empty, counting actual records');
    const [contactsCount, companiesCount, dealsCount] = await Promise.all([
      countRecords(userId, 'contacts'),
      countRecords(userId, 'companies'),
      countRecords(userId, 'deals'),
    ]);
    
    const storageBytes = await calculateStorageUsage(userId);
    
    return {
      users: 1, // For MVP, assume 1 user per org
      contacts: contactsCount,
      companies: companiesCount,
      deals: dealsCount,
      storage_bytes: storageBytes,
    };
  } catch (error) {
    logger.error('Error getting current usage', error as Error);
    // Final fallback: count actual records
    try {
      const [contactsCount, companiesCount, dealsCount] = await Promise.all([
        countRecords(userId, 'contacts'),
        countRecords(userId, 'companies'),
        countRecords(userId, 'deals'),
      ]);
      const storageBytes = await calculateStorageUsage(userId);
      return {
        users: 1,
        contacts: contactsCount,
        companies: companiesCount,
        deals: dealsCount,
        storage_bytes: storageBytes,
      };
    } catch (fallbackError) {
      logger.error('Error in fallback counting', fallbackError as Error);
      return {
        users: 0,
        contacts: 0,
        companies: 0,
        deals: 0,
        storage_bytes: 0,
      };
    }
  }
}

/**
 * Get complete usage status (plan + limits + usage + exceeded flags)
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus | null> {
  if (!userId) return null;
  
  const plan = await getCurrentPlan(userId);
  const limits = await getPlanLimits(plan);
  const usage = await getCurrentUsage(userId);
  
  if (!limits) return null;
  
  const exceeded = {
    users: limits.max_users !== null && usage.users >= limits.max_users,
    contacts: limits.max_contacts !== null && usage.contacts >= limits.max_contacts,
    companies: limits.max_companies !== null && usage.companies >= limits.max_companies,
    deals: limits.max_deals !== null && usage.deals >= limits.max_deals,
    storage_bytes: usage.storage_bytes >= limits.max_storage_bytes,
  };
  
  return {
    plan,
    limits,
    usage,
    exceeded,
  };
}

/**
 * Check if a specific metric limit is exceeded
 */
export async function checkLimitExceeded(
  userId: string,
  metric: MetricType
): Promise<boolean> {
  const status = await getUsageStatus(userId);
  if (!status) return false;
  
  return status.exceeded[metric];
}

/**
 * Increment usage for a metric
 */
export async function incrementUsage(
  userId: string,
  metric: MetricType,
  amount: number = 1
): Promise<void> {
  if (!supabase || !userId) return;
  
  try {
    const orgId = getOrganizationId(userId);
    
    // Use Supabase RPC if available, otherwise manual update
    const { error: rpcError } = await supabase.rpc('increment_usage', {
      org_id: orgId,
      metric: metric,
      amount: amount,
    });
    
    if (rpcError) {
      // Fallback: manual upsert
      const { error } = await supabase
        .from('usage_metrics')
        .upsert({
          organization_id: orgId,
          metric_type: metric,
          count: amount,
          period_start: new Date().toISOString().slice(0, 7) + '-01',
          period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7) + '-01',
        }, {
          onConflict: 'organization_id,metric_type,period_start',
        });
      
      if (error) {
        logger.error('Failed to increment usage', error as Error, { metric, amount });
      }
    }
  } catch (error) {
    logger.error('Error incrementing usage', error as Error);
  }
}

/**
 * Decrement usage for a metric
 */
export async function decrementUsage(
  userId: string,
  metric: MetricType,
  amount: number = 1
): Promise<void> {
  if (!supabase || !userId) return;
  
  try {
    const orgId = getOrganizationId(userId);
    
    const { error: rpcError } = await supabase.rpc('decrement_usage', {
      org_id: orgId,
      metric: metric,
      amount: amount,
    });
    
    if (rpcError) {
      logger.error('Failed to decrement usage', rpcError as Error, { metric, amount });
    }
  } catch (error) {
    logger.error('Error decrementing usage', error as Error);
  }
}

/**
 * Count actual records (fallback if usage_metrics table doesn't exist yet)
 */
export async function countRecords(
  userId: string,
  table: 'contacts' | 'companies' | 'deals'
): Promise<number> {
  if (!supabase || !userId) return 0;
  
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (error) {
      logger.error(`Failed to count ${table}`, error as Error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    logger.error(`Error counting ${table}`, error as Error);
    return 0;
  }
}

/**
 * Calculate storage usage (sum of file sizes)
 */
export async function calculateStorageUsage(userId: string): Promise<number> {
  if (!supabase || !userId) return 0;
  
  try {
    // List all files for user and sum their sizes
    const { data, error } = await supabase.storage
      .from('files')
      .list(`${userId}/`, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });
    
    if (error) {
      logger.error('Failed to calculate storage usage', error as Error);
      return 0;
    }
    
    const totalBytes = data?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
    return totalBytes;
  } catch (error) {
    logger.error('Error calculating storage usage', error as Error);
    return 0;
  }
}

