
-- 1. doctor_profiles: remove broad authenticated SELECT-all policy
DROP POLICY IF EXISTS "Anyone can view doctor profiles" ON public.doctor_profiles;
CREATE POLICY "Doctors view own profile"
  ON public.doctor_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. profiles: restrict view_doctors to authenticated only
DROP POLICY IF EXISTS "view_doctors" ON public.profiles;
CREATE POLICY "view_doctors"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (role = 'doctor'::user_role);

-- 3. patient_problem_indicators: remove public select
DROP POLICY IF EXISTS "Anyone can view patient problem indicators" ON public.patient_problem_indicators;
CREATE POLICY "Doctors view their patients indicators"
  ON public.patient_problem_indicators FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = patient_problem_indicators.patient_id
        AND a.doctor_id = auth.uid()
    )
  );

-- 4. notifications: restrict insert to authenticated, only for self
DROP POLICY IF EXISTS "Allow notification creation" ON public.notifications;
CREATE POLICY "Users create own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. pending_actions: keep anon insert for guest Wizy flow but cap field sizes
DROP POLICY IF EXISTS "Anyone can insert (Wizy)" ON public.pending_actions;
CREATE POLICY "Guests and users can insert pending actions"
  ON public.pending_actions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    coalesce(length(contact), 0) <= 200
    AND coalesce(length(human_summary), 0) <= 2000
    AND coalesce(length(payload::text), 0) <= 8000
  );

-- 6. institution-logos storage: scope DELETE/UPDATE to owners only
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;

CREATE OR REPLACE FUNCTION public.owns_institution_logo(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder text;
  entity_id_text text;
  entity_id uuid;
BEGIN
  folder := split_part(_name, '/', 1);
  entity_id_text := split_part(split_part(_name, '/', 2), '-', 1);
  BEGIN
    entity_id := entity_id_text::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  IF folder = 'hospital' THEN
    RETURN EXISTS (SELECT 1 FROM public.hospitals WHERE id = entity_id AND owner_id = auth.uid());
  ELSIF folder = 'pharmacy' THEN
    RETURN EXISTS (SELECT 1 FROM public.pharmacies WHERE id = entity_id AND owner_id = auth.uid());
  ELSIF folder = 'laboratory' THEN
    RETURN EXISTS (SELECT 1 FROM public.laboratories WHERE id = entity_id AND owner_id = auth.uid());
  ELSIF folder = 'polyclinic' THEN
    RETURN EXISTS (SELECT 1 FROM public.polyclinics WHERE id = entity_id AND owner_id = auth.uid());
  END IF;
  RETURN false;
END;
$$;

CREATE POLICY "Owners can delete their institution logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'institution-logos'
    AND public.owns_institution_logo(name)
  );

CREATE POLICY "Owners can update their institution logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'institution-logos'
    AND public.owns_institution_logo(name)
  )
  WITH CHECK (
    bucket_id = 'institution-logos'
    AND public.owns_institution_logo(name)
  );

-- Also tighten INSERT so only owners can upload to their entity's folder
DROP POLICY IF EXISTS "Authenticated users can upload institution logos" ON storage.objects;
CREATE POLICY "Owners can upload institution logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'institution-logos'
    AND public.owns_institution_logo(name)
  );
