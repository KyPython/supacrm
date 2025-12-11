# ⚠️ CRITICAL: No Hardcoded Prices Policy

## Rule: NEVER Hardcode Prices in Application Code

**All pricing MUST come from Supabase.** The application code should NEVER contain hardcoded prices, price calculations, or pricing logic.

---

## Why?

1. **Real-time Updates** - Change prices instantly without code deployments
2. **A/B Testing** - Test different price points easily
3. **Promotions** - Run sales and discounts without code changes
4. **Market Responsiveness** - Adjust pricing based on market conditions
5. **Multi-currency** - Support different currencies per region
6. **Stripe Integration** - Sync with Stripe Price objects seamlessly

---

## What NOT to Do ❌

```typescript
// ❌ BAD - Hardcoded price
const PROFESSIONAL_PRICE = 29;

// ❌ BAD - Hardcoded price in component
<h3>Professional Plan - $29/month</h3>

// ❌ BAD - Hardcoded price calculation
const annualPrice = monthlyPrice * 12 * 0.83; // 17% discount

// ❌ BAD - Hardcoded price comparison
if (plan === 'professional' && price < 29) { ... }
```

---

## What TO Do ✅

```typescript
// ✅ GOOD - Fetch from Supabase
import { usePricing } from '@/hooks/usePricing';

function PricingPage() {
  const { allPricing } = usePricing();
  
  return (
    <div>
      {allPricing.map((plan) => (
        <h3>{plan.display_name} - {plan.price_monthly_formatted}/month</h3>
      ))}
    </div>
  );
}

// ✅ GOOD - Use pricing library functions
import { getPlanPricing, formatPricing } from '@/lib/pricing';

const pricing = await getPlanPricing('professional');
const formatted = formatPricing(pricing);
console.log(formatted.price_monthly_formatted); // "$29.00"
```

---

## Where Prices Live

**Database:** `plan_pricing` table in Supabase

**Code:**
- `src/lib/pricing.ts` - Functions to fetch pricing from Supabase
- `src/hooks/usePricing.ts` - React hooks for pricing data
- `database/migrations/002_plan_pricing.sql` - Database schema

**Documentation:**
- `docs/PRICING_MANAGEMENT.md` - How to update prices
- `docs/NO_HARDCODED_PRICES.md` - This file (policy)

---

## Code Review Checklist

When reviewing code, check for:

- [ ] No hardcoded dollar amounts (`$29`, `29`, `2900`)
- [ ] No price calculations in code (discounts, annual pricing)
- [ ] All prices fetched from `usePricing()` or `getPlanPricing()`
- [ ] Pricing display uses `price_monthly_formatted` or `price_yearly_formatted`
- [ ] No price comparisons using hardcoded values
- [ ] Upgrade prompts fetch next plan pricing dynamically

---

## How to Update Prices

See `docs/PRICING_MANAGEMENT.md` for detailed instructions.

**Quick version:**
1. Go to Supabase Dashboard → Table Editor → `plan_pricing`
2. Edit the `price_monthly_cents` field (in cents: 2900 = $29.00)
3. Save
4. App will pick up changes within 5 minutes (or on page refresh)

---

## Testing

When testing pricing:

1. **Update price in Supabase** (e.g., set Professional to $19/month)
2. **Refresh the app** (or wait 5 minutes for cache refresh)
3. **Verify** prices display correctly
4. **Test upgrade flow** - should show new prices
5. **Revert** price back to original when done testing

---

## Enforcement

This is a **hard requirement**. Code that hardcodes prices will be rejected in code review.

**If you see hardcoded prices:**
1. Report it immediately
2. Refactor to use Supabase pricing
3. Update this document if you find edge cases

---

## Questions?

- **How do I display prices?** Use `usePricing()` hook or `getPlanPricing()` function
- **How do I update prices?** See `docs/PRICING_MANAGEMENT.md`
- **What if I need a temporary price?** Update it in Supabase, test, then revert
- **Can I calculate discounts?** Yes, but use prices from Supabase as the base

---

**Remember:** Prices in Supabase = Single source of truth. Code fetches = Always up-to-date.
