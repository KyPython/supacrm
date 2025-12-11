// app/api/health/route.ts - Health check endpoint with observability
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../lib/logger';
import { metrics } from '../../../lib/metrics';
import { getCircuitBreakerStates } from '../../../lib/observable-fetch';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;

  try {
    // Check database connection
    const dbHealthy = await checkDatabase();
    
    // Get circuit breaker states
    const circuitBreakers = getCircuitBreakerStates();
    
    // Get SLO status
    const sloStatus = {
      page_load_time: metrics.getSLOStatus('page_load_time'),
      api_success_rate: metrics.getSLOStatus('api_success_rate'),
      db_query_performance: metrics.getSLOStatus('db_query_performance'),
    };

    const duration = Date.now() - startTime;
    
    const health = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'up' : 'down',
        circuit_breakers: circuitBreakers,
      },
      slos: sloStatus,
      uptime: process.uptime(),
      version: process.env.NEXT_PUBLIC_VERSION || '0.1.0',
      environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV,
      response_time_ms: duration,
    };

    logger.debug('Health check completed', {
      request_id: requestId,
      status: health.status,
      duration_ms: duration,
    });

    return NextResponse.json(health, {
      status: dbHealthy ? 200 : 503,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Health check failed', error as Error, {
      request_id: requestId,
      duration_ms: duration,
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'X-Request-ID': requestId,
        },
      }
    );
  }
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Try to import and use the Supabase client
    const { supabase } = await import('../../../lib/supabase');
    
    if (!supabase) {
      return false;
    }

    // Simple query to check connectivity
    const { error } = await supabase
      .from('contacts')
      .select('id')
      .limit(1)
      .single();

    // If error is null or just "no rows", database is healthy
    return error === null || error.code === 'PGRST116';
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return false;
  }
}
