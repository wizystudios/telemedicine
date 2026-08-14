-- =========================================================
-- 1. SYSTEM SETTINGS (admin configurable)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read settings" ON public.system_settings
  FOR SELECT TO authenticated USING (public.is_admin_or_super_admin(auth.uid()));
CREATE POLICY "Admins write settings" ON public.system_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super_admin(auth.uid()));
CREATE POLICY "Admins update settings" ON public.system_settings
  FOR UPDATE TO authenticated USING (public.is_admin_or_super_admin(auth.uid()))
  WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

CREATE TRIGGER trg_system_settings_updated
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (key, value)
VALUES ('audit_retention', '{"days": 365, "auto_purge": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 2. ORG-SCOPED AUDIT ACCESS
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_type text, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN _org_type = 'hospital' THEN EXISTS (
      SELECT 1 FROM public.hospitals h WHERE h.id = _org_id AND h.owner_id = _user_id
      UNION ALL
      SELECT 1 FROM public.doctor_profiles d WHERE d.hospital_id = _org_id AND d.user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.org_staff s WHERE s.org_type='hospital' AND s.org_id=_org_id AND s.user_id=_user_id AND s.is_active
    )
    WHEN _org_type = 'polyclinic' THEN EXISTS (
      SELECT 1 FROM public.polyclinics p WHERE p.id = _org_id AND p.owner_id = _user_id
      UNION ALL
      SELECT 1 FROM public.doctor_profiles d WHERE d.polyclinic_id = _org_id AND d.user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.org_staff s WHERE s.org_type='polyclinic' AND s.org_id=_org_id AND s.user_id=_user_id AND s.is_active
    )
    WHEN _org_type = 'pharmacy' THEN EXISTS (
      SELECT 1 FROM public.pharmacies p WHERE p.id = _org_id AND p.owner_id = _user_id
      UNION ALL
      SELECT 1 FROM public.org_staff s WHERE s.org_type='pharmacy' AND s.org_id=_org_id AND s.user_id=_user_id AND s.is_active
    )
    WHEN _org_type = 'laboratory' THEN EXISTS (
      SELECT 1 FROM public.laboratories l WHERE l.id = _org_id AND l.owner_id = _user_id
      UNION ALL
      SELECT 1 FROM public.org_staff s WHERE s.org_type='laboratory' AND s.org_id=_org_id AND s.user_id=_user_id AND s.is_active
    )
    ELSE false END;
$$;

-- Members of an org (owner + doctors + staff) whose audit events an org admin may read
CREATE OR REPLACE FUNCTION public.org_member_ids(_org_type text, _org_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT h.owner_id FROM public.hospitals h WHERE _org_type='hospital' AND h.id=_org_id
  UNION
  SELECT p.owner_id FROM public.polyclinics p WHERE _org_type='polyclinic' AND p.id=_org_id
  UNION
  SELECT ph.owner_id FROM public.pharmacies ph WHERE _org_type='pharmacy' AND ph.id=_org_id
  UNION
  SELECT l.owner_id FROM public.laboratories l WHERE _org_type='laboratory' AND l.id=_org_id
  UNION
  SELECT d.user_id FROM public.doctor_profiles d
    WHERE (_org_type='hospital' AND d.hospital_id=_org_id)
       OR (_org_type='polyclinic' AND d.polyclinic_id=_org_id)
  UNION
  SELECT s.user_id FROM public.org_staff s
    WHERE s.org_type=_org_type AND s.org_id=_org_id AND s.is_active;
$$;

CREATE OR REPLACE FUNCTION public.admin_audit_logs(
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _org_type text DEFAULT NULL,
  _org_id uuid DEFAULT NULL,
  _limit int DEFAULT 500
)
RETURNS TABLE(
  id uuid, user_id uuid, actor_name text, actor_role text, event_type text,
  entity_type text, entity_id uuid, description text, metadata jsonb, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _is_admin boolean := public.is_admin_or_super_admin(auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT _is_admin THEN
    -- Non-admins must scope to an organisation they belong to
    IF _org_type IS NULL OR _org_id IS NULL
       OR NOT public.user_belongs_to_org(auth.uid(), _org_type, _org_id) THEN
      RAISE EXCEPTION 'Not authorized to view these audit logs';
    END IF;
  END IF;

  RETURN QUERY
  SELECT a.id, a.user_id,
         NULLIF(btrim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), '') AS actor_name,
         a.actor_role, a.event_type, a.entity_type, a.entity_id, a.description,
         a.metadata, a.created_at
  FROM public.audit_logs a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE (_from IS NULL OR a.created_at >= _from)
    AND (_to IS NULL OR a.created_at <= _to)
    AND (
      (_org_type IS NULL OR _org_id IS NULL)
      OR a.user_id IN (SELECT m.user_id FROM public.org_member_ids(_org_type, _org_id) m)
    )
  ORDER BY a.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 500), 5000);
END;
$$;

-- =========================================================
-- 3. RETENTION / CLEANUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.audit_retention_preview(_days int)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n bigint; _oldest timestamptz;
BEGIN
  IF NOT public.is_admin_or_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can inspect audit retention';
  END IF;
  SELECT count(*), min(created_at) INTO _n, _oldest
  FROM public.audit_logs WHERE created_at < now() - make_interval(days => GREATEST(_days, 1));
  RETURN jsonb_build_object('to_delete', COALESCE(_n,0), 'oldest', _oldest, 'days', _days);
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_audit_logs(_days int DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _d int;
  _deleted bigint;
BEGIN
  IF NOT public.is_admin_or_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can purge audit logs';
  END IF;
  _d := COALESCE(_days, (SELECT (value->>'days')::int FROM public.system_settings WHERE key='audit_retention'), 365);
  _d := GREATEST(_d, 7);

  WITH del AS (
    DELETE FROM public.audit_logs WHERE created_at < now() - make_interval(days => _d) RETURNING 1
  ) SELECT count(*) INTO _deleted FROM del;

  INSERT INTO public.audit_logs (user_id, actor_role, event_type, entity_type, description, metadata)
  VALUES (auth.uid(), 'admin', 'audit_purged', 'system',
          'Audit retention cleanup', jsonb_build_object('days', _d, 'deleted', _deleted));

  RETURN jsonb_build_object('deleted', _deleted, 'days', _d);
END;
$$;

-- Server-side (cron) variant, no auth context
CREATE OR REPLACE FUNCTION public.cron_purge_audit_logs()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _cfg jsonb;
  _d int;
  _deleted bigint;
BEGIN
  SELECT value INTO _cfg FROM public.system_settings WHERE key='audit_retention';
  IF _cfg IS NULL OR COALESCE((_cfg->>'auto_purge')::boolean, false) = false THEN
    RETURN;
  END IF;
  _d := GREATEST(COALESCE((_cfg->>'days')::int, 365), 7);
  WITH del AS (
    DELETE FROM public.audit_logs WHERE created_at < now() - make_interval(days => _d) RETURNING 1
  ) SELECT count(*) INTO _deleted FROM del;

  INSERT INTO public.audit_logs (actor_role, event_type, entity_type, description, metadata)
  VALUES ('system', 'audit_purged', 'system', 'Scheduled audit retention cleanup',
          jsonb_build_object('days', _d, 'deleted', _deleted));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_purge_audit_logs() FROM anon, authenticated;

-- =========================================================
-- 4. DIAGNOSTICS RUNS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.diagnostics_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'manual',
  ran_by uuid,
  org_type text,
  org_id uuid,
  passed int NOT NULL DEFAULT 0,
  warned int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.diagnostics_runs TO authenticated;
GRANT ALL ON public.diagnostics_runs TO service_role;

ALTER TABLE public.diagnostics_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view diagnostics" ON public.diagnostics_runs
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_super_admin(auth.uid())
    OR (org_type IS NOT NULL AND org_id IS NOT NULL
        AND public.user_belongs_to_org(auth.uid(), org_type, org_id))
  );

CREATE POLICY "Admins insert diagnostics" ON public.diagnostics_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    ran_by = auth.uid()
    AND (
      public.is_admin_or_super_admin(auth.uid())
      OR (org_type IS NOT NULL AND org_id IS NOT NULL
          AND public.user_belongs_to_org(auth.uid(), org_type, org_id))
    )
  );

