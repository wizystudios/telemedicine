
-- ============== 1. Org compliance columns ==============
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS brela_number text,
  ADD COLUMN IF NOT EXISTS tin_number text,
  ADD COLUMN IF NOT EXISTS license_document_url text,
  ADD COLUMN IF NOT EXISTS org_approval_status text NOT NULL DEFAULT 'pending_admin',
  ADD COLUMN IF NOT EXISTS org_rejection_reason text;

ALTER TABLE public.polyclinics
  ADD COLUMN IF NOT EXISTS brela_number text,
  ADD COLUMN IF NOT EXISTS tin_number text,
  ADD COLUMN IF NOT EXISTS license_document_url text,
  ADD COLUMN IF NOT EXISTS org_approval_status text NOT NULL DEFAULT 'pending_admin',
  ADD COLUMN IF NOT EXISTS org_rejection_reason text;

ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS brela_number text,
  ADD COLUMN IF NOT EXISTS tin_number text,
  ADD COLUMN IF NOT EXISTS license_document_url text,
  ADD COLUMN IF NOT EXISTS org_approval_status text NOT NULL DEFAULT 'pending_admin',
  ADD COLUMN IF NOT EXISTS org_rejection_reason text;

ALTER TABLE public.laboratories
  ADD COLUMN IF NOT EXISTS brela_number text,
  ADD COLUMN IF NOT EXISTS tin_number text,
  ADD COLUMN IF NOT EXISTS license_document_url text,
  ADD COLUMN IF NOT EXISTS org_approval_status text NOT NULL DEFAULT 'pending_admin',
  ADD COLUMN IF NOT EXISTS org_rejection_reason text;

-- ============== 2. Doctor two-stage approval ==============
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS org_approval_status text NOT NULL DEFAULT 'pending_org',
  ADD COLUMN IF NOT EXISTS org_approval_reason text,
  ADD COLUMN IF NOT EXISTS org_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_approved_at timestamptz;

-- Independent (no org) doctors skip the org stage
UPDATE public.doctor_profiles
SET org_approval_status = 'pending_admin'
WHERE hospital_id IS NULL AND polyclinic_id IS NULL AND org_approval_status = 'pending_org';

-- Verified doctors are fully approved
UPDATE public.doctor_profiles
SET org_approval_status = 'approved'
WHERE is_verified = true AND org_approval_status <> 'approved';

-- ============== 3. Profile visits analytics ==============
CREATE TABLE IF NOT EXISTS public.profile_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('doctor','hospital','polyclinic','pharmacy','laboratory')),
  entity_id uuid NOT NULL,
  visitor_id uuid,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_visits_entity_idx ON public.profile_visits(entity_type, entity_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS profile_visits_visited_at_idx ON public.profile_visits(visited_at DESC);

GRANT SELECT, INSERT ON public.profile_visits TO authenticated;
GRANT SELECT, INSERT ON public.profile_visits TO anon;
GRANT ALL ON public.profile_visits TO service_role;

ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert_visits" ON public.profile_visits;
CREATE POLICY "anyone_insert_visits" ON public.profile_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owners_view_visits" ON public.profile_visits;
CREATE POLICY "owners_view_visits" ON public.profile_visits
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (entity_type = 'doctor' AND EXISTS (SELECT 1 FROM public.doctor_profiles d WHERE d.id = entity_id AND d.user_id = auth.uid()))
    OR (entity_type = 'hospital' AND EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = entity_id AND h.owner_id = auth.uid()))
    OR (entity_type = 'polyclinic' AND EXISTS (SELECT 1 FROM public.polyclinics p WHERE p.id = entity_id AND p.owner_id = auth.uid()))
    OR (entity_type = 'pharmacy' AND EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = entity_id AND p.owner_id = auth.uid()))
    OR (entity_type = 'laboratory' AND EXISTS (SELECT 1 FROM public.laboratories l WHERE l.id = entity_id AND l.owner_id = auth.uid()))
  );

-- ============== 4. Org-documents storage bucket ==============
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-documents', 'org-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Org owners upload their docs" ON storage.objects;
CREATE POLICY "Org owners upload their docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Org owners read their docs" ON storage.objects;
CREATE POLICY "Org owners read their docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'org-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR is_super_admin(auth.uid())));

