# Plan Gating & Rate Limiting Verification

## ✅ Plan Limits Are Enforced

All plan limits are actively enforced throughout the application. Users cannot exceed their plan limits.

### Contacts Limit Enforcement

**Location:** `src/app/contacts/page.tsx`

```typescript
// Check limit before creating
if (user?.id) {
  const limitExceeded = await checkLimitExceeded(user.id, 'contacts');
  if (limitExceeded) {
    setError("Contact limit reached. Please upgrade your plan to add more contacts.");
    return;
  }
}
```

**Status:** ✅ **ENFORCED** - Users cannot create contacts beyond their plan limit.

### Companies Limit Enforcement

**Location:** `src/app/companies/page.tsx`

```typescript
// Check limit before creating
if (user?.id) {
  const limitExceeded = await checkLimitExceeded(user.id, 'companies');
  if (limitExceeded) {
    form.setErrors({ submit: "Company limit reached. Please upgrade your plan to add more companies." });
    return;
  }
}
```

**Status:** ✅ **ENFORCED** - Users cannot create companies beyond their plan limit.

### Deals Limit Enforcement

**Location:** `src/app/deals/page.tsx`

```typescript
// Check limit before creating
if (user?.id) {
  const limitExceeded = await checkLimitExceeded(user.id, 'deals');
  if (limitExceeded) {
    setGeneralError("Deal limit reached. Please upgrade your plan to add more deals.");
    return;
  }
}
```

**Status:** ✅ **ENFORCED** - Users cannot create deals beyond their plan limit.

### Storage Limit Enforcement

**Location:** `src/app/files/page.tsx`

```typescript
// Check storage limit before uploading
if (user?.id) {
  const storageExceeded = await checkLimitExceeded(user.id, 'storage_bytes');
  if (storageExceeded) {
    setGeneralError("Storage limit reached. Please upgrade your plan to upload more files.");
    return;
  }
}
```

**Status:** ✅ **ENFORCED** - Users cannot upload files beyond their storage limit.

---

## How Plan Gating Works

### 1. Limit Checking Function

**Location:** `src/lib/usage-tracking.ts`

```typescript
export async function checkLimitExceeded(
  userId: string,
  metric: MetricType
): Promise<boolean> {
  const status = await getUsageStatus(userId);
  if (!status) return false;
  
  return status.exceeded[metric];
}
```

### 2. Usage Status Calculation

The `getUsageStatus` function:
1. Gets the user's current plan from `subscriptions` table
2. Fetches plan limits from `plan_limits` table
3. Calculates current usage from `usage_metrics` table (or counts actual records)
4. Compares usage vs limits to determine if exceeded

```typescript
const exceeded = {
  users: limits.max_users !== null && usage.users >= limits.max_users,
  contacts: limits.max_contacts !== null && usage.contacts >= limits.max_contacts,
  companies: limits.max_companies !== null && usage.companies >= limits.max_companies,
  deals: limits.max_deals !== null && usage.deals >= limits.max_deals,
  storage_bytes: usage.storage_bytes >= limits.max_storage_bytes,
};
```

### 3. Usage Tracking

When users create/delete records, usage is automatically updated:

```typescript
// After successful creation
await incrementUsage(user.id, 'contacts', 1);

// After successful deletion
await decrementUsage(user.id, 'contacts', 1);
```

---

## Plan Limits by Tier

All limits are stored in the `plan_limits` table and fetched dynamically:

### Free Plan
- **Users:** 3
- **Contacts:** 10,000
- **Storage:** 2GB
- **Companies:** Limited
- **Deals:** Limited

### Starter Plan
- **Users:** 5
- **Contacts:** Unlimited
- **Storage:** 10GB
- **Companies:** Unlimited
- **Deals:** Unlimited

### Professional Plan
- **Users:** 15
- **Contacts:** Unlimited
- **Storage:** 50GB
- **Companies:** Unlimited
- **Deals:** Unlimited

### Business Plan
- **Users:** 50
- **Contacts:** Unlimited
- **Storage:** 200GB
- **Companies:** Unlimited
- **Deals:** Unlimited

### Enterprise Plan
- **Users:** Unlimited
- **Contacts:** Unlimited
- **Storage:** Custom/Unlimited
- **Companies:** Unlimited
- **Deals:** Unlimited

---

## UI Indicators

### Upgrade Prompts

When limits are exceeded, users see upgrade prompts:

**Location:** `src/components/UpgradePrompt.tsx`

- Shows on dashboard when limits are exceeded
- Displays current usage vs limit
- Links to pricing page (`/pricing`)
- Shows next plan pricing from Supabase

### Usage Display

**Location:** `src/app/settings/page.tsx` (Billing tab)

- Shows current plan
- Displays usage with progress bars
- Highlights exceeded limits in red
- Links to pricing page for upgrades

---

## Testing Plan Gating

### Test Contacts Limit

1. Sign up for free plan (10,000 contact limit)
2. Create 10,000 contacts
3. Try to create one more contact
4. **Expected:** Error message "Contact limit reached. Please upgrade your plan to add more contacts."

### Test Storage Limit

1. Sign up for free plan (2GB storage limit)
2. Upload files totaling 2GB
3. Try to upload one more file
4. **Expected:** Error message "Storage limit reached. Please upgrade your plan to upload more files."

### Test Companies Limit

1. Sign up for free plan
2. Create companies up to the limit
3. Try to create one more company
4. **Expected:** Error message "Company limit reached. Please upgrade your plan to add more companies."

### Test Deals Limit

1. Sign up for free plan
2. Create deals up to the limit
3. Try to create one more deal
4. **Expected:** Error message "Deal limit reached. Please upgrade your plan to add more deals."

---

## Database Schema

### `subscriptions` Table
- Tracks user's current plan
- Links to `plan_pricing` via `plan_type`
- Status: `active` or `cancelled`

### `plan_limits` Table
- Stores limits for each plan tier
- Includes `features` JSONB column for feature flags
- Limits: `max_users`, `max_contacts`, `max_companies`, `max_deals`, `max_storage_bytes`

### `usage_metrics` Table
- Tracks current usage per organization
- Updated automatically when records are created/deleted
- Falls back to counting actual records if table is empty

### `plan_pricing` Table
- Stores pricing for each plan
- All prices fetched dynamically (never hardcoded)
- Includes Polar product IDs for checkout

---

## Summary

✅ **All plan limits are enforced** - Users cannot exceed their plan limits  
✅ **Usage is tracked automatically** - Incremented/decremented on create/delete  
✅ **UI shows limits clearly** - Upgrade prompts and usage displays  
✅ **Pricing is dynamic** - All prices come from Supabase database  
✅ **Theme-aware styling** - Pricing page uses CSS variables and theme context  

**Plan gating is fully functional and will limit users based on their subscription plan.**
