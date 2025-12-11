# Subscriptions Table Setup - Fix 404 Error

## Problem
Getting a 404 error when querying the `subscriptions` table:
```
GET .../rest/v1/subscriptions?select=plan_type&organization_id=eq.xxx&status=eq.active 404 (Not Found)
```

## Root Cause
The `subscriptions` table doesn't exist in your Supabase database. The migration files exist but haven't been run.

## Solution

### Quick Fix (Recommended)

Run the complete setup script in your Supabase SQL Editor:

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Copy and paste** the contents of `database/setup_subscriptions.sql`
3. **Click "Run"** to execute the script

This will:
- ✅ Create the `subscriptions` table
- ✅ Create the `usage_metrics` table
- ✅ Create the `plan_limits` table
- ✅ Create the `plan_pricing` table
- ✅ Set up proper RLS policies
- ✅ Create indexes for performance
- ✅ Initialize default data
- ✅ Create helper functions
- ✅ Initialize subscriptions for existing users

### Alternative: Run Migrations in Order

If you prefer to run the original migrations:

1. **Run Migration 001**: `database/migrations/001_usage_tracking.sql`
2. **Run Migration 002**: `database/migrations/002_plan_pricing.sql`

**Note:** Migration 002 fixes the RLS policies from migration 001, so you need both.

## Verification

After running the setup script, verify everything works:

### 1. Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscriptions', 'usage_metrics', 'plan_limits', 'plan_pricing');
```

Should return 4 rows.

### 2. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscriptions', 'usage_metrics', 'plan_limits', 'plan_pricing');
```

All should show `rowsecurity = true`.

### 3. Check Policies Exist
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'usage_metrics', 'plan_limits', 'plan_pricing');
```

Should show multiple policies for each table.

### 4. Test Query (as authenticated user)
```sql
SELECT * FROM subscriptions WHERE organization_id = auth.uid();
```

Should return your subscription (or empty if you don't have one yet).

### 5. Initialize Your Subscription
If you don't have a subscription yet, create one:

```sql
INSERT INTO subscriptions (organization_id, plan_type, status)
VALUES (auth.uid(), 'free', 'active')
ON CONFLICT (organization_id) DO NOTHING;
```

## Troubleshooting

### Still Getting 404?

1. **Check table exists:**
   ```sql
   SELECT * FROM subscriptions LIMIT 1;
   ```
   If this fails, the table wasn't created. Re-run the setup script.

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'subscriptions';
   ```
   Should show at least 3 policies (SELECT, INSERT, UPDATE).

3. **Check you're authenticated:**
   ```sql
   SELECT auth.uid();
   ```
   Should return your user ID. If NULL, you're not authenticated.

4. **Check organization_id matches:**
   The code uses `user.id` as `organization_id`. Make sure:
   ```sql
   SELECT id FROM user_profiles WHERE id = auth.uid();
   ```
   Returns a row.

### RLS Policy Errors?

If you get permission errors, check:
- RLS is enabled: `ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;`
- Policies exist: See verification step 3 above
- You're authenticated: `SELECT auth.uid();` should not be NULL

### Empty Results?

If queries return empty but no error:
- You might not have a subscription yet. Run the initialization query in step 5 above.
- Check that `organization_id` matches your `user.id`:
  ```sql
  SELECT * FROM subscriptions WHERE organization_id = auth.uid();
  ```

## Next Steps

After fixing the 404 error:

1. ✅ Verify file uploads work (see `database/FILES_RLS_SETUP.md`)
2. ✅ Set your actual prices in `plan_pricing` table
3. ✅ Test usage tracking is working
4. ✅ Verify upgrade prompts appear when limits are exceeded

## Related Files

- `database/setup_subscriptions.sql` - Complete setup script (use this!)
- `database/migrations/001_usage_tracking.sql` - Original migration
- `database/migrations/002_plan_pricing.sql` - Pricing migration
- `src/lib/usage-tracking.ts` - Code that queries subscriptions table
- `database/PRICING_SQL_SETUP.md` - Detailed pricing setup guide
