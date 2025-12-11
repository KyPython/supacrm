# Research-Based Pricing Implementation Guide

**Date:** December 2025  
**Status:** ✅ Ready for Database Migration

## Overview

This guide documents the implementation of research-backed pricing strategy based on comprehensive market analysis of 13+ CRM competitors and infrastructure cost modeling.

---

## What Was Implemented

### 1. ✅ Updated Pricing Strategy Documentation

**File:** `docs/PRICING_STRATEGY.md`

**Changes:**
- Complete rewrite with research-backed pricing recommendations
- Added competitive positioning analysis
- Added infrastructure cost model
- Added pricing psychology and conversion strategy
- Added feature differentiation strategy
- Added risk mitigation strategies

**Key Pricing:**
- **Free:** $0 (3 users, 10K contacts, 2GB storage)
- **Starter:** $19/user/month ($15/user annually - 20% discount)
- **Professional:** $49/user/month ($39/user annually - 20% discount) ⭐ Focus Tier
- **Business:** $99/user/month ($79/user annually - 20% discount)
- **Enterprise:** Custom pricing

### 2. ✅ Created SQL Migration

**File:** `database/migrations/004_research_based_pricing.sql`

**What It Does:**
- Updates `plan_pricing` table with research-backed prices
- Updates `plan_limits` table with correct limits (users, contacts, storage)
- Sets feature flags JSON for each tier
- Includes verification queries

**Key Limits:**
- **Free:** 3 users, 10,000 contacts, 2GB storage
- **Starter:** Unlimited users/contacts, 10GB storage
- **Professional:** Unlimited users/contacts, 50GB storage
- **Business:** Unlimited users/contacts, 100GB storage

**Feature Flags Include:**
- API access limits (1K/day free, 10K/day starter, 100K/day pro, unlimited business)
- Automation limits (none free, 1K/month starter, 10K/month pro, unlimited business)
- Gmail sync (starter+)
- SQL access (professional+)
- SSO (professional+)
- Custom objects (business+)
- And many more...

---

## Next Steps

### Step 1: Run Database Migrations

**Order of Operations:**

1. **Run `001_usage_tracking.sql`** (if not already run)
   - Creates `subscriptions`, `usage_metrics`, `plan_limits` tables
   - Creates helper functions

2. **Run `002_plan_pricing.sql`** (if not already run)
   - Creates `plan_pricing` table
   - Fixes RLS policies

3. **Run `004_research_based_pricing.sql`** ⭐ **NEW**
   - Sets prices based on research
   - Updates limits based on research
   - Sets feature flags

