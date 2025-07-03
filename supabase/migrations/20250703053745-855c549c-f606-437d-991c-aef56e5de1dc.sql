
-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Doctors can view patients" ON public.profiles;
DROP POLICY IF EXISTS "Patients can view doctors and own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view doctors" ON public.profiles;

-- Create a security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Create new policies without recursion
CREATE POLICY "Anyone can view doctor profiles" ON public.profiles
FOR SELECT
USING (role = 'doctor');

-- Allow doctors to view patient profiles
CREATE POLICY "Doctors can view patient profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'patient' 
  AND public.get_current_user_role() = 'doctor'
);

-- Allow patients to view doctor profiles and their own profile
CREATE POLICY "Patients can view doctors and own profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  role = 'doctor' 
  OR (id = auth.uid() AND role = 'patient')
);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());
