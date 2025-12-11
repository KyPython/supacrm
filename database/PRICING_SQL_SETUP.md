# Pricing SQL Setup Guide

## Overview

This guide explains how to set up the complete pricing system in your Supabase database. All pricing is stored in the database and fetched dynamically by the app - **never hardcoded**.

---

## Files Overview

1. **`001_usage_tracking.sql`** - Creates subscriptions, usage_metrics, and plan_limits tables
2. **`002_plan_pricing.sql`** - Creates plan_pricing table and pricing functions
3. **`complete_pricing_setup.sql`** - Example queries to set prices and initialize data

---

## Setup Order

### Step 1: Run Migration 001 (Usage Tracking)

```sql
-- Run this first: database/migrations/001_usage_tracking.sql
```

This creates:
- `subscriptions` table
- `usage_metrics` table  
- `plan_limits` table
- Helper functions for usage tracking

**Note:** The RLS policies in this migration reference `user_organizations` table which doesn't exist in your schema. The `002_plan_pricing.sql` migration fixes these policies to work with `user_profiles` directly.

### Step 2: Run Migration 002 (Pricing)

```sql
-- Run this second: database/migrations/002_plan_pricing.sql
```

This creates:
- `plan_pricing` table
- Pricing helper functions
- Fixed RLS policies for subscriptions/usage_metrics
- `plan_details` view (combines pricing + limits)

### Step 3: Set Your Prices

```sql
-- Run this third: database/complete_pricing_setup.sql (Step 1)
-- Or update prices manually via Supabase dashboard
```

Update the prices in the `plan_pricing` table. The example SQL shows how, but you can also:
- Use Supabase Dashboard → Table Editor → `plan_pricing`
- Update prices directly via SQL

**Important:** Prices are stored in **cents**:
- $19.00 = 1900 cents
- $29.00 = 2900 cents
- $99.00 = 9900 cents

### Step 4: Initialize Existing Users (Optional)

```sql
-- Run this if you have existing users: database/complete_pricing_setup.sql (Step 4-5)
```

This creates:
- Free tier subscriptions for existing users
- Initial usage metrics based on existing data

---

## Quick Start (Copy-Paste Ready)

Run these in order in your Supabase SQL Editor:

### 1. Create Pricing Table

```sql
-- Copy contents of: database/migrations/002_plan_pricing.sql
```

### 2. Set Your Prices

```sql
-- Free Plan
UPDATE plan_pricing SET price_monthly_cents = 0, price_yearly_cents = 0 WHERE plan_type = 'free';

-- Starter Plan (example: $19/month)
UPDATE plan_pricing SET price_monthly_cents = 1900, price_yearly_cents = 19000 WHERE plan_type = 'starter';

-- Professional Plan (example: $29/month)
UPDATE plan_pricing SET price_monthly_cents = 2900, price_yearly_cents = 29000 WHERE plan_type = 'professional';

-- Business Plan (example: $99/month)
UPDATE plan_pricing SET price_monthly_cents = 9900, price_yearly_cents = 99000 WHERE plan_type = 'business';

-- Enterprise Plan (custom pricing)
UPDATE plan_pricing SET price_monthly_cents = 0, price_yearly_cents = NULL WHERE plan_type = 'enterprise';
```

### 3. Verify Prices

```sql
SELECT 
  plan_type,
  display_name,
  price_monthly_cents / 100.0 as price_monthly,
  price_yearly_cents / 100.0 as price_yearly,
  is_active
FROM plan_pricing
ORDER BY sort_order;
```

---

## Key Tables

### `plan_pricing`
Stores pricing for each plan. **This is the single source of truth for prices.**

```sql
SELECT * FROM plan_pricing WHERE is_active = true ORDER BY sort_order;
```

### `plan_limits`
Stores feature limits for each plan (users, contacts, storage, etc.)

```sql
SELECT * FROM plan_limits ORDER BY plan_type;
```

### `plan_details` (View)
Combines pricing + limits for easy display:

```sql
SELECT * FROM plan_details ORDER BY sort_order;
```

### `subscriptions`
Tracks which plan each user/organization has:

```sql
SELECT * FROM subscriptions WHERE status = 'active';
```

### `usage_metrics`
Tracks current usage (contacts, companies, deals, storage):

```sql
SELECT * FROM usage_metrics 
WHERE period_start = DATE_TRUNC('month', NOW());
```

---

## Important Notes

### Organization ID = User ID

Your current setup uses `user_id` as `organization_id` for single-user organizations. The RLS policies in `002_plan_pricing.sql` reflect this:

