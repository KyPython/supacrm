// hooks/useObservability.ts - React hooks for observability
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logger, LogContext, createContextLogger } from '../lib/logger';
import { tracer, traced } from '../lib/tracing';
import { metrics, timed } from '../lib/metrics';

// Track page views and user sessions
export function usePageTracking(userId?: string) {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>();

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const context: LogContext = {
      pathname,
      user_id: userId,
      session_id: sessionIdRef.current,
    };

    // Log page view
    logger.info('Page view', context);

    // Track page load performance
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        metrics.record({
          name: 'page.load_time',
          value: loadTime,
          unit: 'milliseconds',
          tags: { pathname },
        });

        metrics.record({
          name: 'page.dom_content_loaded',
          value: domContentLoaded,
          unit: 'milliseconds',
          tags: { pathname },
        });

        // Track against SLO
        metrics.trackSLO('page_load_time', loadTime < 2000); // 2 second target

        logger.debug('Page performance metrics', {
          ...context,
          load_time_ms: loadTime,
          dom_content_loaded_ms: domContentLoaded,
        });
      }
    }
  }, [pathname, userId]);

  return sessionIdRef.current;
}

// Track user interactions
export function useInteractionTracking(componentName: string, userId?: string) {
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const trackInteraction = (eventName: string, metadata?: Record<string, any>) => {
    const context: LogContext = {
      component: componentName,
      user_id: userId,
      session_id: sessionId.current,
      event_name: eventName,
      ...metadata,
    };

    logger.info('User interaction', context);

    metrics.record({
      name: 'user.interaction',
      value: 1,
      tags: {
        component: componentName,
        event: eventName,
      },
    });

    // Send to analytics if available
    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.addPageAction(eventName, {
        component: componentName,
        user_id: userId,
        ...metadata,
      });
    }
  };

  return { trackInteraction };
}

// Track API calls with observability
export function useObservableAPI() {
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const callAPI = async <T,>(
    endpoint: string,
    options: RequestInit & { context?: LogContext } = {}
  ): Promise<T> => {
    const { context = {}, ...fetchOptions } = options;
    const method = fetchOptions.method || 'GET';

    return traced(
      `api.${method}.${endpoint}`,
      async (span) => {
        span.setAttributes({
          'http.endpoint': endpoint,
          'http.method': method,
          session_id: sessionId.current,
          ...context,
        });

        const startTime = Date.now();

        try {
          const response = await fetch(endpoint, fetchOptions);
          const duration = Date.now() - startTime;

          span.setAttributes({
            'http.status_code': response.status,
            'http.duration_ms': duration,
          });

          metrics.record({
            name: 'api.request.duration',
            value: duration,
            unit: 'milliseconds',
            tags: {
              endpoint,
              method,
              status: response.status.toString(),
            },
          });

          // Track against SLO
          metrics.trackSLO('api_success_rate', response.ok);

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }

          const data = await response.json();
          
          logger.debug('API request completed', {
            endpoint,
            method,
            status: response.status,
            duration_ms: duration,
            ...context,
          });

          return data;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          logger.error('API request failed', error as Error, {
            endpoint,
            method,
            duration_ms: duration,
            ...context,
          });

          metrics.record({
            name: 'api.request.error',
            value: 1,
            tags: {
              endpoint,
              method,
              error_type: (error as Error).name,
            },
          });

          throw error;
        }
      }
    );
  };

  return { callAPI };
}

// Track component lifecycle and performance
export function useComponentObservability(componentName: string) {
  const mountTimeRef = useRef<number>();
  const log = useRef(createContextLogger({ component: componentName }));

  useEffect(() => {
    mountTimeRef.current = Date.now();
    
    log.current.debug('Component mounted', {
      timestamp: new Date().toISOString(),
    });

    return () => {
      const lifetime = Date.now() - (mountTimeRef.current || Date.now());
      
      log.current.debug('Component unmounted', {
        lifetime_ms: lifetime,
      });

      metrics.record({
        name: 'component.lifetime',
        value: lifetime,
        unit: 'milliseconds',
        tags: { component: componentName },
      });
    };
  }, [componentName]);

  return log.current;
}

// Track errors with React Error Boundaries
export function useErrorTracking() {
  const trackError = (error: Error, errorInfo?: any, context?: LogContext) => {
    logger.error('React error caught', error, {
      component_stack: errorInfo?.componentStack,
      ...context,
    });

    metrics.record({
      name: 'react.error',
      value: 1,
      tags: {
        error_name: error.name,
        error_message: error.message,
      },
    });

    // Send to error tracking service
    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.noticeError(error, {
        component_stack: errorInfo?.componentStack,
        ...context,
      });
    }
  };

  return { trackError };
}
