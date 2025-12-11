// components/ObservabilityProvider.tsx - Global observability context
'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { initializeSLOs } from '../lib/metrics';
import { logger } from '../lib/logger';

interface ObservabilityContextType {
  initialized: boolean;
}

const ObservabilityContext = createContext<ObservabilityContextType>({
  initialized: false,
});

export function useObservability() {
  return useContext(ObservabilityContext);
}

interface ObservabilityProviderProps {
  children: ReactNode;
  userId?: string;
  environment?: string;
}

export function ObservabilityProvider({
  children,
  userId,
  environment = 'development',
}: ObservabilityProviderProps) {
  useEffect(() => {
    // Initialize observability on app startup
    logger.info('Initializing observability', {
      user_id: userId,
      environment,
      timestamp: new Date().toISOString(),
    });

    // Initialize SLOs
    initializeSLOs();

    // Set up global error handlers
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection', event.reason, {
          promise: event.promise.toString(),
        });
      });

      // Handle global errors
      window.addEventListener('error', (event) => {
        logger.error('Global error', event.error, {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      // Track performance metrics
      if (window.performance && typeof window.performance.getEntriesByType === 'function') {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              logger.debug('Navigation timing', {
                dns_time: navEntry.domainLookupEnd - navEntry.domainLookupStart,
                connection_time: navEntry.connectEnd - navEntry.connectStart,
                request_time: navEntry.responseStart - navEntry.requestStart,
                response_time: navEntry.responseEnd - navEntry.responseStart,
                dom_processing: navEntry.domComplete - navEntry.domLoading,
                load_time: navEntry.loadEventEnd - navEntry.fetchStart,
              });
            }
          }
        });

        observer.observe({ entryTypes: ['navigation', 'resource'] });
      }

      // Set user context in New Relic if available
      if ((window as any).newrelic && userId) {
        (window as any).newrelic.setCustomAttribute('user_id', userId);
        (window as any).newrelic.setCustomAttribute('environment', environment);
      }
    }

    logger.info('Observability initialized', {
      user_id: userId,
      environment,
    });
  }, [userId, environment]);

  return (
    <ObservabilityContext.Provider value={{ initialized: true }}>
      {children}
    </ObservabilityContext.Provider>
  );
}
