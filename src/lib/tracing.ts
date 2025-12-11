// lib/tracing.ts - Distributed tracing support
import { generateRequestId, logger } from './logger';

export interface SpanContext {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  start_time: number;
  attributes: Record<string, any>;
}

export enum SpanStatus {
  OK = 'OK',
  ERROR = 'ERROR',
}

class Span {
  private context: SpanContext;
  private endTime?: number;
  private status: SpanStatus = SpanStatus.OK;
  private events: Array<{ timestamp: number; name: string; attributes?: Record<string, any> }> = [];

  constructor(
    public name: string,
    traceId?: string,
    parentSpanId?: string
  ) {
    this.context = {
      span_id: generateRequestId(),
      trace_id: traceId || generateRequestId(),
      parent_span_id: parentSpanId,
      start_time: Date.now(),
      attributes: {},
    };
  }

  setAttributes(attributes: Record<string, any>): void {
    Object.assign(this.context.attributes, attributes);
  }

  setStatus(status: SpanStatus, message?: string): void {
    this.status = status;
    if (message) {
      this.context.attributes.status_message = message;
    }
  }

  addEvent(name: string, attributes?: Record<string, any>): void {
    this.events.push({
      timestamp: Date.now(),
      name,
      attributes,
    });
  }

  recordException(error: Error): void {
    this.addEvent('exception', {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack,
    });
    this.setStatus(SpanStatus.ERROR);
  }

  end(): void {
    this.endTime = Date.now();
    this.emit();
  }

  private emit(): void {
    const duration = this.endTime! - this.context.start_time;
    
    // Send to observability platform
    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.addPageAction('span', {
        name: this.name,
        trace_id: this.context.trace_id,
        span_id: this.context.span_id,
        parent_span_id: this.context.parent_span_id,
        duration_ms: duration,
        status: this.status,
        ...this.context.attributes,
      });
    }

    // Log span completion (development only for client, always for server)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const shouldLogToConsole = typeof window === 'undefined' || isDevelopment;
    
    if (shouldLogToConsole) {
      logger.debug('Span completed', {
        span_name: this.name,
        trace_id: this.context.trace_id,
        span_id: this.context.span_id,
        parent_span_id: this.context.parent_span_id,
        duration_ms: duration,
        status: this.status,
        ...this.context.attributes,
      });
    }

    // Always send to observability endpoint (fire and forget)
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'span',
            name: this.name,
            trace_id: this.context.trace_id,
            span_id: this.context.span_id,
            parent_span_id: this.context.parent_span_id,
            duration_ms: duration,
            status: this.status,
            attributes: this.context.attributes,
            events: this.events,
          }),
        }).catch(() => {
          // Ignore analytics errors
        });
      } catch (e) {
        // Ignore analytics errors
      }
    }
  }

  getTraceId(): string {
    return this.context.trace_id;
  }

  getSpanId(): string {
    return this.context.span_id;
  }
}

class Tracer {
  private activeSpans: Map<string, Span> = new Map();

  startSpan(name: string, traceId?: string, parentSpanId?: string): Span {
    const span = new Span(name, traceId, parentSpanId);
    this.activeSpans.set(span.getSpanId(), span);
    return span;
  }

  getActiveSpan(): Span | undefined {
    return Array.from(this.activeSpans.values()).pop();
  }

  endSpan(spanId: string): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.end();
      this.activeSpans.delete(spanId);
    }
  }
}

export const tracer = new Tracer();

// Helper for wrapping async operations with tracing
export async function traced<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = tracer.startSpan(name);
  
  if (attributes) {
    span.setAttributes(attributes);
  }

  try {
    const result = await fn(span);
    span.setStatus(SpanStatus.OK);
    return result;
  } catch (error) {
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
