
CREATE OR REPLACE FUNCTION public.admin_seed_demo_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth','extensions'
AS $function$
DECLARE
  _owner_id uuid;
  _doc_id uuid;
  _pat_id uuid;
  _hosp_id uuid;
  _spec_id uuid;
  _appt_count int := 0;
  _d int;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_admin_or_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can seed demo data';
    END IF;
  ELSIF current_user NOT IN ('postgres','supabase_admin','service_role') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- specialty
  SELECT id INTO _spec_id FROM public.specialties WHERE name ILIKE 'General%' LIMIT 1;
  IF _spec_id IS NULL THEN
    INSERT INTO public.specialties (name, description, icon)
    VALUES ('General Medicine','Huduma za afya kwa ujumla','stethoscope')
    RETURNING id INTO _spec_id;
  END IF;

  -- owner auth user
  SELECT id INTO _owner_id FROM auth.users WHERE email = 'demo.owner@telemed.test';
  IF _owner_id IS NULL THEN
    _owner_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (_owner_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','demo.owner@telemed.test',
      extensions.crypt('Demo@12345', extensions.gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Amina","last_name":"Mwinyi","role":"hospital_owner","phone":"+255700000001"}'::jsonb);
  END IF;

  -- doctor auth user
  SELECT id INTO _doc_id FROM auth.users WHERE email = 'demo.doctor@telemed.test';
  IF _doc_id IS NULL THEN
    _doc_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (_doc_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','demo.doctor@telemed.test',
      extensions.crypt('Demo@12345', extensions.gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Juma","last_name":"Kassim","role":"doctor","phone":"+255700000002"}'::jsonb);
  END IF;

  -- patient auth user
  SELECT id INTO _pat_id FROM auth.users WHERE email = 'demo.patient@telemed.test';
  IF _pat_id IS NULL THEN
    _pat_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (_pat_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','demo.patient@telemed.test',
      extensions.crypt('Demo@12345', extensions.gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Neema","last_name":"Joseph","role":"patient","phone":"+255700000003"}'::jsonb);
  END IF;

  -- hospital
  SELECT id INTO _hosp_id FROM public.hospitals WHERE name = 'JK Demo Hospital';
  IF _hosp_id IS NULL THEN
    INSERT INTO public.hospitals (owner_id, name, description, address, phone, email, website,
      services, is_verified, org_approval_status, brela_number, tin_number,
      latitude, longitude, has_ambulance, ambulance_phone, ambulance_available_24h, rating, total_reviews)
    VALUES (_owner_id,'JK Demo Hospital','Hospitali ya mfano kwa maonyesho ya mfumo.','Mikocheni, Dar es Salaam','+255700000010','info@jkdemo.test','https://jkdemo.test',
      ARRAY['Outpatient','Maabara','Dharura'], true, 'approved','BRELA-DEMO-001','TIN-DEMO-001',
      -6.7743, 39.2533, true, '+255700000011', true, 4.6, 12)
    RETURNING id INTO _hosp_id;
  ELSE
    UPDATE public.hospitals SET owner_id=_owner_id, is_verified=true, org_approval_status='approved' WHERE id=_hosp_id;
  END IF;

  -- doctor profile
  IF NOT EXISTS (SELECT 1 FROM public.doctor_profiles WHERE user_id=_doc_id) THEN
    INSERT INTO public.doctor_profiles (user_id, specialty_id, license_number, experience_years, consultation_fee,
      rating, total_reviews, bio, languages, is_verified, is_available, hospital_id, hospital_name, doctor_type,
      is_private, org_approval_status, org_approved_at, admin_approved_at)
    VALUES (_doc_id, _spec_id, 'MD-DEMO-001', 8, 25000, 4.8, 9,
      'Daktari wa magonjwa ya jumla mwenye uzoefu wa miaka 8.', ARRAY['Swahili','English'], true, true,
      _hosp_id, 'JK Demo Hospital', 'general', false, 'approved', now(), now());
  ELSE
    UPDATE public.doctor_profiles SET hospital_id=_hosp_id, hospital_name='JK Demo Hospital',
      is_verified=true, org_approval_status='approved', admin_approved_at=now() WHERE user_id=_doc_id;
  END IF;

  -- weekly timetable Mon-Sat
  FOR _d IN 1..6 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.doctor_timetable WHERE doctor_id=_doc_id AND day_of_week=_d) THEN
      INSERT INTO public.doctor_timetable (doctor_id, day_of_week, start_time, end_time, is_available, location)
      VALUES (_doc_id, _d, '08:00', '16:00', true, 'JK Demo Hospital');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.doctor_availability WHERE doctor_id=_doc_id AND day_of_week=_d) THEN
      INSERT INTO public.doctor_availability (doctor_id, day_of_week, start_time, end_time, is_available)
      VALUES (_doc_id, _d, '08:00', '16:00', true);
    END IF;
  END LOOP;

  INSERT INTO public.doctor_online_status (doctor_id, is_online, last_seen)
  VALUES (_doc_id, true, now())
  ON CONFLICT DO NOTHING;

  -- sample appointments (one paid)
  IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE doctor_id=_doc_id AND patient_id=_pat_id) THEN
    INSERT INTO public.appointments (patient_id, doctor_id, specialty_id, appointment_date, duration_minutes,
      status, consultation_type, symptoms, fee, payment_status)
    VALUES
      (_pat_id,_doc_id,_spec_id, now() - interval '2 days', 30, 'completed','video','Homa na kichwa',25000,'paid'),
      (_pat_id,_doc_id,_spec_id, now() + interval '1 day', 30, 'scheduled','chat','Kikohozi cha muda mrefu',25000,'pending');
    _appt_count := 2;
  END IF;

  RETURN jsonb_build_object(
    'hospital_id',_hosp_id,'owner_id',_owner_id,'doctor_id',_doc_id,'patient_id',_pat_id,
    'appointments_created',_appt_count,
    'credentials', jsonb_build_object('owner','demo.owner@telemed.test','doctor','demo.doctor@telemed.test','patient','demo.patient@telemed.test','password','Demo@12345')
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_seed_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_seed_demo_data() TO authenticated, service_role;
