-- Basic RLS policies for Week 1
-- Run this after creating the tables

-- User profiles - users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Companies - authenticated users can view, creators can edit
CREATE POLICY "Authenticated users can view companies" ON public.companies
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create companies" ON public.companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update companies they created" ON public.companies
    FOR UPDATE USING (auth.uid() = created_by);

-- Contacts - similar pattern
CREATE POLICY "Authenticated users can view contacts" ON public.contacts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create contacts" ON public.contacts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update contacts they created" ON public.contacts
    FOR UPDATE USING (auth.uid() = created_by);

-- Deals - similar pattern
CREATE POLICY "Authenticated users can view deals" ON public.deals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create deals" ON public.deals
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update deals they created or are assigned to" ON public.deals
    FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assigned_to);