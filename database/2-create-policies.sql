-- ========================================
-- PART 2: CREATE RLS POLICIES
-- ========================================
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- Run AFTER 1-enable-rls.sql completes successfully

-- ========================================
-- ACTIVITY_LOGS - Users see their own activity
-- ========================================

CREATE POLICY "Users can view own activity logs"
ON activity_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
ON activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- COMPANIES - Users see companies they created
-- ========================================

CREATE POLICY "Users can view own companies"
ON companies FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own companies"
ON companies FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own companies"
ON companies FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own companies"
ON companies FOR DELETE
USING (auth.uid() = created_by);

-- ========================================
-- CONTACTS - Users see contacts they created
-- ========================================

CREATE POLICY "Users can view own contacts"
ON contacts FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own contacts"
ON contacts FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own contacts"
ON contacts FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own contacts"
ON contacts FOR DELETE
USING (auth.uid() = created_by);

-- ========================================
-- DEALS - Users see deals they created or are assigned to
-- ========================================

CREATE POLICY "Users can view own or assigned deals"
ON deals FOR SELECT
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can insert own deals"
ON deals FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own or assigned deals"
ON deals FOR UPDATE
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete own deals"
ON deals FOR DELETE
USING (auth.uid() = created_by);

-- ========================================
-- FILES - Users see files they uploaded
-- ========================================

CREATE POLICY "Users can view own files"
ON files FOR SELECT
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert own files"
ON files FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own files"
ON files FOR UPDATE
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own files"
ON files FOR DELETE
USING (auth.uid() = uploaded_by);

-- ========================================
-- PROJECTS - Users see projects they created or are assigned to
-- ========================================

CREATE POLICY "Users can view own or assigned projects"
ON projects FOR SELECT
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can insert own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own or assigned projects"
ON projects FOR UPDATE
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (auth.uid() = created_by);

-- ========================================
-- TASKS - Users see tasks they created or are assigned to
-- ========================================

CREATE POLICY "Users can view own or assigned tasks"
ON tasks FOR SELECT
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can insert own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own or assigned tasks"
ON tasks FOR UPDATE
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete own tasks"
ON tasks FOR DELETE
USING (auth.uid() = created_by);

-- ========================================
-- USER_PROFILES - Users can view all, edit own
-- ========================================

CREATE POLICY "Users can view all profiles"
ON user_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- ========================================
-- USER_SETTINGS - Users can only see/edit own settings
-- ========================================

CREATE POLICY "Users can view own settings"
ON user_settings FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert own settings"
ON user_settings FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own settings"
ON user_settings FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can delete own settings"
ON user_settings FOR DELETE
USING (auth.uid() = id);

-- Verify policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
