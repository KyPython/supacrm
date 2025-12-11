# SupaCRM Observability Implementation Checklist

## ✅ Completed Items

### Core Infrastructure
- [x] Structured logging library (`lib/logger.ts`)
- [x] Distributed tracing (`lib/tracing.ts`)
- [x] Custom metrics & SLO tracking (`lib/metrics.ts`)
- [x] Observable Supabase client (`lib/observable-supabase.ts`)
- [x] Observable HTTP client with circuit breakers (`lib/observable-fetch.ts`)
- [x] Enhanced middleware with request tracking
- [x] Health check API endpoint (`/api/health`)

### React Integration
- [x] Observability React hooks (`hooks/useObservability.ts`)
- [x] Global ObservabilityProvider component
- [x] Page tracking hooks
- [x] Interaction tracking
- [x] Component lifecycle tracking

### CI/CD
- [x] GitHub Actions workflow with observability checks
- [x] Automated linting and testing
- [x] Security scanning with Snyk (ready for token)
- [x] Build verification
- [x] Deployment markers for New Relic
- [x] Observability validation script

### Documentation
- [x] Observability implementation guide
- [x] RLS implementation guide (CRITICAL)
- [x] Integration examples
- [x] SLO definitions

## 🔴 CRITICAL - Do Immediately

### Row-Level Security (RLS)
- [ ] Audit all Supabase tables for RLS status
- [ ] Enable RLS on ALL tables:
  - [ ] contacts
  - [ ] companies
  - [ ] deals
  - [ ] tasks
  - [ ] files
  - [ ] activity_logs
  - [ ] settings
- [ ] Create RLS policies for each table
- [ ] Add indexes on user_id columns
- [ ] Test RLS with multiple users
- [ ] Verify no data leakage between users
- [ ] Add RLS monitoring to health check

**Timeline**: Complete within 1-2 days  
**Risk**: HIGH - Current state allows any authenticated user to access all data  
**Reference**: `docs/RLS_IMPLEMENTATION.md`

## 🟡 High Priority - Do This Week

### Observability Platform Setup
- [ ] Create New Relic account (or use existing)
- [ ] Install New Relic Browser agent
- [ ] Install New Relic APM for Next.js
- [ ] Configure New Relic API keys in GitHub Secrets:
  - [ ] `NEW_RELIC_API_KEY`
  - [ ] `NEW_RELIC_APP_ID`
  - [ ] `NEW_RELIC_ACCOUNT_ID`
  - [ ] `NEW_RELIC_USER_KEY`
- [ ] Verify telemetry data flowing to New Relic
- [ ] Create initial dashboards

### Application Integration
- [ ] Update `src/app/layout.tsx` to include ObservabilityProvider
- [ ] Replace old middleware.ts with middleware-enhanced.ts
- [ ] Add observability to existing API routes
- [ ] Add page tracking to main pages
- [ ] Update Supabase calls to use observable client

### Environment Setup
- [ ] Create `.env.example` with required variables
- [ ] Add observability env vars to `.env.local`:
  ```bash
  NEXT_PUBLIC_SERVICE_NAME=supacrm
  NEXT_PUBLIC_ENV=development
  NEXT_PUBLIC_VERSION=0.1.0
  LOG_LEVEL=debug
  ```
- [ ] Add same vars to Vercel environment variables

## 🟢 Medium Priority - Do This Month

### Enhanced Monitoring
- [ ] Create custom New Relic dashboards:
  - [ ] User journey dashboard
  - [ ] API performance dashboard
  - [ ] Database performance dashboard
  - [ ] Error tracking dashboard
- [ ] Set up alerts for SLO violations
- [ ] Configure alert channels (Slack, email, PagerDuty)
- [ ] Create runbooks for common incidents

### Testing & Validation
- [ ] Add E2E tests with Playwright
- [ ] Instrument tests with observability
- [ ] Add smoke tests for production deployment
- [ ] Create load testing scenarios
- [ ] Validate observability under load

### Security Enhancements
- [ ] Set up Snyk account and add token to GitHub Secrets
- [ ] Enable GitHub Code Scanning
- [ ] Add Dependabot configuration
- [ ] Review and update CSP headers
- [ ] Implement rate limiting with observability

### Performance Optimization
- [ ] Add database query performance monitoring
- [ ] Implement slow query alerts (>500ms)
- [ ] Add cache hit/miss tracking
- [ ] Monitor and optimize RLS policy performance
- [ ] Track Vercel Edge Function cold starts

## 🔵 Low Priority - Do Eventually

### Advanced Features
- [ ] Implement feature flags with observability
- [ ] Add A/B testing framework
- [ ] Create user session replay (LogRocket, FullStory)
- [ ] Implement distributed tracing across external services
- [ ] Add real-user monitoring (RUM)

### Developer Experience
- [ ] Create VS Code snippets for observability patterns
- [ ] Add observability to local development
- [ ] Create observability CLI tools
- [ ] Add observability to Docker containers
- [ ] Document common debugging workflows

### Documentation
- [ ] Create observability training materials
- [ ] Document incident response procedures
- [ ] Create observability best practices guide
- [ ] Add examples for common patterns
- [ ] Create video tutorials

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Check observability infrastructure
npm run observability:check

# Run development server with observability
npm run dev

# Check health endpoint
npm run health:check
# or
curl http://localhost:3000/api/health

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## 📊 Success Metrics

### Week 1
- [ ] RLS enabled on all tables (CRITICAL)
- [ ] Observability integrated in root layout
- [ ] Health endpoint returning 200
- [ ] Logs flowing to console in JSON format

### Week 2
- [ ] New Relic collecting data
- [ ] At least 5 API routes instrumented
- [ ] SLOs defined and tracking
- [ ] GitHub Actions workflow passing

### Week 3
- [ ] All API routes instrumented
- [ ] Page tracking on main pages
- [ ] Custom dashboards created
- [ ] Alerts configured

### Month 1
- [ ] 95%+ observability coverage
- [ ] MTTR < 30 minutes
- [ ] SLOs consistently met
- [ ] Team using observability daily

## 🆘 Common Issues & Solutions

### Issue: Health endpoint returns 503
**Solution**: Check Supabase connection. Verify env vars are set correctly.

### Issue: No logs appearing
**Solution**: Check LOG_LEVEL env var. Verify console.log in browser dev tools.

### Issue: Middleware not tracking requests
**Solution**: Ensure middleware-enhanced.ts is being used, not old middleware.ts.

### Issue: RLS blocking legitimate queries
**Solution**: Review RLS policies. Check user_id is correctly set in queries.

### Issue: New Relic not receiving data
**Solution**: Verify API keys in env vars. Check browser console for errors.

## 📚 Resources

- [Observability Guide](./docs/OBSERVABILITY.md)
- [RLS Implementation](./docs/RLS_IMPLEMENTATION.md)
- [The Pragmatic Programmer Checklist](./PRAGMATIC_PROGRAMMER.md)
- [New Relic Docs](https://docs.newrelic.com/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🎯 Current Status

**Overall Progress**: 60% Complete

**Critical Blockers**: 
1. RLS not enabled (SECURITY RISK)
2. ObservabilityProvider not integrated in layout
3. New Relic not configured

**Next Action**: Enable RLS on all Supabase tables (see docs/RLS_IMPLEMENTATION.md)

---

Last Updated: 2025-01-11
Version: 0.1.0