```sql
-- Users can read their own subscription
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (organization_id = auth.uid());
```

If you later add multi-tenant organizations, you'll need to:
1. Create an `organizations` table
2. Create a `user_organizations` join table
3. Update RLS policies to use the join table

### RLS Policy Fixes

The `002_plan_pricing.sql` migration fixes RLS policies that referenced non-existent `user_organizations` table:

- ✅ Drops old policies
- ✅ Creates new policies using `auth.uid()` directly
- ✅ Allows service role to manage all subscriptions (for Stripe webhooks)

---

## Updating Prices

### Via Supabase Dashboard (Easiest)

1. Go to **Table Editor** → `plan_pricing`
2. Click on the plan row you want to update
3. Edit `price_monthly_cents` (in cents: 2900 = $29.00)
4. Edit `price_yearly_cents` (in cents: 29000 = $290.00)
5. Click **Save**
6. App will pick up changes within 5 minutes (or on page refresh)

### Via SQL

```sql
UPDATE plan_pricing
SET 
  price_monthly_cents = 2900,  -- $29.00
  price_yearly_cents = 29000,  -- $290.00
  updated_at = NOW()
WHERE plan_type = 'professional';
```

### Via Admin API

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

await supabaseAdmin
  .from('plan_pricing')
  .update({
    price_monthly_cents: 2900,
    price_yearly_cents: 29000,
    updated_at: new Date().toISOString(),
  })
  .eq('plan_type', 'professional');
```

---

## Stripe Integration

After creating Price objects in Stripe:

1. Copy the Stripe Price IDs
2. Update `plan_pricing` table:

```sql
UPDATE plan_pricing
SET 
  stripe_price_id_monthly = 'price_1234567890',
  stripe_price_id_yearly = 'price_0987654321',
  updated_at = NOW()
WHERE plan_type = 'professional';
```

---

## Monitoring Queries

### View All Plan Details

```sql
SELECT * FROM plan_details ORDER BY sort_order;
```

### View User Subscriptions with Pricing

```sql
SELECT 
  s.organization_id,
  up.email,
  s.plan_type,
  pp.display_name,
  pp.price_monthly_cents / 100.0 as monthly_price,
  s.status
FROM subscriptions s
JOIN user_profiles up ON s.organization_id = up.id
LEFT JOIN plan_pricing pp ON s.plan_type = pp.plan_type
WHERE s.status = 'active';
```

### Check Usage vs Limits

```sql
SELECT 
  um.organization_id,
  up.email,
  s.plan_type,
  um.metric_type,
  um.count as usage,
  CASE 
    WHEN um.metric_type = 'contacts' THEN pl.max_contacts
    WHEN um.metric_type = 'companies' THEN pl.max_companies
    WHEN um.metric_type = 'deals' THEN pl.max_deals
    WHEN um.metric_type = 'storage_bytes' THEN pl.max_storage_bytes
    WHEN um.metric_type = 'users' THEN pl.max_users
  END as limit
FROM usage_metrics um
JOIN user_profiles up ON um.organization_id = up.id
LEFT JOIN subscriptions s ON um.organization_id = s.organization_id AND s.status = 'active'
LEFT JOIN plan_limits pl ON COALESCE(s.plan_type, 'free') = pl.plan_type
WHERE um.period_start = DATE_TRUNC('month', NOW());
```

---

## Troubleshooting

### Prices showing as $0.00?

- Check that `price_monthly_cents` is set (not 0 or NULL)
- Verify you updated prices after running migration
- Check `is_active = true` in the query

### RLS Policy Errors?

- Make sure you ran `002_plan_pricing.sql` (it fixes the policies)
- Verify `auth.uid()` is available (user must be authenticated)
- Check that policies reference correct table names

### Usage metrics not updating?

- Verify `increment_usage()` and `decrement_usage()` functions exist
- Check that RLS policies allow inserts/updates
- Ensure `organization_id` matches `user_id` for single-user orgs

---

## Next Steps

1. ✅ Run migrations 001 and 002
2. ✅ Set your actual prices
3. ✅ Initialize existing users (if any)
4. ✅ Test pricing display in app
5. ✅ Set up Stripe Price objects
6. ✅ Update Stripe Price IDs in database
7. ✅ Test upgrade flow

---

## Support

- See `docs/PRICING_MANAGEMENT.md` for detailed pricing management guide
- See `docs/NO_HARDCODED_PRICES.md` for policy on never hardcoding prices
- Check `src/lib/pricing.ts` for TypeScript functions to fetch pricing