DROP POLICY IF EXISTS "Org owners update their docs" ON storage.objects;
CREATE POLICY "Org owners update their docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'org-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============== 5. RPC: record_profile_visit ==============
CREATE OR REPLACE FUNCTION public.record_profile_visit(p_entity_type text, p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_visits (entity_type, entity_id, visitor_id)
  VALUES (p_entity_type, p_entity_id, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_profile_visit(text, uuid) TO anon, authenticated;

-- ============== 6. RPC: org_dashboard_stats ==============
CREATE OR REPLACE FUNCTION public.org_dashboard_stats(p_org_type text, p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_doctors int := 0;
  v_patients int := 0;
  v_visits_today int := 0;
  v_visits_7d int := 0;
  v_appointments int := 0;
  v_content int := 0;
  v_pending_doctors int := 0;
BEGIN
  -- Authorize
  CASE p_org_type
    WHEN 'hospital' THEN SELECT owner_id INTO v_owner FROM public.hospitals WHERE id = p_org_id;
    WHEN 'polyclinic' THEN SELECT owner_id INTO v_owner FROM public.polyclinics WHERE id = p_org_id;
    WHEN 'pharmacy' THEN SELECT owner_id INTO v_owner FROM public.pharmacies WHERE id = p_org_id;
    WHEN 'laboratory' THEN SELECT owner_id INTO v_owner FROM public.laboratories WHERE id = p_org_id;
    ELSE RETURN '{}'::jsonb;
  END CASE;

  IF v_owner IS NULL OR (v_owner <> auth.uid() AND NOT is_super_admin(auth.uid())) THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Visits
  SELECT COUNT(*) INTO v_visits_today FROM public.profile_visits
    WHERE entity_type = p_org_type AND entity_id = p_org_id AND visited_at >= date_trunc('day', now());
  SELECT COUNT(*) INTO v_visits_7d FROM public.profile_visits
    WHERE entity_type = p_org_type AND entity_id = p_org_id AND visited_at >= now() - interval '7 days';

  -- Hospital / Polyclinic specifics
  IF p_org_type IN ('hospital','polyclinic') THEN
    IF p_org_type = 'hospital' THEN
      SELECT COUNT(*) INTO v_doctors FROM public.doctor_profiles WHERE hospital_id = p_org_id;
      SELECT COUNT(*) INTO v_pending_doctors FROM public.doctor_profiles WHERE hospital_id = p_org_id AND org_approval_status = 'pending_org';
      SELECT COUNT(DISTINCT a.patient_id) INTO v_patients FROM public.appointments a JOIN public.doctor_profiles d ON d.user_id = a.doctor_id WHERE d.hospital_id = p_org_id;
      SELECT COUNT(*) INTO v_appointments FROM public.appointments a JOIN public.doctor_profiles d ON d.user_id = a.doctor_id WHERE d.hospital_id = p_org_id;
    ELSE
      SELECT COUNT(*) INTO v_doctors FROM public.doctor_profiles WHERE polyclinic_id = p_org_id;
      SELECT COUNT(*) INTO v_pending_doctors FROM public.doctor_profiles WHERE polyclinic_id = p_org_id AND org_approval_status = 'pending_org';
      SELECT COUNT(DISTINCT a.patient_id) INTO v_patients FROM public.appointments a JOIN public.doctor_profiles d ON d.user_id = a.doctor_id WHERE d.polyclinic_id = p_org_id;
      SELECT COUNT(*) INTO v_appointments FROM public.appointments a JOIN public.doctor_profiles d ON d.user_id = a.doctor_id WHERE d.polyclinic_id = p_org_id;
    END IF;
    SELECT COUNT(*) INTO v_content FROM public.institution_content WHERE institution_type = p_org_type AND institution_id = p_org_id;
  END IF;

  -- Pharmacy specifics
  IF p_org_type = 'pharmacy' THEN
    SELECT COUNT(DISTINCT user_id) INTO v_patients FROM public.pharmacy_orders WHERE pharmacy_id = p_org_id;
    SELECT COUNT(*) INTO v_appointments FROM public.pharmacy_orders WHERE pharmacy_id = p_org_id;
    SELECT COUNT(*) INTO v_content FROM public.institution_content WHERE institution_type = 'pharmacy' AND institution_id = p_org_id;
  END IF;

  -- Lab specifics
  IF p_org_type = 'laboratory' THEN
    SELECT COUNT(DISTINCT patient_id) INTO v_patients FROM public.lab_bookings WHERE laboratory_id = p_org_id;
    SELECT COUNT(*) INTO v_appointments FROM public.lab_bookings WHERE laboratory_id = p_org_id;
    SELECT COUNT(*) INTO v_content FROM public.institution_content WHERE institution_type = 'laboratory' AND institution_id = p_org_id;
  END IF;

  RETURN jsonb_build_object(
    'doctors', v_doctors,
    'patients', v_patients,
    'visits_today', v_visits_today,
    'visits_7d', v_visits_7d,
    'appointments_or_orders', v_appointments,
    'content_count', v_content,
    'pending_doctors', v_pending_doctors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.org_dashboard_stats(text, uuid) TO authenticated;

-- ============== 7. RPC: doctor approval helpers ==============
CREATE OR REPLACE FUNCTION public.org_approve_doctor(p_doctor_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id uuid;
  v_polyclinic_id uuid;
  v_authorized boolean := false;
BEGIN
  SELECT hospital_id, polyclinic_id INTO v_hospital_id, v_polyclinic_id
    FROM public.doctor_profiles WHERE id = p_doctor_id;

  IF v_hospital_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.hospitals WHERE id = v_hospital_id AND owner_id = auth.uid()) THEN
    v_authorized := true;
  ELSIF v_polyclinic_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.polyclinics WHERE id = v_polyclinic_id AND owner_id = auth.uid()) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_approve THEN
    UPDATE public.doctor_profiles
      SET org_approval_status = 'pending_admin', org_approved_at = now(), org_approval_reason = NULL
      WHERE id = p_doctor_id;
  ELSE
    UPDATE public.doctor_profiles
      SET org_approval_status = 'rejected', org_approval_reason = p_reason
      WHERE id = p_doctor_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.org_approve_doctor(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_doctor(p_doctor_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_approve THEN
    UPDATE public.doctor_profiles
      SET org_approval_status = 'approved', admin_approved_at = now(), is_verified = true
      WHERE id = p_doctor_id;
  ELSE
    UPDATE public.doctor_profiles
      SET org_approval_status = 'rejected', org_approval_reason = p_reason, is_verified = false
      WHERE id = p_doctor_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_doctor(uuid, boolean, text) TO authenticated;
