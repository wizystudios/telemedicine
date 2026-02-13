-- Super admin full access to specialties
CREATE POLICY "super_admin_manage_specialties"
ON public.specialties
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Super admin full access to appointments (including DELETE)
CREATE POLICY "super_admin_manage_appointments"
ON public.appointments
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Drop the limited SELECT-only policy for super admin on appointments
DROP POLICY IF EXISTS "super_admin_view_appointments" ON public.appointments;