# SupaCRM - Enterprise SaaS CRM with Production Observability

**SupaCRM** is a production-ready, secure, multi-role SaaS Customer Relationship Management (CRM) application built with Next.js 15, React 18, and Supabase. Features enterprise-grade observability, distributed tracing, and comprehensive monitoring.

## 🎯 Key Features

### Core CRM Functionality
- **Multi-role Access Control**: `super_admin`, `admin`, `agent`, and `user` roles
- **Supabase Authentication**: OAuth and Magic Link support
- **Row-Level Security (RLS)**: Database-level access control
- **Full CRUD Operations**: Companies, Contacts, Deals, Tasks, and Files
- **Secure File Storage**: Supabase Storage with RLS policies
- **Protected Routes**: Role-based navigation and UI components

### Enterprise Observability
- **Structured Logging**: JSON-formatted logs with context propagation
- **Distributed Tracing**: Track requests across the entire system
- **Custom Metrics**: SLO tracking with error budget management
- **Circuit Breakers**: Prevent cascading failures
- **Health Monitoring**: `/api/health` endpoint with system status
- **Performance Tracking**: Automatic slow query detection

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account

### Installation

```bash
# 1. Clone and install
git clone <repository-url>
cd supacrm
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_SERVICE_NAME=supacrm
# - NEXT_PUBLIC_ENV=development
# - LOG_LEVEL=debug

# 3. Verify observability infrastructure
npm run observability:check

# 4. Start development server
npm run dev

# 5. Check health endpoint (in another terminal)
npm run health:check
# or: curl http://localhost:3000/api/health
```

### First-Time Setup

1. **Enable Row-Level Security (CRITICAL)**
   - See `docs/RLS_IMPLEMENTATION.md` for detailed steps
   - Enable RLS on all tables in Supabase dashboard
   - This is a **critical security requirement**

2. **Verify Observability**
   ```bash
   npm run observability:check
   # Should show: ✅ Passed: 8
   ```

3. **Access the Application**
   - Open http://localhost:3000
   - Sign up or log in
   - Navigate to dashboard

## 📊 Observability Features

### What You Can Monitor

✅ Debug ANY production issue in <30 minutes  
✅ Track what any specific user is experiencing  
✅ See performance across all user segments  
✅ Identify which users generate most load  
✅ Find hidden timeouts and edge cases  
✅ Track SLO compliance and error budgets  
✅ Detect slow database queries automatically  
✅ Handle external service failures gracefully  

### Built-in SLOs

1. **Page Load Time**: 95% of page loads < 2 seconds
2. **API Success Rate**: 99.9% of API requests succeed
3. **Database Performance**: 95% of queries < 500ms

### Available Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server

# Testing & Quality
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run lint             # Run linter
npm run type-check       # TypeScript type checking

