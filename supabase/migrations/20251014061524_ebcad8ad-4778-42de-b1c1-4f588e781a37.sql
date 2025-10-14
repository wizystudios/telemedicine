-- Step 2: Create super admin function and policies

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Update RLS policies to allow super admin full access to all tables

-- Profiles: Super admin can view and manage all profiles
CREATE POLICY "super_admin_full_access_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Hospitals: Super admin can manage all hospitals
CREATE POLICY "super_admin_manage_hospitals"
ON public.hospitals
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Pharmacies: Super admin can manage all pharmacies
CREATE POLICY "super_admin_manage_pharmacies"
ON public.pharmacies
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Laboratories: Super admin can manage all laboratories
CREATE POLICY "super_admin_manage_laboratories"
ON public.laboratories
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Doctor profiles: Super admin can manage all doctor profiles
CREATE POLICY "super_admin_manage_doctor_profiles"
ON public.doctor_profiles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Appointments: Super admin can view all appointments
CREATE POLICY "super_admin_view_appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- User roles: Super admin can manage all user roles
CREATE POLICY "super_admin_manage_user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Pharmacy medicines: Super admin can manage all medicines
CREATE POLICY "super_admin_manage_pharmacy_medicines"
ON public.pharmacy_medicines
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));