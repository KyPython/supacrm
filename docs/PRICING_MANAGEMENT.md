# Pricing Management Guide

## ⚠️ CRITICAL: Never Hardcode Prices

**All pricing MUST come from Supabase.** The application code should NEVER contain hardcoded prices. This allows you to:

- Update prices instantly without code deployments
- A/B test different price points
- Run promotions and discounts
- Adjust pricing based on market conditions
- Support multiple currencies

---

## Database Schema

Pricing is stored in the `plan_pricing` table in Supabase:

```sql
CREATE TABLE plan_pricing (
  plan_type TEXT PRIMARY KEY,
  price_monthly_cents INTEGER NOT NULL,  -- Price in cents (e.g., 2900 = $29.00)
  price_yearly_cents INTEGER,            -- Annual price in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  display_name TEXT NOT NULL,            -- e.g., "Professional"
  description TEXT,
  stripe_price_id_monthly TEXT,          -- Stripe Price ID for monthly billing
  stripe_price_id_yearly TEXT,            -- Stripe Price ID for yearly billing
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## How to Update Prices

### Option 1: Via Supabase Dashboard (Recommended for Quick Updates)

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → `plan_pricing`
3. Click on the row for the plan you want to update
4. Edit the `price_monthly_cents` or `price_yearly_cents` fields
5. Click **Save**
6. Changes are live immediately (app refreshes pricing every 5 minutes)

**Example:**
- To set Professional plan to $29/month: Set `price_monthly_cents` to `2900`
- To set Professional plan to $290/year: Set `price_yearly_cents` to `29000`

### Option 2: Via SQL (For Bulk Updates)

```sql
-- Update Professional plan pricing
UPDATE plan_pricing
SET 
  price_monthly_cents = 2900,  -- $29.00/month
  price_yearly_cents = 29000,  -- $290.00/year (save 17%)
  updated_at = NOW()
WHERE plan_type = 'professional';

-- Update Business plan pricing
UPDATE plan_pricing
SET 
  price_monthly_cents = 9900,  -- $99.00/month
  price_yearly_cents = 99000,  -- $990.00/year
  updated_at = NOW()
WHERE plan_type = 'business';

-- Disable a plan (without deleting)
UPDATE plan_pricing
SET is_active = false
WHERE plan_type = 'starter';
```

### Option 3: Via Admin API (For Programmatic Updates)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
);

// Update pricing
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

## Price Format

**Always store prices in cents (smallest currency unit):**

- `$0.00` = `0` cents
- `$9.99` = `999` cents
- `$29.00` = `2900` cents
- `$99.00` = `9900` cents
- `$290.00` = `29000` cents

**Why cents?**
- Avoids floating-point precision issues
- Works with Stripe (which uses cents)
- Easier to calculate discounts and taxes

---

## How the App Fetches Pricing

The app uses these functions to fetch pricing:

1. **`getPlanPricing(planType)`** - Get pricing for a specific plan
2. **`getAllPlanPricing()`** - Get pricing for all active plans
3. **`getNextPlanPricing(currentPlan)`** - Get pricing for the next upgrade tier

**React Hooks:**
- **`usePricing()`** - Hook to get all pricing data
- **`usePlanPricing(planType)`** - Hook to get pricing for a specific plan

**Example Usage:**

```typescript
import { usePricing } from '@/hooks/usePricing';

