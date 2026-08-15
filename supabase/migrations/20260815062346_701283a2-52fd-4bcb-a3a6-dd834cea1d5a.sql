-- 1. Website + social links
ALTER TABLE public.hospitals     ADD COLUMN IF NOT EXISTS website text, ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.polyclinics   ADD COLUMN IF NOT EXISTS website text, ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.pharmacies    ADD COLUMN IF NOT EXISTS website text, ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.laboratories  ADD COLUMN IF NOT EXISTS website text, ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. FAQ table
CREATE TABLE IF NOT EXISTS public.org_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type text NOT NULL CHECK (org_type IN ('hospital','polyclinic','pharmacy','laboratory')),
  org_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.org_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_faqs TO authenticated;
GRANT ALL ON public.org_faqs TO service_role;

ALTER TABLE public.org_faqs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_org(_org_type text, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (_org_type = 'hospital'    AND EXISTS (SELECT 1 FROM public.hospitals     WHERE id=_org_id AND owner_id=auth.uid()))
 OR (_org_type = 'polyclinic'  AND EXISTS (SELECT 1 FROM public.polyclinics   WHERE id=_org_id AND owner_id=auth.uid()))
 OR (_org_type = 'pharmacy'    AND EXISTS (SELECT 1 FROM public.pharmacies    WHERE id=_org_id AND owner_id=auth.uid()))
 OR (_org_type = 'laboratory'  AND EXISTS (SELECT 1 FROM public.laboratories  WHERE id=_org_id AND owner_id=auth.uid()))
 OR EXISTS (SELECT 1 FROM public.org_staff s WHERE s.org_type=_org_type AND s.org_id=_org_id AND s.user_id=auth.uid() AND s.is_active)
 OR public.is_admin_or_super_admin(auth.uid()), false);
$$;

DROP POLICY IF EXISTS "faqs public read" ON public.org_faqs;
CREATE POLICY "faqs public read" ON public.org_faqs FOR SELECT USING (is_published OR public.owns_org(org_type, org_id));
DROP POLICY IF EXISTS "faqs owner manage" ON public.org_faqs;
CREATE POLICY "faqs owner manage" ON public.org_faqs FOR ALL TO authenticated
  USING (public.owns_org(org_type, org_id)) WITH CHECK (public.owns_org(org_type, org_id));

DROP TRIGGER IF EXISTS trg_org_faqs_updated ON public.org_faqs;
CREATE TRIGGER trg_org_faqs_updated BEFORE UPDATE ON public.org_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_org_faqs_org ON public.org_faqs(org_type, org_id);