**Quick Start (if tables don't exist yet):**
```sql
-- Run in Supabase SQL Editor:
-- 1. database/migrations/001_usage_tracking.sql
-- 2. database/migrations/002_plan_pricing.sql  
-- 3. database/migrations/004_research_based_pricing.sql
```

**Or use the combined setup script:**
```sql
-- Run: database/setup_subscriptions.sql (creates everything)
-- Then run: database/migrations/004_research_based_pricing.sql (sets prices)
```

### Step 2: Verify Pricing

After running migrations, verify prices are set correctly:

```sql
SELECT 
  plan_type,
  display_name,
  price_monthly_cents / 100.0 as monthly_price,
  price_yearly_cents / 100.0 as yearly_price_per_user,
  CASE 
    WHEN price_yearly_cents IS NOT NULL THEN 
      ROUND((price_monthly_cents - price_yearly_cents)::numeric / price_monthly_cents * 100, 1)
    ELSE NULL
  END as annual_discount_pct
FROM plan_pricing
ORDER BY sort_order;
```

**Expected Output:**
```
plan_type    | display_name  | monthly_price | yearly_price_per_user | annual_discount_pct
-------------|---------------|---------------|----------------------|--------------------
free         | Free          | 0.00          | 0.00                  | NULL
starter      | Starter       | 19.00         | 15.00                 | 21.1
professional | Professional  | 49.00         | 39.00                 | 20.4
business     | Business      | 99.00         | 79.00                 | 20.2
enterprise   | Enterprise    | 0.00          | NULL                  | NULL
```

### Step 3: Verify Limits

```sql
SELECT 
  plan_type,
  max_users,
  max_contacts,
  ROUND(max_storage_bytes / 1024.0 / 1024.0 / 1024.0, 2) as storage_gb,
  features->>'api_access' as api_access,
  features->>'gmail_sync' as gmail_sync,
  features->>'automation' as automation,
  features->>'sql_access' as sql_access
FROM plan_limits
ORDER BY plan_type;
```

### Step 4: Initialize Existing Users

If you have existing users, create free tier subscriptions for them:

```sql
INSERT INTO subscriptions (organization_id, plan_type, status)
SELECT 
  id as organization_id,
  'free' as plan_type,
  'active' as status
FROM user_profiles
WHERE id NOT IN (SELECT organization_id FROM subscriptions)
ON CONFLICT (organization_id) DO NOTHING;
```

---

## Feature Flags Reference

The `plan_limits.features` JSONB column contains feature flags for each tier. Here's what each flag means:

### API & Developer Features
- `api_access`: Boolean - Is API access enabled?
- `api_calls_per_day`: Integer or null - Daily API call limit (null = unlimited)
- `webhooks`: Boolean - Webhook support
- `sql_access`: Boolean - Direct SQL/PostgreSQL access
- `realtime_subscriptions`: Boolean - Supabase realtime subscriptions
- `postgresql_access`: Boolean - Full PostgreSQL database access

### Automation
- `automation`: Boolean - Is automation enabled?
- `automation_runs_per_month`: Integer or null - Monthly automation run limit

### Email & Communication
- `gmail_sync`: Boolean - Gmail/Outlook sync
- `email_templates`: Integer or null - Email template limit (null = unlimited)
- `email_sequences`: Boolean - Email sequence support

### CRM Features
- `custom_fields`: Integer or null - Custom field limit (null = unlimited)
- `pipelines`: Integer or null - Pipeline limit (null = unlimited)
- `products_catalog`: Boolean - Products catalog feature
- `custom_reports`: Boolean - Custom reporting
- `dashboards`: Integer or null - Dashboard limit (null = unlimited)
- `data_enrichment`: Boolean - Data enrichment feature
- `account_hierarchies`: Boolean - Account hierarchy support
- `forecasting`: Boolean - Revenue forecasting
- `advanced_analytics`: Boolean - Advanced analytics

### Security & Permissions
- `sso`: Boolean - SSO (SAML) support
- `advanced_permissions`: Boolean - Advanced permission system
- `audit_logs`: Boolean - Audit logging
- `ip_whitelisting`: Boolean - IP whitelisting
- `data_retention_years`: Integer or null - Data retention period

### Enterprise Features
- `custom_objects`: Boolean - Custom object support (Salesforce-style)
- `dedicated_csm`: Boolean - Dedicated customer success manager
- `custom_onboarding`: Boolean - Custom onboarding
- `sla`: Boolean - SLA guarantee
- `white_label`: Boolean - White-label option
- `custom_domain`: Boolean - Custom domain support
- `custom_integrations`: Boolean - Custom integrations
- `custom_development`: Boolean - Custom development support

### Storage & Backup
- `file_versioning`: Boolean - File versioning
- `automated_backups`: Boolean - Automated backups
- `offline_mobile`: Boolean - Offline mobile mode

### Support
- `support_level`: String - "community", "email", "priority", or "dedicated"

---

## Code Integration

### Reading Feature Flags

The feature flags are stored in `plan_limits.features` JSONB column. Your code should read these flags to gate features:

```typescript
// Example: Check if user has API access
const planLimits = await getPlanLimits(planType);
const hasApiAccess = planLimits?.features?.api_access === true;
const apiCallLimit = planLimits?.features?.api_calls_per_day || null;

// Example: Check if user has Gmail sync
const hasGmailSync = planLimits?.features?.gmail_sync === true;

// Example: Check automation limit
const automationLimit = planLimits?.features?.automation_runs_per_month || null;
```

### Updating Usage Tracking

Make sure your usage tracking respects the new limits:

```typescript
// Free tier: 10,000 contacts max
if (planType === 'free' && contactsCount >= 10000) {
  showUpgradePrompt('contacts');
}

// Free tier: 3 users max
if (planType === 'free' && usersCount >= 3) {
  showUpgradePrompt('users');
}

// Free tier: 2GB storage max
if (planType === 'free' && storageBytes >= 2 * 1024 * 1024 * 1024) {
  showUpgradePrompt('storage');
}
```

---

## Competitive Advantages Implemented

### 🚀 Unique Differentiators

1. **API Access in Free Tier** - HubSpot and Monday paywall this
2. **50 Custom Fields in Free** - HubSpot only offers 10
3. **3 Users in Free** - Most competitors offer 2
4. **10K Contacts in Free** - More generous than most (250-5K typical)
5. **SQL/PostgreSQL Access** (Professional+) - No competitor offers this
6. **Realtime Subscriptions** (Professional+) - Unique Supabase advantage
7. **TypeScript SDK** (All tiers) - Modern developer experience

### Competitive Pricing

- **Starter at $19:** Matches Pipedrive ($14), Zoho ($14), Folk ($20)
- **Professional at $49:** Matches Pipedrive Pro ($49), median mid-tier
- **Business at $99:** Competitive with Insightly Enterprise ($99)
- **20-40% cheaper** than Salesforce/HubSpot at equivalent tiers

---

## Testing Checklist

After running migrations, test:

- [ ] Prices display correctly in UI
- [ ] Free tier limits enforced (3 users, 10K contacts, 2GB storage)
- [ ] Starter tier features work (Gmail sync, automation, etc.)
- [ ] Professional tier features work (SQL access, SSO, etc.)
- [ ] Business tier features work (custom objects, SLA, etc.)
- [ ] Upgrade prompts show at correct limits
- [ ] Feature flags are read correctly from database
- [ ] Annual pricing displays correctly (20% discount)

---

## Support & Troubleshooting

### Prices Not Updating?

1. Check migration ran successfully:
   ```sql
   SELECT * FROM plan_pricing ORDER BY sort_order;
   ```

2. Verify RLS policies allow updates:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'plan_pricing';
   ```

### Limits Not Working?

1. Check `plan_limits` table:
   ```sql
   SELECT * FROM plan_limits WHERE plan_type = 'free';
   ```

2. Verify feature flags JSON is valid:
   ```sql
   SELECT plan_type, features FROM plan_limits;
   ```

### Feature Flags Not Reading?

1. Check your code is reading from `plan_limits.features`
2. Verify JSONB path is correct (e.g., `features->>'api_access'`)
3. Check plan type is being passed correctly

---

## Related Files

- `docs/PRICING_STRATEGY.md` - Complete pricing strategy documentation
- `docs/PERPLEXITY_RESEARCH_PROMPT.md` - Full research findings
- `database/migrations/004_research_based_pricing.sql` - Pricing migration
- `database/setup_subscriptions.sql` - Complete setup script
- `src/lib/usage-tracking.ts` - Usage tracking library
- `src/lib/pricing.ts` - Pricing library

---

## Summary

✅ **Pricing Strategy:** Updated with research-backed recommendations  
✅ **SQL Migration:** Created to set prices and limits  
✅ **Feature Flags:** Structured JSON for all tiers  
⏳ **Next:** Run migrations in Supabase SQL Editor  
⏳ **Then:** Update code to read feature flags and enforce limits

**Status:** Ready for database migration. After running migrations, verify prices and limits, then update code to use feature flags.
