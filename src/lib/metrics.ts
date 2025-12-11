// lib/metrics.ts - Custom metrics and SLO tracking
import { logger } from './logger';

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface SLO {
  name: string;
  target: number; // e.g., 0.999 for 99.9%
  window: number; // in seconds
  description: string;
}

class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private slos: Map<string, SLO> = new Map();
  private errorBudget: Map<string, { consumed: number; total: number }> = new Map();

  // Record a metric
  record(metric: MetricData): void {
    const key = `${metric.name}:${JSON.stringify(metric.tags || {})}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(metric.value);

    // Send to observability platform
    this.emit(metric);

    // Log significant metrics
    if (this.isSignificant(metric)) {
      logger.debug('Metric recorded', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.tags,
      });
    }
  }

  private isSignificant(metric: MetricData): boolean {
    // Define which metrics should be logged
    const significantMetrics = [
      'request.duration',
      'request.error',
      'db.query.slow',
      'api.external.timeout',
    ];
    return significantMetrics.some((m) => metric.name.startsWith(m));
  }

  private emit(metric: MetricData): void {
    // Send to New Relic if available
    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.addPageAction('custom_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.tags,
      });
    }

    // Server-side: log as structured JSON
    if (typeof window === 'undefined') {
      console.log(JSON.stringify({
        type: 'metric',
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
        timestamp: metric.timestamp || Date.now(),
      }));
    }
  }

  // Define an SLO
  defineSLO(slo: SLO): void {
    this.slos.set(slo.name, slo);
    this.errorBudget.set(slo.name, {
      consumed: 0,
      total: (1 - slo.target) * 100, // Convert to percentage
    });
    
    logger.info('SLO defined', {
      slo_name: slo.name,
      slo_target: slo.target,
      slo_window_seconds: slo.window,
      error_budget_percent: (1 - slo.target) * 100,
    });
  }

  // Track SLO compliance
  trackSLO(sloName: string, success: boolean): void {
    const slo = this.slos.get(sloName);
    if (!slo) {
      logger.warn('Attempted to track undefined SLO', { slo_name: sloName });
      return;
    }

    const budget = this.errorBudget.get(sloName)!;
    
    if (!success) {
      budget.consumed += 0.1; // Each failure consumes budget
      
      logger.warn('SLO violation', {
        slo_name: sloName,
        error_budget_consumed: budget.consumed,
        error_budget_total: budget.total,
        error_budget_remaining: budget.total - budget.consumed,
      });
    }

    // Alert if >50% budget consumed
    if (budget.consumed > budget.total * 0.5) {
      logger.error('SLO error budget critical', undefined, {
        slo_name: sloName,
        error_budget_consumed: budget.consumed,
        error_budget_total: budget.total,
        percent_consumed: (budget.consumed / budget.total) * 100,
      });
    }
  }

  // Get percentile from recorded metrics
  getPercentile(metricName: string, percentile: number, tags?: Record<string, string>): number | null {
    const key = `${metricName}:${JSON.stringify(tags || {})}`;
    const values = this.metrics.get(key);
    
    if (!values || values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  // Get current SLO status
  getSLOStatus(sloName: string): { target: number; budget_consumed: number; budget_remaining: number } | null {
    const slo = this.slos.get(sloName);
    const budget = this.errorBudget.get(sloName);
    
    if (!slo || !budget) return null;
    
    return {
      target: slo.target,
      budget_consumed: budget.consumed,
      budget_remaining: budget.total - budget.consumed,
    };
  }

  // Clear old metrics (call periodically)
  clearOldMetrics(olderThan: number = 3600000): void {
    // In a real implementation, would filter by timestamp
    this.metrics.clear();
    logger.debug('Cleared old metrics', { older_than_ms: olderThan });
  }
}

export const metrics = new MetricsCollector();

// Define standard SLOs for the application
export function initializeSLOs(): void {
  metrics.defineSLO({
    name: 'page_load_time',
    target: 0.95, // 95% of page loads
    window: 300, // 5 minutes
    description: 'Page loads should complete within acceptable time',
  });

  metrics.defineSLO({
    name: 'api_success_rate',
    target: 0.999, // 99.9% success
    window: 3600, // 1 hour
    description: 'API requests should succeed',
  });

  metrics.defineSLO({
    name: 'db_query_performance',
    target: 0.95, // 95% under threshold
    window: 300, // 5 minutes
    description: 'Database queries should be fast',
  });

  logger.info('SLOs initialized', {
    slo_count: 3,
  });
}

// Helper to time operations
export async function timed<T>(
  metricName: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    metrics.record({
      name: metricName,
      value: duration,
      unit: 'milliseconds',
      tags,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    metrics.record({
      name: `${metricName}.error`,
      value: duration,
      unit: 'milliseconds',
      tags,
    });
    
    throw error;
  }
}
