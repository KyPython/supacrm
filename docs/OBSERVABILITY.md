# Observability Implementation Guide

## Overview

This document describes the comprehensive observability infrastructure implemented in supacrm following industry best practices and the Observability Engineering Framework.

## Critical Security Issue: Row-Level Security (RLS)

⚠️ **URGENT**: Supabase RLS is NOT currently enabled on tables. This is a **critical security vulnerability**. See `docs/RLS_IMPLEMENTATION.md` for immediate action items.

## Components Implemented

### 1. Structured Logging (`lib/logger.ts`)
- Context-rich, JSON-formatted logging
- Request ID correlation
- User/session tracking
- Environment-aware log levels
- New Relic integration ready

### 2. Distributed Tracing (`lib/tracing.ts`)
- Trace ID propagation across requests
- Span creation and management
- Performance timing
- Error recording

### 3. Observable Supabase Client (`lib/observable-supabase.ts`)
- Automatic query performance tracking
- Slow query detection (>500ms)
- Error tracking with context
- Row count metrics

### 4. Observable HTTP Client (`lib/observable-fetch.ts`)
- Circuit breaker pattern
- Automatic retries with exponential backoff
- Request/response timing
- Timeout handling

### 5. Metrics and SLO Tracking (`lib/metrics.ts`)
- Custom metric recording
- SLO definition and tracking
- Error budget management
- Automatic alerting

### 6. React Hooks (`hooks/useObservability.ts`)
- Page view tracking
- User interaction tracking
- API call observability
- Component lifecycle tracking

### 7. Observability Provider (`components/ObservabilityProvider.tsx`)
- Global initialization
- Error handlers
- Performance monitoring

### 8. Enhanced Middleware (`middleware-enhanced.ts`)
- Request ID generation
- Response time tracking
- Authentication logging

### 9. Health Check Endpoint (`app/api/health/route.ts`)
- Service health monitoring
- SLO status reporting
- Circuit breaker status

## Quick Start

### 1. Install Dependencies
```bash
npm install uuid
npm install -D @types/uuid
```

### 2. Environment Variables
Add to `.env.local`:
```bash
NEXT_PUBLIC_SERVICE_NAME=supacrm
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_VERSION=0.1.0
LOG_LEVEL=debug
```

### 3. Update Root Layout
```typescript
// src/app/layout.tsx
import { ObservabilityProvider } from '@/components/ObservabilityProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ObservabilityProvider environment={process.env.NEXT_PUBLIC_ENV}>
          {children}
        </ObservabilityProvider>
      </body>
    </html>
  );
}
```

### 4. Use in Components
```typescript
import { usePageTracking } from '@/hooks/useObservability';

export function MyPage() {
  usePageTracking();
  // Component code...
}
```

## SLOs Defined

1. **Page Load Time**: 95% < 2s (5min window)
2. **API Success Rate**: 99.9% (1hr window)
3. **DB Query Performance**: 95% < 500ms (5min window)

## Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Run dev server
npm run dev

# Check logs (JSON format)
npm run dev | grep '"level":"info"'
```

## Next Steps (Priority Order)

1. ✅ **IMPLEMENTED**: Core observability infrastructure
2. 🔴 **CRITICAL**: Enable RLS on all Supabase tables
3. 🟡 **HIGH**: Set up New Relic account
4. 🟡 **HIGH**: Create monitoring dashboards
5. 🟢 **MEDIUM**: Set up deployment markers
6. 🟢 **MEDIUM**: Implement E2E tests with observability
7. 🟢 **LOW**: Add feature flags

## Resources

- [Observability Engineering Book](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)
- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [New Relic Best Practices](https://docs.newrelic.com/docs/new-relic-solutions/best-practices-guides/)
