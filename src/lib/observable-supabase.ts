// lib/observable-supabase.ts - Supabase client with observability
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger, LogContext } from './logger';
import { tracer, SpanStatus } from './tracing';

interface QueryOptions {
  context?: LogContext;
  spanName?: string;
}

class ObservableSupabaseClient {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  // Wrap any query with observability
  async query<T = any>(
    tableName: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    queryBuilder: any,
    options: QueryOptions = {}
  ): Promise<T> {
    const spanName = options.spanName || `supabase.${tableName}.${operation}`;
    const span = tracer.startSpan(spanName);
    
    span.setAttributes({
      'db.system': 'postgresql',
      'db.table': tableName,
      'db.operation': operation,
      ...options.context,
    });

    const startTime = Date.now();

    try {
      const result = await queryBuilder;
      const duration = Date.now() - startTime;

      if (result.error) {
        throw result.error;
      }

      span.setAttributes({
        'db.rows_affected': result.data?.length || 0,
        'db.duration_ms': duration,
      });

      // Log slow queries
      if (duration > 500) {
        logger.warn('Slow database query detected', {
          table: tableName,
          operation,
          duration_ms: duration,
          ...options.context,
        });
      }

      span.setStatus(SpanStatus.OK);
      
      logger.debug('Database query completed', {
        table: tableName,
        operation,
        duration_ms: duration,
        rows: result.data?.length || 0,
        ...options.context,
      });

      return result.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      span.recordException(error as Error);
      span.setStatus(SpanStatus.ERROR);
      
      logger.error('Database query failed', error as Error, {
        table: tableName,
        operation,
        duration_ms: duration,
        error_code: (error as any).code,
        ...options.context,
      });

      throw error;
    } finally {
      span.end();
    }
  }

  // Expose underlying client for direct access when needed
  get raw(): SupabaseClient {
    return this.client;
  }

  // Convenience methods
  from(table: string) {
    return {
      select: (query = '*', options?: QueryOptions) =>
        this.query(table, 'select', this.client.from(table).select(query), options),
      
      insert: (data: any, options?: QueryOptions) =>
        this.query(table, 'insert', this.client.from(table).insert(data), options),
      
      update: (data: any, options?: QueryOptions) =>
        this.query(table, 'update', this.client.from(table).update(data), options),
      
      delete: (options?: QueryOptions) =>
        this.query(table, 'delete', this.client.from(table).delete(), options),
    };
  }
}

// Create observable client instances
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const observableSupabase = url && key 
  ? new ObservableSupabaseClient(url, key)
  : null;

// Admin client (server-side only)
export const observableSupabaseAdmin = 
  typeof window === 'undefined' && url && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? new ObservableSupabaseClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