function PricingPage() {
  const { allPricing, loading } = usePricing();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {allPricing.map((plan) => (
        <div key={plan.plan_type}>
          <h3>{plan.display_name}</h3>
          <p>{plan.price_monthly_formatted}/month</p>
          {plan.price_yearly_formatted && (
            <p>{plan.price_yearly_formatted}/year</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Stripe Integration

When setting up Stripe:

1. Create Price objects in Stripe for each plan
2. Copy the Stripe Price IDs
3. Update `plan_pricing` table with the Stripe Price IDs:

```sql
UPDATE plan_pricing
SET 
  stripe_price_id_monthly = 'price_1234567890',
  stripe_price_id_yearly = 'price_0987654321'
WHERE plan_type = 'professional';
```

The app will use these IDs when creating subscriptions via Stripe.

---

## Testing Price Changes

1. **Update price in Supabase** (via dashboard or SQL)
2. **Wait up to 5 minutes** (app caches pricing for 5 minutes)
3. **Or refresh the page** to see changes immediately
4. **Check upgrade prompts** - they should show new prices
5. **Check billing page** - should display updated pricing

---

## Common Pricing Scenarios

### Scenario 1: Launch Promotion (50% off)

```sql
-- Set Professional to $14.50/month (50% off $29)
UPDATE plan_pricing
SET 
  price_monthly_cents = 1450,
  updated_at = NOW()
WHERE plan_type = 'professional';
```

### Scenario 2: Annual Discount

```sql
-- Set Professional: $29/month or $290/year (save 17%)
UPDATE plan_pricing
SET 
  price_monthly_cents = 2900,
  price_yearly_cents = 29000,  -- $290 = 17% discount
  updated_at = NOW()
WHERE plan_type = 'professional';
```

### Scenario 3: Price Increase

```sql
-- Increase Business plan from $99 to $149/month
UPDATE plan_pricing
SET 
  price_monthly_cents = 14900,
  price_yearly_cents = 149000,
  updated_at = NOW()
WHERE plan_type = 'business';
```

### Scenario 4: Disable a Plan

```sql
-- Hide Starter plan from pricing page
UPDATE plan_pricing
SET is_active = false
WHERE plan_type = 'starter';
```

---

## Best Practices

1. **Always update `updated_at`** when changing prices (for audit trail)
2. **Test price changes** in staging before production
3. **Notify existing customers** before price increases
4. **Use Stripe Price IDs** for seamless billing integration
5. **Keep prices in cents** to avoid rounding errors
6. **Document price changes** in your changelog or admin notes

---

## Monitoring Price Changes

To track price changes over time, you can:

1. **Add a price_history table** (optional):
```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL,
  price_monthly_cents INTEGER NOT NULL,
  price_yearly_cents INTEGER,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by TEXT -- admin user ID or email
);
```

2. **Create a trigger** to log changes:
```sql
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price_monthly_cents != NEW.price_monthly_cents OR 
     OLD.price_yearly_cents != NEW.price_yearly_cents THEN
    INSERT INTO price_history (plan_type, price_monthly_cents, price_yearly_cents)
    VALUES (NEW.plan_type, NEW.price_monthly_cents, NEW.price_yearly_cents);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_change_trigger
  AFTER UPDATE ON plan_pricing
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();
```

---

## Troubleshooting

### Prices not updating in app?

1. **Check Supabase** - Verify prices are updated in the database
2. **Clear cache** - Refresh the page (app caches for 5 minutes)
3. **Check RLS policies** - Ensure `plan_pricing` table is readable
4. **Check console** - Look for errors fetching pricing

### Prices showing as $0.00?

- Check that `price_monthly_cents` is set (not NULL)
- Verify the value is in cents (e.g., 2900 for $29.00)
- Check currency formatting in `formatPricing()` function

### Stripe integration not working?

- Verify `stripe_price_id_monthly` and `stripe_price_id_yearly` are set
- Check that Price IDs exist in Stripe dashboard
- Ensure Price IDs match the correct plan type

---

## Migration Checklist

When setting up pricing for the first time:

- [ ] Run migration `002_plan_pricing.sql` to create the table
- [ ] Insert initial pricing data (via SQL or dashboard)
- [ ] Verify prices display correctly in the app
- [ ] Set up Stripe Price objects
- [ ] Update `stripe_price_id_*` fields in Supabase
- [ ] Test upgrade flow with real prices
- [ ] Document your pricing strategy

---

**Remember:** Prices live in Supabase, not in code. Update them there, and the app will automatically use the new prices!
