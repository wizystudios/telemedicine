CREATE OR REPLACE FUNCTION public.get_or_create_chat_thread(_other_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid(); v_thread uuid; v_my_role user_role; v_patient uuid; v_doctor uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_id IS NULL OR _other_id = v_me THEN RAISE EXCEPTION 'Invalid conversation'; END IF;
  SELECT a.id INTO v_thread FROM public.appointments a
  WHERE (a.patient_id = v_me AND a.doctor_id = _other_id) OR (a.patient_id = _other_id AND a.doctor_id = v_me)
  ORDER BY (a.consultation_type = 'chat') DESC, a.created_at DESC LIMIT 1;
  IF v_thread IS NOT NULL THEN RETURN v_thread; END IF;
  SELECT p.role INTO v_my_role FROM public.profiles p WHERE p.id = v_me;
  IF v_my_role = 'doctor' THEN v_doctor := v_me; v_patient := _other_id;
  ELSE v_patient := v_me; v_doctor := _other_id; END IF;
  INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, status, consultation_type, payment_status)
  VALUES (v_patient, v_doctor, now(), 'approved', 'chat', 'pending')
  RETURNING id INTO v_thread;
  RETURN v_thread;
END; $function$;

CREATE OR REPLACE FUNCTION public._demo_user(_email text, _first text, _last text, _role text, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','extensions'
AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM auth.users WHERE email=_email;
  IF _id IS NULL THEN
    _id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',_email,
      extensions.crypt('Demo@12345', extensions.gen_salt('bf')), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name',_first,'last_name',_last,'role',_role,'phone',_phone));
  END IF;
  RETURN _id;
END; $$;
REVOKE ALL ON FUNCTION public._demo_user(text,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_seed_demo_facilities()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','extensions'
AS $$
DECLARE
  _ph_owner uuid; _lab_owner uuid; _cl_owner uuid; _doc2 uuid; _pat uuid;
  _ph uuid; _lab uuid; _cl uuid; _spec uuid; _d int; _ins record;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_admin_or_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins can seed demo data'; END IF;
  ELSIF current_user NOT IN ('postgres','supabase_admin','service_role') THEN RAISE EXCEPTION 'Not allowed'; END IF;

  _ph_owner := public._demo_user('demo.pharmacy@telemed.test','Baraka','Mushi','pharmacy_owner','+255700000004');
  _lab_owner := public._demo_user('demo.lab@telemed.test','Halima','Omari','lab_owner','+255700000005');
  _cl_owner := public._demo_user('demo.clinic@telemed.test','Salim','Mbwana','polyclinic_owner','+255700000006');
  _doc2 := public._demo_user('demo.doctor2@telemed.test','Rehema','Said','doctor','+255700000007');
  _pat := public._demo_user('demo.patient@telemed.test','Neema','Joseph','patient','+255700000003');
  SELECT id INTO _spec FROM public.specialties WHERE name ILIKE 'General%' LIMIT 1;

  SELECT id INTO _ph FROM public.pharmacies WHERE name='Upendo Demo Pharmacy';
  IF _ph IS NULL THEN
    INSERT INTO public.pharmacies (owner_id,name,description,address,phone,email,services,is_verified,org_approval_status,brela_number,tin_number,latitude,longitude,location_lat,location_lng,emergency_available,rating,total_reviews,opening_hours)
    VALUES (_ph_owner,'Upendo Demo Pharmacy','Famasi ya mfano yenye dawa halisi na bei.','Sinza, Dar es Salaam','+255700000020','info@upendo.test',
      ARRAY['Dawa za kuandikiwa','Ushauri wa dawa','Delivery'],true,'approved','BRELA-DEMO-002','TIN-DEMO-002',-6.7800,39.2250,-6.7800,39.2250,true,4.5,20,
      '{"mon_fri":"08:00-22:00","sat":"09:00-20:00","sun":"10:00-16:00"}'::jsonb)
    RETURNING id INTO _ph;
    INSERT INTO public.pharmacy_medicines (pharmacy_id,name,description,price,in_stock,category,dosage,requires_prescription) VALUES
      (_ph,'Paracetamol 500mg','Kupunguza maumivu na homa',2000,true,'Maumivu','1-2 vidonge kila saa 6',false),
      (_ph,'Amoxicillin 500mg','Antibiotiki',8500,true,'Antibiotiki','1 kidonge mara 3 kwa siku',true),
      (_ph,'ORS','Chumvi za kurejesha maji',1000,true,'Tumbo','Pakiti 1 kwenye lita 1',false),
      (_ph,'Vitamin C 1000mg','Kuimarisha kinga',6000,true,'Vitamini','1 kwa siku',false);
  END IF;

  SELECT id INTO _lab FROM public.laboratories WHERE name='Afya Demo Laboratory';
  IF _lab IS NULL THEN
    INSERT INTO public.laboratories (owner_id,name,description,address,phone,email,test_types,is_verified,org_approval_status,brela_number,tin_number,latitude,longitude,emergency_available,rating,total_reviews)
    VALUES (_lab_owner,'Afya Demo Laboratory','Maabara ya mfano yenye vipimo na bei.','Kariakoo, Dar es Salaam','+255700000030','info@afyalab.test',
      ARRAY['Damu','Malaria','Sukari'],true,'approved','BRELA-DEMO-003','TIN-DEMO-003',-6.8190,39.2790,true,4.4,15)
    RETURNING id INTO _lab;
    INSERT INTO public.laboratory_services (laboratory_id,name,description,price,waiting_hours,category,is_available) VALUES
      (_lab,'Kipimo cha Malaria (mRDT)','Majibu ndani ya dakika 30',5000,1,'Damu',true),
      (_lab,'Full Blood Count','Uchunguzi kamili wa damu',15000,4,'Damu',true),
      (_lab,'Sukari (FBS)','Kipimo cha sukari asubuhi',4000,1,'Kisukari',true);
  END IF;

  SELECT id INTO _cl FROM public.polyclinics WHERE name='Mikocheni Demo Polyclinic';
  IF _cl IS NULL THEN
    INSERT INTO public.polyclinics (owner_id,name,description,address,phone,email,services,is_verified,org_approval_status,brela_number,tin_number,latitude,longitude,rating,total_reviews)
    VALUES (_cl_owner,'Mikocheni Demo Polyclinic','Kliniki ya mfano yenye huduma na bei.','Mikocheni B, Dar es Salaam','+255700000040','info@mikoclinic.test',
      ARRAY['Watoto','Wanawake','Meno'],true,'approved','BRELA-DEMO-004','TIN-DEMO-004',-6.7650,39.2450,4.7,18)
    RETURNING id INTO _cl;
    INSERT INTO public.polyclinic_services (polyclinic_id,name,description,price,category,is_available) VALUES
      (_cl,'Ushauri wa daktari','Kumwona daktari wa jumla',20000,'Ushauri',true),
      (_cl,'Kliniki ya watoto','Uchunguzi na chanjo',25000,'Watoto',true),
      (_cl,'Kusafisha meno','Huduma ya meno',40000,'Meno',true);
  END IF;

  FOR _ins IN SELECT id FROM public.insurance_providers WHERE is_active IS DISTINCT FROM false ORDER BY name LIMIT 3 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.pharmacy_insurance WHERE pharmacy_id=_ph AND insurance_id=_ins.id) THEN
      INSERT INTO public.pharmacy_insurance (pharmacy_id,insurance_id) VALUES (_ph,_ins.id); END IF;
    IF NOT EXISTS (SELECT 1 FROM public.laboratory_insurance WHERE laboratory_id=_lab AND insurance_id=_ins.id) THEN
      INSERT INTO public.laboratory_insurance (laboratory_id,insurance_id) VALUES (_lab,_ins.id); END IF;
    IF NOT EXISTS (SELECT 1 FROM public.polyclinic_insurance WHERE polyclinic_id=_cl AND insurance_id=_ins.id) THEN
      INSERT INTO public.polyclinic_insurance (polyclinic_id,insurance_id) VALUES (_cl,_ins.id); END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM public.doctor_profiles WHERE user_id=_doc2) THEN
    INSERT INTO public.doctor_profiles (user_id,specialty_id,license_number,experience_years,consultation_fee,rating,total_reviews,bio,languages,is_verified,is_available,polyclinic_id,polyclinic_name,doctor_type,is_private,org_approval_status,org_approved_at,admin_approved_at)
    VALUES (_doc2,_spec,'MD-DEMO-002',6,20000,4.7,7,'Daktari wa watoto na familia.',ARRAY['Swahili','English'],true,true,_cl,'Mikocheni Demo Polyclinic','general',false,'approved',now(),now());
  END IF;
  FOR _d IN 1..5 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.doctor_timetable WHERE doctor_id=_doc2 AND day_of_week=_d) THEN
      INSERT INTO public.doctor_timetable (doctor_id,day_of_week,start_time,end_time,is_available,location) VALUES (_doc2,_d,'09:00','17:00',true,'Mikocheni Demo Polyclinic'); END IF;
    IF NOT EXISTS (SELECT 1 FROM public.doctor_availability WHERE doctor_id=_doc2 AND day_of_week=_d) THEN
      INSERT INTO public.doctor_availability (doctor_id,day_of_week,start_time,end_time,is_available) VALUES (_doc2,_d,'09:00','17:00',true); END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE doctor_id=_doc2 AND patient_id=_pat) THEN
    INSERT INTO public.appointments (patient_id,doctor_id,specialty_id,appointment_date,duration_minutes,status,consultation_type,symptoms,fee,payment_status)
    VALUES (_pat,_doc2,_spec, now() - interval '1 day',30,'completed','in-person','Uchunguzi wa mtoto',20000,'paid'),
           (_pat,_doc2,_spec, date_trunc('day', now()) + interval '2 days 10 hours',30,'approved','in-person','Chanjo',20000,'paid');
  END IF;

  RETURN jsonb_build_object('pharmacy_id',_ph,'laboratory_id',_lab,'polyclinic_id',_cl,'doctor2_id',_doc2,
    'credentials', jsonb_build_object('pharmacy','demo.pharmacy@telemed.test','lab','demo.lab@telemed.test','clinic','demo.clinic@telemed.test','doctor2','demo.doctor2@telemed.test','password','Demo@12345'));
