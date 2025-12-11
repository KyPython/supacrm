// lib/observable-fetch.ts - HTTP client with observability
import { logger, LogContext } from './logger';
import { tracer, SpanStatus } from './tracing';

export interface FetchOptions extends RequestInit {
  context?: LogContext;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      
      logger.warn('Circuit breaker opened', {
        failure_count: this.failureCount,
        next_attempt: new Date(this.nextAttempt).toISOString(),
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Circuit breakers for different services
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(service: string): CircuitBreaker {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(
      service,
      new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
      })
    );
  }
  return circuitBreakers.get(service)!;
}

export async function observableFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    context = {},
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  // Extract service name from URL
  const urlObj = new URL(url);
  const serviceName = urlObj.hostname;

  const span = tracer.startSpan(`http.${fetchOptions.method || 'GET'}`);
  span.setAttributes({
    'http.url': url,
    'http.method': fetchOptions.method || 'GET',
    'http.service': serviceName,
    ...context,
  });

  const startTime = Date.now();
  let lastError: Error | undefined;

  // Get circuit breaker for this service
  const circuitBreaker = getCircuitBreaker(serviceName);

  logger.debug('HTTP request started', {
    url,
    method: fetchOptions.method || 'GET',
    ...context,
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await circuitBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const res = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return res;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });

      const duration = Date.now() - startTime;

      span.setAttributes({
        'http.status_code': response.status,
        'http.duration_ms': duration,
        'http.attempts': attempt + 1,
      });

      logger.info('HTTP request completed', {
        url,
        status: response.status,
        duration_ms: duration,
        attempts: attempt + 1,
        ...context,
      });

      if (response.ok) {
        span.setStatus(SpanStatus.OK);
      } else {
        span.setStatus(SpanStatus.ERROR, `HTTP ${response.status}`);
        logger.warn('HTTP request returned error status', {
          url,
          status: response.status,
          duration_ms: duration,
          ...context,
        });
      }

      span.end();
      return response;
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        logger.warn('HTTP request failed, retrying', {
          url,
          attempt: attempt + 1,
          max_retries: retries,
          retry_delay_ms: delay,
          error_message: lastError.message,
          ...context,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  const duration = Date.now() - startTime;
  
  span.recordException(lastError!);
  span.setStatus(SpanStatus.ERROR);
  span.setAttributes({
    'http.duration_ms': duration,
    'http.attempts': retries + 1,
  });
  
  logger.error('HTTP request failed after all retries', lastError, {
    url,
    attempts: retries + 1,
    duration_ms: duration,
    circuit_breaker_state: circuitBreaker.getState(),
    ...context,
  });

  span.end();
  throw lastError!;
}

// Helper to check circuit breaker states
export function getCircuitBreakerStates(): Record<string, string> {
  const states: Record<string, string> = {};
  circuitBreakers.forEach((breaker, service) => {
    states[service] = breaker.getState();
  });
  return states;
}
