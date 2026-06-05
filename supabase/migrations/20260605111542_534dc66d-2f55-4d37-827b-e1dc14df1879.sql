
-- 1. Fix: doctors_view_patients exposed ALL patient PII to ALL doctors
DROP POLICY IF EXISTS doctors_view_patients ON public.profiles;

CREATE POLICY doctors_view_appointment_patients ON public.profiles
FOR SELECT
USING (
  role = 'patient'::user_role
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = profiles.id
      AND a.doctor_id = auth.uid()
  )
);

-- 2. Fix: privilege escalation via user_roles self-insert of super_admin
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;

CREATE POLICY "Users can self-assign safe role at signup" ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('patient'::app_role, 'doctor'::app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

-- 3. Fix: doctor email & phone readable by every authenticated user
-- Use column-level privileges so email/phone are never returned via PostgREST
-- to anon/authenticated, regardless of row-level policy.
REVOKE SELECT (email, phone) ON public.profiles FROM anon, authenticated;

-- SECURITY DEFINER RPC for a user to fetch their own contact info
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
  id uuid, email text, phone text, first_name text, last_name text,
  avatar_url text, role public.user_role, username text,
  country text, country_code text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, phone, first_name, last_name, avatar_url, role, username, country, country_code
  FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- SECURITY DEFINER RPC for org owners to look up a user id by email
-- (used when adding staff). Returns only the id, never the email row.
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE lower(email) = lower(btrim(_email))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_email(text) TO authenticated;