END; $$;
REVOKE ALL ON FUNCTION public.admin_seed_demo_facilities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_seed_demo_facilities() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_backfill_directory(_dry_run boolean DEFAULT true)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _doctors int; _hospitals int; _polyclinics int; _pharmacies int; _labs int;
BEGIN
  IF NOT public.is_admin_or_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins can run the directory backfill'; END IF;
  SELECT count(*) INTO _doctors FROM public.doctor_profiles WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR is_private);
  SELECT count(*) INTO _hospitals FROM public.hospitals WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
  SELECT count(*) INTO _polyclinics FROM public.polyclinics WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
  SELECT count(*) INTO _pharmacies FROM public.pharmacies WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
  SELECT count(*) INTO _labs FROM public.laboratories WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
  IF NOT _dry_run THEN
    UPDATE public.doctor_profiles SET is_verified=true, org_approval_status='approved', admin_approved_at=now(), updated_at=now()
      WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR is_private);
    UPDATE public.hospitals SET is_verified=true, org_approval_status='approved', updated_at=now() WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
    UPDATE public.polyclinics SET is_verified=true, org_approval_status='approved', updated_at=now() WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
    UPDATE public.pharmacies SET is_verified=true, org_approval_status='approved', updated_at=now() WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
    UPDATE public.laboratories SET is_verified=true, org_approval_status='approved', updated_at=now() WHERE is_verified IS DISTINCT FROM true AND (org_approval_status='approved' OR license_document_url IS NOT NULL);
    INSERT INTO public.audit_logs (user_id, actor_role, event_type, description, metadata)
    VALUES (auth.uid(),'admin','directory_backfill','Bulk published verified entries',
      jsonb_build_object('doctors',_doctors,'hospitals',_hospitals,'polyclinics',_polyclinics,'pharmacies',_pharmacies,'laboratories',_labs));
  END IF;
  RETURN jsonb_build_object('dry_run',_dry_run,'doctors',_doctors,'hospitals',_hospitals,'polyclinics',_polyclinics,'pharmacies',_pharmacies,'laboratories',_labs);
END; $function$;

SELECT public.admin_seed_demo_facilities();
UPDATE public.doctor_profiles SET is_verified=true WHERE is_verified IS DISTINCT FROM true AND org_approval_status='approved';
UPDATE public.hospitals SET is_verified=true WHERE is_verified IS DISTINCT FROM true AND org_approval_status='approved';
UPDATE public.polyclinics SET is_verified=true WHERE is_verified IS DISTINCT FROM true AND org_approval_status='approved';
UPDATE public.pharmacies SET is_verified=true WHERE is_verified IS DISTINCT FROM true AND org_approval_status='approved';
UPDATE public.laboratories SET is_verified=true WHERE is_verified IS DISTINCT FROM true AND org_approval_status='approved';