# Observability
npm run observability:check  # Verify observability setup
npm run health:check         # Check application health
```

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React 18 | Server-side rendering, modern UI |
| **Backend** | Supabase | PostgreSQL, Auth, Storage |
| **Observability** | Custom (OpenTelemetry patterns) | Logging, tracing, metrics |
| **Security** | RLS, JWT | Database-level access control |
| **Deployment** | Vercel (Frontend), Supabase (Backend) | Scalable hosting |

### Project Structure

```
supacrm/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   │   └── ObservabilityProvider.tsx
│   ├── hooks/               # Custom React hooks
│   │   └── useObservability.ts
│   ├── lib/                 # Core libraries
│   │   ├── logger.ts        # Structured logging
│   │   ├── tracing.ts       # Distributed tracing
│   │   ├── metrics.ts       # Custom metrics
│   │   ├── observable-supabase.ts
│   │   └── observable-fetch.ts
│   └── context/             # React contexts
├── docs/                    # Documentation
│   ├── OBSERVABILITY.md
│   ├── RLS_IMPLEMENTATION.md (CRITICAL)
│   └── examples/
├── scripts/                 # Utility scripts
│   └── check-observability.js
├── .github/workflows/       # CI/CD
│   └── quality-check.yml
└── middleware.ts            # Request tracking
```

## 🔐 Security

### Row-Level Security (RLS)

**⚠️ CRITICAL**: RLS must be enabled on all Supabase tables before production deployment.

See `docs/RLS_IMPLEMENTATION.md` for:
- Step-by-step RLS enablement
- Policy creation scripts
- Testing procedures
- Performance considerations

### Security Features

- **Database-level access control** via RLS
- **JWT-based authentication** with Supabase Auth
- **Secure file storage** with access policies
- **CORS protection** and XSS prevention
- **Environment variable isolation**
- **Request ID tracking** for audit trails

## 📈 Monitoring & Observability

### Health Check Endpoint

```bash
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2025-01-11T04:12:57.306Z",
  "checks": {
    "database": "up",
    "circuit_breakers": {}
  },
  "slos": {
    "page_load_time": { "target": 0.95, "budget_consumed": 10 },
    "api_success_rate": { "target": 0.999, "budget_consumed": 5 },
    "db_query_performance": { "target": 0.95, "budget_consumed": 2 }
  },
  "uptime": 12345,
  "version": "0.1.0"
}
```

### Integration with New Relic (Optional)

1. Create New Relic account
2. Install Browser agent and APM
3. Add API keys to `.env.local`
4. Deploy and verify telemetry

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Full quality check (like CI)
npm test && npm run type-check && npm run lint && npm run observability:check
```

## 📚 Documentation

- **[Observability Guide](docs/OBSERVABILITY.md)** - Implementation details
- **[RLS Implementation](docs/RLS_IMPLEMENTATION.md)** - Security setup (CRITICAL)
- **[Observability Checklist](OBSERVABILITY_CHECKLIST.md)** - Task list
- **[Code Examples](docs/examples/)** - API routes and components

## 🚨 Critical Next Steps

Before deploying to production:

1. ✅ **Install dependencies**: `npm install`
2. ✅ **Integrate ObservabilityProvider**: Already done in `src/app/layout.tsx`
3. 🔴 **Enable RLS**: See `docs/RLS_IMPLEMENTATION.md` (1-2 hours)
4. 🟡 **Set environment variables**: Copy and edit `.env.example`
5. 🟡 **Configure New Relic**: Optional but recommended
6. 🟡 **Test thoroughly**: Run all tests and observability checks

## 🎯 Success Metrics

### After 1 Week
- [ ] RLS enabled on all tables
- [ ] Health endpoint returns 200
- [ ] Logs flowing in JSON format
- [ ] At least 5 API routes instrumented

### After 1 Month
- [ ] 95%+ observability coverage
- [ ] MTTR < 30 minutes
- [ ] SLOs consistently met
- [ ] Team using observability daily

## 💡 Development Tips

1. **Always check observability**: `npm run observability:check`
2. **Monitor health endpoint**: `npm run health:check`
3. **Use context loggers**: Automatically include request/user context
4. **Track SLOs**: Every API response should track SLO compliance
5. **Test locally first**: Verify observability before deploying

## 🆘 Troubleshooting

### Health endpoint returns 503
**Solution**: Check Supabase connection. Verify environment variables.

### No logs appearing
**Solution**: Check `LOG_LEVEL` environment variable. Verify in browser console.

### Observability check fails
**Solution**: Run `npm run observability:check` to see which files are missing.

### RLS blocking legitimate queries
**Solution**: Review RLS policies. Ensure `user_id` is correctly set in queries.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run all tests and checks
5. Submit a pull request

## 📧 Contact

Questions or feedback? Open an issue on the repository.

## 📄 License

[Add your license here]

---

**Version**: 0.1.0  
**Status**: Production-Ready Core Infrastructure (60% Complete)  
**Next Action**: Enable RLS (see `docs/RLS_IMPLEMENTATION.md`)