-- 3. Live dashboard timeseries
CREATE OR REPLACE FUNCTION public.dashboard_timeseries(_scope text, _org_id uuid DEFAULT NULL, _days int DEFAULT 14)
RETURNS TABLE(day date, appointments int, messages int, orders int, revenue numeric, visits int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _from date := ((now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date - GREATEST(COALESCE(_days,14),1) + 1);
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _scope IN ('hospital','polyclinic','pharmacy','laboratory') AND NOT public.owns_org(_scope, _org_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _scope = 'admin' AND NOT public.is_admin_or_super_admin(_uid) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  WITH days AS (SELECT generate_series(_from, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date, '1 day')::date AS d),
  doc_ids AS (
    SELECT dp.user_id AS id FROM public.doctor_profiles dp
    WHERE (_scope='hospital' AND dp.hospital_id=_org_id) OR (_scope='polyclinic' AND dp.polyclinic_id=_org_id)
  ),
  appt AS (
    SELECT a.appointment_date::date AS d, count(*)::int AS n, COALESCE(sum(a.fee) FILTER (WHERE a.payment_status='paid'),0) AS rev
    FROM public.appointments a
    WHERE a.appointment_date >= _from
      AND (
        (_scope IN ('hospital','polyclinic') AND a.doctor_id IN (SELECT id FROM doc_ids))
        OR (_scope='doctor' AND a.doctor_id=_uid)
        OR (_scope='patient' AND a.patient_id=_uid)
        OR (_scope='admin')
      )
    GROUP BY 1
  ),
  msg AS (
    SELECT m.created_at::date AS d, count(*)::int AS n
    FROM public.chat_messages m
    WHERE m.created_at >= _from
      AND (
        (_scope='doctor' AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=m.appointment_id AND a.doctor_id=_uid))
        OR (_scope='patient' AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=m.appointment_id AND a.patient_id=_uid))
        OR (_scope IN ('hospital','polyclinic') AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.id=m.appointment_id AND a.doctor_id IN (SELECT id FROM doc_ids)))
        OR (_scope='admin')
      )
    GROUP BY 1
  ),
  ord AS (
    SELECT o.created_at::date AS d, count(*)::int AS n, COALESCE(sum(o.total_price),0) AS rev
    FROM public.pharmacy_orders o
    WHERE o.created_at >= _from
      AND ((_scope='pharmacy' AND o.pharmacy_id=_org_id) OR (_scope='patient' AND o.patient_id=_uid) OR (_scope='admin'))
    GROUP BY 1
  ),
  lab AS (
    SELECT b.created_at::date AS d, count(*)::int AS n,
           COALESCE(sum((SELECT s.price FROM public.laboratory_services s WHERE s.id=b.service_id)),0) AS rev
    FROM public.lab_bookings b
    WHERE b.created_at >= _from
      AND ((_scope='laboratory' AND b.laboratory_id=_org_id) OR (_scope='patient' AND b.patient_id=_uid) OR (_scope='admin'))
    GROUP BY 1
  ),
  vis AS (
    SELECT v.visited_at::date AS d, count(*)::int AS n
    FROM public.profile_visits v
    WHERE v.visited_at >= _from
      AND ((_scope IN ('hospital','polyclinic','pharmacy','laboratory') AND v.entity_id=_org_id)
        OR (_scope='doctor' AND v.entity_id=_uid) OR (_scope='admin'))
    GROUP BY 1
  )
  SELECT days.d,
         COALESCE(appt.n,0),
         COALESCE(msg.n,0),
         COALESCE(ord.n,0) + COALESCE(lab.n,0),
         COALESCE(appt.rev,0) + COALESCE(ord.rev,0) + COALESCE(lab.rev,0),
         COALESCE(vis.n,0)
  FROM days
  LEFT JOIN appt ON appt.d = days.d
  LEFT JOIN msg  ON msg.d  = days.d
  LEFT JOIN ord  ON ord.d  = days.d
  LEFT JOIN lab  ON lab.d  = days.d
  LEFT JOIN vis  ON vis.d  = days.d
  ORDER BY days.d;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dashboard_timeseries(text, uuid, int) FROM anon;

-- 4. Wizy: free slots for a doctor on a date
CREATE OR REPLACE FUNCTION public.wizy_doctor_slots(_doctor_id uuid, _date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _d date := COALESCE(_date, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date);
  _dow int := EXTRACT(DOW FROM COALESCE(_date, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date))::int;
  _slots jsonb := '[]'::jsonb;
  _name text;
BEGIN
  SELECT btrim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) INTO _name
  FROM public.profiles p WHERE p.id = _doctor_id;

  WITH ranges AS (
    SELECT t.start_time, t.end_time FROM public.doctor_timetable t
    WHERE t.doctor_id=_doctor_id AND t.is_available AND t.day_of_week=_dow
    UNION ALL
    SELECT a.start_time, a.end_time FROM public.doctor_availability a
    WHERE a.doctor_id=_doctor_id AND COALESCE(a.is_available,true) AND a.day_of_week=_dow
  ),
  slots AS (
    SELECT generate_series(_d + r.start_time, _d + r.end_time - interval '30 min', interval '30 min') AS ts
    FROM ranges r
  )
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
           'time', to_char(s.ts, 'HH24:MI'),
           'iso', to_char(s.ts AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD"T"HH24:MI:SSOF')
         )), '[]'::jsonb)
    INTO _slots
  FROM slots s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.doctor_id=_doctor_id
      AND a.status IN ('scheduled','approved')
      AND a.appointment_date >= (s.ts AT TIME ZONE 'Africa/Dar_es_Salaam')
      AND a.appointment_date <  (s.ts AT TIME ZONE 'Africa/Dar_es_Salaam') + interval '30 min'
  )
  AND (s.ts AT TIME ZONE 'Africa/Dar_es_Salaam') > now();

  RETURN jsonb_build_object('doctor_id', _doctor_id, 'doctor_name', _name, 'date', _d, 'slots', _slots);
