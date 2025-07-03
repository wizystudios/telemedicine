
-- First, drop ALL existing policies on profiles table to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Create a more robust security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(role::text, 'patient') FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Create simple, non-recursive policies

-- 1. Allow anyone to view doctor profiles (no recursion)
CREATE POLICY "view_doctors" ON public.profiles
FOR SELECT
USING (role = 'doctor');

-- 2. Allow authenticated users to view their own profile (no recursion)  
CREATE POLICY "view_own_profile" ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 3. Allow doctors to view patient profiles (using function to avoid recursion)
CREATE POLICY "doctors_view_patients" ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'patient' 
  AND public.get_current_user_role() = 'doctor'
);

-- 4. Allow users to update their own profile
CREATE POLICY "update_own_profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. Allow users to insert their own profile  
CREATE POLICY "insert_own_profile" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
