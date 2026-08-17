CREATE OR REPLACE FUNCTION public.wizy_doctor_slots(_doctor_id uuid, _date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _d date := COALESCE(_date, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date);
  _dow int := EXTRACT(DOW FROM COALESCE(_date, (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date))::int;
  _slots jsonb := '[]'::jsonb;
  _name text;
  _has_schedule boolean;
BEGIN
  SELECT btrim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) INTO _name
  FROM public.profiles p WHERE p.id = _doctor_id;

  SELECT EXISTS (
    SELECT 1 FROM public.doctor_timetable t WHERE t.doctor_id=_doctor_id
    UNION ALL
    SELECT 1 FROM public.doctor_availability a WHERE a.doctor_id=_doctor_id
  ) INTO _has_schedule;

  WITH ranges AS (
    SELECT t.start_time, t.end_time FROM public.doctor_timetable t
    WHERE t.doctor_id=_doctor_id AND t.is_available AND t.day_of_week=_dow
    UNION ALL
    SELECT a.start_time, a.end_time FROM public.doctor_availability a
    WHERE a.doctor_id=_doctor_id AND COALESCE(a.is_available,true) AND a.day_of_week=_dow
    UNION ALL
    -- Fallback working hours (Mon-Sat 08:00-17:00) when the doctor has no schedule set yet
    SELECT '08:00'::time, '17:00'::time
    WHERE NOT _has_schedule AND _dow <> 0
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

  RETURN jsonb_build_object('doctor_id', _doctor_id, 'doctor_name', _name, 'date', _d,
                            'fallback_hours', NOT _has_schedule, 'slots', _slots);
END;
$function$;