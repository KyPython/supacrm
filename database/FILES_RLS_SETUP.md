# Files Table RLS Setup

## Issue
File uploads were failing with error: "new row violates row-level security policy"

## Root Cause
1. The `files` table had no RLS policies enabled
2. File upload code was missing the `uploaded_by` field (required by RLS policies)
3. Some upload code was using incorrect field names (`path`/`size` instead of `file_path`/`file_size`)

## Solution

### Step 1: Run the RLS Migration

Run the SQL migration file in your Supabase SQL Editor:

```sql
-- File: database/migrations/003_files_rls.sql
```

This migration:
- Enables RLS on the `files` table
- Creates policies allowing users to:
  - View files they uploaded
  - View files associated with their contacts/companies/deals/tasks
  - Insert files (with `uploaded_by` set to their user ID)
  - Update/delete files they uploaded

### Step 2: Code Changes Applied

The following files have been updated to include `uploaded_by`:

1. **`src/app/page.tsx`** - Dashboard file upload
2. **`src/app/home/page.tsx`** - Home page file upload  
3. **`src/app/files/page.tsx`** - Files page upload (now also inserts metadata)

### Step 3: Verify

After running the migration:

1. Try uploading a file from the Files page
2. Check that the file appears in the `files` table with `uploaded_by` set correctly
3. Verify that users can only see their own files

## RLS Policy Details

The policies ensure:
- **Security**: Users can only access files they uploaded or files associated with their entities
- **Isolation**: Each user's files are isolated from other users
- **Compliance**: Better for GDPR/privacy requirements

## Troubleshooting

If uploads still fail:

1. **Check RLS is enabled**: 
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'files';
   ```
   Should show `rowsecurity = true`

2. **Verify policies exist**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'files';
   ```
   Should show 5 policies

3. **Check user authentication**: Ensure `auth.uid()` returns a valid UUID when uploading

4. **Verify `uploaded_by` field**: Check that the insert includes `uploaded_by: user.id`

## Next Steps

- Consider adding storage usage tracking for file uploads
- Implement file size limits based on plan tier
- Add file deletion functionality with proper RLS checks
