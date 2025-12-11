# Logging Policy

## ⚠️ CRITICAL: Environment-Aware Logging

**All logs MUST be environment-aware and integrated with the observability system.**

---

## Rules

### 1. Never Use `console.log()` Directly

**❌ BAD:**
```typescript
console.log('User logged in', userId);
console.error('Failed to save', error);
```

**✅ GOOD:**
```typescript
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId });
logger.error('Failed to save', error, { userId });
```

### 2. Development-Only Logs

**Debug logs** should only appear in development:

```typescript
// ✅ Automatically handled by logger
logger.debug('Component rendered', { component: 'Dashboard' });
// Only logs in development, always tracked in observability
```

### 3. Production Logs

**Errors and warnings** are logged in production:

```typescript
// ✅ Always logged (errors are critical)
logger.error('Database connection failed', error);

// ✅ Always logged (warnings are important)
logger.warn('Rate limit approaching', { userId, requests: 95 });
```

### 4. Integration with Observability

All logs are automatically:
- ✅ Sent to observability platform (New Relic, etc.)
- ✅ Tracked in metrics
- ✅ Correlated with request IDs
- ✅ Included in traces

---

## Log Levels

### `logger.debug()`
- **Development only** - Console output
- **Always tracked** - Sent to observability
- Use for: Component lifecycle, detailed flow, debugging

### `logger.info()`
- **Development only** - Console output  
- **Always tracked** - Sent to observability
- Use for: Page views, user actions, important events

### `logger.warn()`
- **Always logged** - Console + observability
- Use for: Rate limits, deprecations, recoverable errors

### `logger.error()`
- **Always logged** - Console + observability
- Use for: Exceptions, failures, critical issues

---

## Environment Behavior

### Development (`NODE_ENV=development`)
- ✅ All log levels visible in console
- ✅ Formatted, colored output
- ✅ Full context and stack traces
- ✅ Sent to observability

### Production (`NODE_ENV=production`)
- ✅ Only `warn` and `error` in console
- ✅ All logs sent to observability
- ✅ Structured JSON format (server-side)
- ✅ No debug/info console spam

---

## Integration Points

### 1. Logger (`src/lib/logger.ts`)
- Environment-aware log levels
- Automatic observability integration
- Request ID correlation
- User/session tracking

### 2. Metrics (`src/lib/metrics.ts`)
- Logs significant metrics
- SLO tracking
- Error budget management

### 3. Tracing (`src/lib/tracing.ts`)
- Span completion logged
- Trace correlation
- Performance tracking

### 4. Analytics (`src/lib/analytics.ts`)
- Event tracking
- User behavior
- Conversion funnels

---

## Examples

### Component Logging

```typescript
import { logger } from '@/lib/logger';
import { useComponentObservability } from '@/hooks/useObservability';

function MyComponent() {
  const log = useComponentObservability('MyComponent');
  
  useEffect(() => {
    log.debug('Component mounted'); // Dev only, tracked always
  }, []);
  
  const handleClick = () => {
    log.info('Button clicked'); // Dev only, tracked always
  };
  
  return <button onClick={handleClick}>Click me</button>;
}
```

### Error Handling

```typescript
try {
  await saveData();
} catch (error) {
  // ✅ Always logged in production
  logger.error('Failed to save data', error, { userId, dataType });
  throw error;
}
```

### API Calls

```typescript
import { useObservableAPI } from '@/hooks/useObservability';

function MyPage() {
  const { callAPI } = useObservableAPI();
  
  const fetchData = async () => {
    try {
      const data = await callAPI('/api/data', {
        context: { page: 'dashboard' }
      });
      // Automatically logged and traced
    } catch (error) {
      // Automatically logged with full context
    }
  };
}
```

---

## Migration Checklist

When updating code:

- [ ] Replace `console.log()` with `logger.debug()` or `logger.info()`
- [ ] Replace `console.error()` with `logger.error()`
- [ ] Replace `console.warn()` with `logger.warn()`
- [ ] Add context (userId, requestId, etc.) to logs
- [ ] Verify logs appear in observability system
- [ ] Test in both development and production

---

## Files Updated

All logging has been migrated to use the logger:

- ✅ `src/lib/logger.ts` - Core logger (environment-aware)
- ✅ `src/lib/metrics.ts` - Uses logger
- ✅ `src/lib/tracing.ts` - Uses logger
- ✅ `src/context/ThemeContext.tsx` - Uses logger
- ✅ `src/components/ThemeToggle.tsx` - Uses logger
- ✅ `src/hooks/usePricing.ts` - Uses logger
- ✅ `src/hooks/useUsage.ts` - Uses logger
- ✅ `src/app/page.tsx` - Uses logger
- ✅ `src/app/home/page.tsx` - Uses logger
- ✅ `src/app/settings/page.tsx` - Uses logger
- ✅ `src/app/settings/handlers.ts` - Uses logger
- ✅ `src/components/AuthGate.tsx` - Uses logger
- ✅ `src/lib/supabase.ts` - Uses logger
- ✅ `src/context/AuthContext.js` - Uses logger

---

## Verification

To verify logging is working:

1. **Development:**
   ```bash
   npm run dev
   # Check browser console - should see formatted logs
   ```

2. **Production:**
   ```bash
   npm run build
   npm start
   # Check console - should only see warnings/errors
   # Check observability platform - should see all logs
   ```

3. **Check Observability:**
   - Logs should appear in `/api/analytics` endpoint
   - Metrics should be recorded
   - Traces should include log events

---

## Best Practices

1. **Always include context:**
   ```typescript
   logger.error('Failed', error, { userId, action: 'save' });
   ```

2. **Use appropriate log levels:**
   - `debug` - Detailed flow (dev only)
   - `info` - Important events (dev only)
   - `warn` - Recoverable issues (always)
   - `error` - Failures (always)

3. **Don't log sensitive data:**
   ```typescript
   // ❌ BAD
   logger.info('User logged in', { password });
   
   // ✅ GOOD
   logger.info('User logged in', { userId });
   ```

4. **Use structured logging:**
   ```typescript
   // ✅ GOOD - structured
   logger.info('Order created', { orderId, userId, amount });
   
   // ❌ BAD - string concatenation
   logger.info(`Order ${orderId} created by ${userId}`);
   ```

---

**Remember:** All logs go through the observability system. Debug/info logs are development-only in console, but always tracked for production monitoring.
