
-- 1. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_role text,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_event_idx ON public.audit_logs (event_type, created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own audit events"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read their own audit events"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all audit events"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_or_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_audit_event(
  _event_type text,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _description text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.audit_logs (user_id, actor_role, event_type, entity_type, entity_id, description, metadata, user_agent)
  VALUES (
    auth.uid(),
    (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
    left(_event_type, 60),
    left(_entity_type, 60),
    _entity_id,
    left(_description, 500),
    COALESCE(_metadata, '{}'::jsonb),
    left(_user_agent, 300)
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 2. BIOMETRIC (device) CREDENTIALS
CREATE TABLE IF NOT EXISTS public.biometric_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL,
  device_label text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, credential_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_credentials TO authenticated;
GRANT ALL ON public.biometric_credentials TO service_role;
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own biometric credentials"
  ON public.biometric_credentials FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_biometric_credentials_updated_at
  BEFORE UPDATE ON public.biometric_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. ADMIN LICENSE REVIEW (organisations)
CREATE OR REPLACE FUNCTION public.admin_review_org_license(
  _org_type text,
  _org_id uuid,
  _approve boolean,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status text := CASE WHEN _approve THEN 'approved' ELSE 'rejected' END;
BEGIN
  IF NOT public.is_admin_or_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can review licenses';
  END IF;

  IF _org_type = 'hospital' THEN
    UPDATE public.hospitals SET org_approval_status = _status, org_rejection_reason = _reason,
      is_verified = _approve, updated_at = now() WHERE id = _org_id;
  ELSIF _org_type = 'polyclinic' THEN
    UPDATE public.polyclinics SET org_approval_status = _status, org_rejection_reason = _reason,
      is_verified = _approve, updated_at = now() WHERE id = _org_id;
  ELSIF _org_type = 'pharmacy' THEN
    UPDATE public.pharmacies SET org_approval_status = _status, org_rejection_reason = _reason,
      is_verified = _approve, updated_at = now() WHERE id = _org_id;
  ELSIF _org_type = 'laboratory' THEN
    UPDATE public.laboratories SET org_approval_status = _status, org_rejection_reason = _reason,
      is_verified = _approve, updated_at = now() WHERE id = _org_id;
  ELSE
    RAISE EXCEPTION 'Unknown org type %', _org_type;
  END IF;

  INSERT INTO public.audit_logs (user_id, actor_role, event_type, entity_type, entity_id, description, metadata)
  VALUES (auth.uid(), 'admin', CASE WHEN _approve THEN 'license_approved' ELSE 'license_rejected' END,
          _org_type, _org_id, _reason, jsonb_build_object('org_type', _org_type));
END;
$$;

-- 4. ADMIN DIRECTORY BACKFILL
CREATE OR REPLACE FUNCTION public.admin_backfill_directory(_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doctors int := 0;
  _hospitals int := 0;
  _polyclinics int := 0;
  _pharmacies int := 0;
  _labs int := 0;
BEGIN
  IF NOT public.is_admin_or_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can run the directory backfill';
  END IF;

  SELECT count(*) INTO _doctors FROM public.doctor_profiles dp
    JOIN public.profiles p ON p.id = dp.user_id
    WHERE dp.is_verified IS DISTINCT FROM true OR dp.org_approval_status <> 'approved';
  SELECT count(*) INTO _hospitals FROM public.hospitals WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;
  SELECT count(*) INTO _polyclinics FROM public.polyclinics WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;
  SELECT count(*) INTO _pharmacies FROM public.pharmacies WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;
  SELECT count(*) INTO _labs FROM public.laboratories WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;

  IF NOT _dry_run THEN
    UPDATE public.doctor_profiles dp SET is_verified = true, org_approval_status = 'approved',
      admin_approved_at = now(), updated_at = now()
      FROM public.profiles p
      WHERE p.id = dp.user_id
        AND (dp.is_verified IS DISTINCT FROM true OR dp.org_approval_status <> 'approved');

    UPDATE public.hospitals SET is_verified = true, org_approval_status = 'approved', updated_at = now()
      WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;
    UPDATE public.polyclinics SET is_verified = true, org_approval_status = 'approved', updated_at = now()
      WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;
    UPDATE public.pharmacies SET is_verified = true, org_approval_status = 'approved', updated_at = now()
      WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;
    UPDATE public.laboratories SET is_verified = true, org_approval_status = 'approved', updated_at = now()
      WHERE is_verified IS DISTINCT FROM true AND license_document_url IS NOT NULL;

    INSERT INTO public.audit_logs (user_id, actor_role, event_type, description, metadata)
    VALUES (auth.uid(), 'admin', 'directory_backfill', 'Bulk published verified entries',
      jsonb_build_object('doctors', _doctors, 'hospitals', _hospitals, 'polyclinics', _polyclinics,
        'pharmacies', _pharmacies, 'laboratories', _labs));
  END IF;

  RETURN jsonb_build_object('dry_run', _dry_run, 'doctors', _doctors, 'hospitals', _hospitals,
    'polyclinics', _polyclinics, 'pharmacies', _pharmacies, 'laboratories', _labs);
END;
$$;

-- 5. ADMIN LICENSE QUEUE (read-only listing across org types)
CREATE OR REPLACE FUNCTION public.admin_license_queue()
RETURNS TABLE(
  org_type text, org_id uuid, name text, address text, phone text,
  brela_number text, tin_number text, license_document_url text,
  org_approval_status text, is_verified boolean, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'hospital', h.id, h.name, h.address, h.phone, h.brela_number, h.tin_number,
         h.license_document_url, h.org_approval_status, h.is_verified, h.created_at
  FROM public.hospitals h WHERE public.is_admin_or_super_admin(auth.uid())
  UNION ALL
  SELECT 'polyclinic', c.id, c.name, c.address, c.phone, c.brela_number, c.tin_number,
         c.license_document_url, c.org_approval_status, c.is_verified, c.created_at
  FROM public.polyclinics c WHERE public.is_admin_or_super_admin(auth.uid())
  UNION ALL
  SELECT 'pharmacy', ph.id, ph.name, ph.address, ph.phone, ph.brela_number, ph.tin_number,
         ph.license_document_url, ph.org_approval_status, ph.is_verified, ph.created_at
  FROM public.pharmacies ph WHERE public.is_admin_or_super_admin(auth.uid())
  UNION ALL
  SELECT 'laboratory', l.id, l.name, l.address, l.phone, l.brela_number, l.tin_number,
         l.license_document_url, l.org_approval_status, l.is_verified, l.created_at
  FROM public.laboratories l WHERE public.is_admin_or_super_admin(auth.uid());
$$;