CREATE INDEX IF NOT EXISTS idx_diagnostics_runs_created ON public.diagnostics_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- Automated server-side health check
CREATE OR REPLACE FUNCTION public.run_scheduled_diagnostics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _res jsonb := '[]'::jsonb;
  _pass int := 0; _warn int := 0; _fail int := 0;
  _n bigint; _m bigint; _k bigint;
  _add record;
BEGIN
  -- Doctor links: doctor_profiles without a matching profile
  SELECT count(*) INTO _n FROM public.doctor_profiles d
    LEFT JOIN public.profiles p ON p.id = d.user_id WHERE p.id IS NULL;
  SELECT count(*) INTO _m FROM public.doctor_profiles WHERE is_verified = true;
  IF _n > 0 THEN _fail := _fail + 1; ELSIF _m = 0 THEN _warn := _warn + 1; ELSE _pass := _pass + 1; END IF;
  _res := _res || jsonb_build_array(jsonb_build_object(
    'name', 'Viungo vya madaktari',
    'status', CASE WHEN _n > 0 THEN 'fail' WHEN _m = 0 THEN 'warn' ELSE 'pass' END,
    'detail', _m || ' madaktari waliothibitishwa, ' || _n || ' bila wasifu.'));

  -- Chat threads: messages pointing to missing appointments
  SELECT count(*) INTO _n FROM public.chat_messages c
    LEFT JOIN public.appointments a ON a.id = c.appointment_id WHERE a.id IS NULL;
  SELECT count(*) INTO _m FROM public.chat_messages;
  IF _n > 0 THEN _fail := _fail + 1; ELSE _pass := _pass + 1; END IF;
  _res := _res || jsonb_build_array(jsonb_build_object(
    'name', 'Mazungumzo (chat)',
    'status', CASE WHEN _n > 0 THEN 'fail' ELSE 'pass' END,
    'detail', _m || ' ujumbe, ' || _n || ' bila mazungumzo halali.'));

  -- Attachments referenced by messages
  SELECT count(*) INTO _n FROM public.chat_messages WHERE COALESCE(file_url,'') <> '';
  _pass := _pass + 1;
  _res := _res || jsonb_build_array(jsonb_build_object(
    'name', 'Mafaili kwenye mazungumzo', 'status', 'pass',
    'detail', _n || ' mafaili yameambatishwa.'));

  -- Organisations verified vs pending
  SELECT (SELECT count(*) FROM public.hospitals WHERE is_verified)
       + (SELECT count(*) FROM public.pharmacies WHERE is_verified)
       + (SELECT count(*) FROM public.laboratories WHERE is_verified)
       + (SELECT count(*) FROM public.polyclinics WHERE is_verified) INTO _n;
  SELECT (SELECT count(*) FROM public.hospitals WHERE org_approval_status = 'pending')
       + (SELECT count(*) FROM public.pharmacies WHERE org_approval_status = 'pending')
       + (SELECT count(*) FROM public.laboratories WHERE org_approval_status = 'pending')
       + (SELECT count(*) FROM public.polyclinics WHERE org_approval_status = 'pending') INTO _k;
  IF _n = 0 THEN _warn := _warn + 1; ELSE _pass := _pass + 1; END IF;
  _res := _res || jsonb_build_array(jsonb_build_object(
    'name', 'Mashirika',
    'status', CASE WHEN _n = 0 THEN 'warn' ELSE 'pass' END,
    'detail', _n || ' yamethibitishwa, ' || _k || ' yanasubiri idhini.'));

  -- Orphan pharmacy orders
  SELECT count(*) INTO _n FROM public.pharmacy_orders o
    LEFT JOIN public.pharmacies p ON p.id = o.pharmacy_id WHERE p.id IS NULL;
  IF _n > 0 THEN _fail := _fail + 1; ELSE _pass := _pass + 1; END IF;
  _res := _res || jsonb_build_array(jsonb_build_object(
    'name', 'Oda za dawa',
    'status', CASE WHEN _n > 0 THEN 'fail' ELSE 'pass' END,
    'detail', _n || ' oda bila famasi halali.'));

  INSERT INTO public.diagnostics_runs (source, passed, warned, failed, results)
  VALUES ('scheduled', _pass, _warn, _fail, _res);

  RETURN jsonb_build_object('passed', _pass, 'warned', _warn, 'failed', _fail, 'results', _res);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_scheduled_diagnostics() FROM anon;