END;
$$;

-- 5. Facility overview now includes links + FAQs
CREATE OR REPLACE FUNCTION public.wizy_org_overview(_org_type text, _org_id uuid, _date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org jsonb;
  _services jsonb := '[]'::jsonb;
  _doctors jsonb := '[]'::jsonb;
  _items jsonb := '[]'::jsonb;
  _faqs jsonb := '[]'::jsonb;
  _d date := COALESCE(_date, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date);
  _dow int;
BEGIN
  _dow := EXTRACT(DOW FROM _d)::int;

  IF _org_type = 'hospital' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT h.id, h.name, h.address, h.phone, h.email, h.website, h.social_links, h.description, h.logo_url,
             h.rating, h.total_reviews, h.has_ambulance, h.ambulance_phone, h.ambulance_available_24h,
             h.services AS service_tags
      FROM public.hospitals h WHERE h.id = _org_id AND h.is_verified) x;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', s.name, 'price', s.price, 'category', s.category,
             'description', s.description, 'is_available', s.is_available) ORDER BY s.name), '[]'::jsonb)
      INTO _services FROM public.hospital_services s WHERE s.hospital_id = _org_id;

  ELSIF _org_type = 'polyclinic' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT p.id, p.name, p.address, p.phone, p.email, p.website, p.social_links, p.description, p.logo_url,
             p.rating, p.total_reviews, p.services AS service_tags
      FROM public.polyclinics p WHERE p.id = _org_id AND p.is_verified) x;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', s.name, 'price', s.price, 'category', s.category,
             'description', s.description, 'is_available', s.is_available) ORDER BY s.name), '[]'::jsonb)
      INTO _services FROM public.polyclinic_services s WHERE s.polyclinic_id = _org_id;

  ELSIF _org_type = 'pharmacy' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT ph.id, ph.name, ph.address, ph.phone, ph.email, ph.website, ph.social_links, ph.description, ph.logo_url,
             ph.rating, ph.total_reviews, ph.opening_hours, ph.emergency_available,
             ph.services AS service_tags
      FROM public.pharmacies ph WHERE ph.id = _org_id AND ph.is_verified) x;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'price', m.price,
             'dosage', m.dosage, 'in_stock', m.in_stock, 'category', m.category) ORDER BY m.name), '[]'::jsonb)
      INTO _items FROM (SELECT * FROM public.pharmacy_medicines WHERE pharmacy_id = _org_id ORDER BY name LIMIT 30) m;

  ELSIF _org_type = 'laboratory' THEN
    SELECT to_jsonb(x) INTO _org FROM (
      SELECT l.id, l.name, l.address, l.phone, l.email, l.website, l.social_links, l.description, l.logo_url,
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

  SELECT COALESCE(jsonb_agg(jsonb_build_object('question', f.question, 'answer', f.answer) ORDER BY f.display_order, f.created_at), '[]'::jsonb)
    INTO _faqs FROM public.org_faqs f
    WHERE f.org_type = _org_type AND f.org_id = _org_id AND f.is_published;

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
    'faqs', _faqs,
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

-- 6. Password reset for requested account
UPDATE auth.users
SET encrypted_password = crypt('5112Kharif@1', gen_salt('bf')),
    updated_at = now()
WHERE email = 'kharifanadhiru01@gmail.com';

UPDATE public.profiles SET must_change_password = false, password_changed_at = now()
WHERE email = 'kharifanadhiru01@gmail.com';