CREATE OR REPLACE FUNCTION public.admin_run_diagnostics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can run diagnostics';
  END IF;
  RETURN public.run_scheduled_diagnostics();
END;
$$;

-- =========================================================
-- 5. SCHEDULES
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('telemed-daily-diagnostics');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('telemed-weekly-audit-purge');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('telemed-daily-diagnostics', '0 2 * * *', $$SELECT public.run_scheduled_diagnostics();$$);
SELECT cron.schedule('telemed-weekly-audit-purge', '30 3 * * 0', $$SELECT public.cron_purge_audit_logs();$$);

-- =========================================================
-- 6. WIZY RECEPTIONIST
-- =========================================================
CREATE OR REPLACE FUNCTION public.wizy_find_org(_query text, _lim int DEFAULT 5)
RETURNS TABLE(org_type text, org_id uuid, name text, address text, phone text, logo_url text, rating numeric, score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH all_orgs AS (
    SELECT 'hospital'::text t, h.id, h.name, h.address, h.phone, h.logo_url, h.rating FROM public.hospitals h WHERE h.is_verified
    UNION ALL
    SELECT 'polyclinic', p.id, p.name, p.address, p.phone, p.logo_url, p.rating FROM public.polyclinics p WHERE p.is_verified
    UNION ALL
    SELECT 'pharmacy', ph.id, ph.name, ph.address, ph.phone, ph.logo_url, ph.rating FROM public.pharmacies ph WHERE ph.is_verified
    UNION ALL
    SELECT 'laboratory', l.id, l.name, l.address, l.phone, l.logo_url, l.rating FROM public.laboratories l WHERE l.is_verified
  )
  SELECT t, id, name, address, phone, logo_url, rating,
         GREATEST(similarity(name, COALESCE(_query,'')),
                  CASE WHEN name ILIKE '%'||COALESCE(_query,'')||'%' THEN 0.7 ELSE 0 END)::real AS score
  FROM all_orgs
  WHERE COALESCE(btrim(_query),'') = ''
     OR name ILIKE '%'||_query||'%'
     OR name % _query
  ORDER BY score DESC, name ASC
  LIMIT COALESCE(_lim, 5);
$$;

CREATE OR REPLACE FUNCTION public.wizy_org_overview(_org_type text, _org_id uuid, _date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org jsonb;
  _services jsonb := '[]'::jsonb;
  _doctors jsonb := '[]'::jsonb;
  _items jsonb := '[]'::jsonb;
  _d date := COALESCE(_date, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date);
  _dow int;
BEGIN
  _dow := EXTRACT(DOW FROM _d)::int;

  IF _org_type = 'hospital' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT h.id, h.name, h.address, h.phone, h.email, h.website, h.description, h.logo_url,
             h.rating, h.total_reviews, h.has_ambulance, h.ambulance_phone, h.ambulance_available_24h,
             h.services AS service_tags
      FROM public.hospitals h WHERE h.id = _org_id AND h.is_verified) x;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', s.name, 'price', s.price, 'category', s.category,
             'description', s.description, 'is_available', s.is_available) ORDER BY s.name), '[]'::jsonb)
      INTO _services FROM public.hospital_services s WHERE s.hospital_id = _org_id;

  ELSIF _org_type = 'polyclinic' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT p.id, p.name, p.address, p.phone, p.email, p.description, p.logo_url,
             p.rating, p.total_reviews, p.services AS service_tags
      FROM public.polyclinics p WHERE p.id = _org_id AND p.is_verified) x;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', s.name, 'price', s.price, 'category', s.category,
             'description', s.description, 'is_available', s.is_available) ORDER BY s.name), '[]'::jsonb)
      INTO _services FROM public.polyclinic_services s WHERE s.polyclinic_id = _org_id;

  ELSIF _org_type = 'pharmacy' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT ph.id, ph.name, ph.address, ph.phone, ph.email, ph.description, ph.logo_url,
             ph.rating, ph.total_reviews, ph.opening_hours, ph.emergency_available,
             ph.services AS service_tags
      FROM public.pharmacies ph WHERE ph.id = _org_id AND ph.is_verified) x;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'price', m.price,
             'dosage', m.dosage, 'in_stock', m.in_stock, 'category', m.category) ORDER BY m.name), '[]'::jsonb)
      INTO _items FROM (SELECT * FROM public.pharmacy_medicines WHERE pharmacy_id = _org_id ORDER BY name LIMIT 30) m;

  ELSIF _org_type = 'laboratory' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT l.id, l.name, l.address, l.phone, l.email, l.description, l.logo_url,
             l.rating, l.total_reviews, l.opening_hours, l.emergency_available,
             l.test_types AS service_tags
      FROM public.laboratories l WHERE l.id = _org_id AND l.is_verified) x;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', s.name, 'price', s.price, 'category', s.category,
             'waiting_hours', s.waiting_hours, 'preparation_required', s.preparation_required,
             'is_available', s.is_available) ORDER BY s.name), '[]'::jsonb)
      INTO _services FROM public.laboratory_services s WHERE s.laboratory_id = _org_id;
  ELSE
    RETURN jsonb_build_object('error', 'Unknown org type');
  END IF;

  IF _org IS NULL THEN
    RETURN jsonb_build_object('error', 'Shirika halijapatikana au halijathibitishwa');
  END IF;

  IF _org_type IN ('hospital', 'polyclinic') THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'doctor_id', dp.user_id,
             'name', btrim(COALESCE(pr.first_name,'') || ' ' || COALESCE(pr.last_name,'')),
             'avatar_url', pr.avatar_url,
             'doctor_type', dp.doctor_type,
             'consultation_fee', dp.consultation_fee,
             'rating', dp.rating,
             'is_online', COALESCE(os.is_online, false),
             'available_today', EXISTS (
                SELECT 1 FROM public.doctor_timetable t
                WHERE t.doctor_id = dp.user_id AND t.is_available AND t.day_of_week = _dow),
             'today_slots', COALESCE((
                SELECT jsonb_agg(jsonb_build_object('start', t.start_time, 'end', t.end_time, 'location', t.location)
                       ORDER BY t.start_time)
                FROM public.doctor_timetable t
                WHERE t.doctor_id = dp.user_id AND t.is_available AND t.day_of_week = _dow), '[]'::jsonb)
           ) ORDER BY dp.rating DESC NULLS LAST), '[]'::jsonb)
      INTO _doctors
    FROM public.doctor_profiles dp
    JOIN public.profiles pr ON pr.id = dp.user_id
    LEFT JOIN public.doctor_online_status os ON os.doctor_id = dp.user_id
    WHERE dp.is_verified
      AND ((_org_type = 'hospital' AND dp.hospital_id = _org_id)
        OR (_org_type = 'polyclinic' AND dp.polyclinic_id = _org_id));
  END IF;

  RETURN jsonb_build_object(
    'org_type', _org_type,
    'org', _org,
    'date', _d,
    'services', _services,
    'items', _items,
    'doctors', _doctors,
    'insurance', COALESCE((
      SELECT jsonb_agg(DISTINCT ip.name) FROM public.insurance_providers ip
      WHERE ip.is_active AND (
        (_org_type='hospital' AND EXISTS (SELECT 1 FROM public.hospital_insurance hi WHERE hi.hospital_id=_org_id AND hi.insurance_id=ip.id))
        OR (_org_type='polyclinic' AND EXISTS (SELECT 1 FROM public.polyclinic_insurance pi WHERE pi.polyclinic_id=_org_id AND pi.insurance_id=ip.id))
        OR (_org_type='pharmacy' AND EXISTS (SELECT 1 FROM public.pharmacy_insurance phi WHERE phi.pharmacy_id=_org_id AND phi.insurance_id=ip.id))
        OR (_org_type='laboratory' AND EXISTS (SELECT 1 FROM public.laboratory_insurance li WHERE li.laboratory_id=_org_id AND li.insurance_id=ip.id))
      )), '[]'::jsonb)
  );
END;
$$;

-- =========================================================
-- 7. BIOMETRIC RECOVERY
-- =========================================================
CREATE OR REPLACE FUNCTION public.reset_my_biometric()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  WITH del AS (DELETE FROM public.biometric_credentials WHERE user_id = auth.uid() RETURNING 1)
  SELECT count(*) INTO _n FROM del;

  INSERT INTO public.audit_logs (user_id, actor_role, event_type, entity_type, description, metadata)
  VALUES (auth.uid(), (SELECT role::text FROM public.profiles WHERE id = auth.uid()),
          'biometric_reset', 'auth', 'All biometric devices removed', jsonb_build_object('removed', _n));

  RETURN jsonb_build_object('removed', _n);
END;
$$;

CREATE OR REPLACE FUNCTION public.my_biometric_devices()
RETURNS TABLE(id uuid, credential_id text, device_label text, last_used_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.credential_id, b.device_label, b.last_used_at, b.created_at
  FROM public.biometric_credentials b
  WHERE b.user_id = auth.uid()
  ORDER BY b.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_my_biometric() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_biometric_devices() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_audit_logs(timestamptz, timestamptz, text, uuid, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_audit_logs(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_retention_preview(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_run_diagnostics() FROM anon;
