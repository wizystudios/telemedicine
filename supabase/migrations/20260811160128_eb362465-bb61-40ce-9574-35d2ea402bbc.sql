
-- 1. Public doctor directory (no contact details)
CREATE OR REPLACE VIEW public.public_doctors AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  dp.doctor_type,
  dp.bio,
  dp.experience_years,
  dp.consultation_fee,
  dp.rating,
  dp.total_reviews,
  dp.education,
  dp.languages,
  dp.is_verified,
  dp.org_approval_status,
  dp.hospital_id,
  dp.hospital_name,
  dp.polyclinic_id,
  dp.polyclinic_name,
  dp.specialty_id,
  s.name AS specialty_name
FROM public.profiles p
JOIN public.doctor_profiles dp ON dp.user_id = p.id
LEFT JOIN public.specialties s ON s.id = dp.specialty_id
WHERE p.role = 'doctor';

GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- 2. Private doctors are auto-cleared at the organization stage
CREATE OR REPLACE FUNCTION public.autoapprove_private_doctor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.hospital_id IS NULL AND NEW.polyclinic_id IS NULL
     AND (NEW.org_approval_status IS NULL OR NEW.org_approval_status IN ('pending_org','pending')) THEN
    NEW.org_approval_status := 'approved';
    NEW.org_approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoapprove_private_doctor ON public.doctor_profiles;
CREATE TRIGGER trg_autoapprove_private_doctor
BEFORE INSERT OR UPDATE ON public.doctor_profiles
FOR EACH ROW EXECUTE FUNCTION public.autoapprove_private_doctor();

UPDATE public.doctor_profiles
SET org_approval_status = 'approved', org_approved_at = COALESCE(org_approved_at, now())
WHERE hospital_id IS NULL AND polyclinic_id IS NULL
  AND org_approval_status IN ('pending_org','pending');

-- 3. Safe chat peer lookup (names/photo only)
CREATE OR REPLACE FUNCTION public.get_chat_peer(_id uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, avatar_url text, role user_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.avatar_url, p.role
  FROM public.profiles p
  WHERE p.id = _id AND auth.uid() IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_peer(uuid) TO authenticated;

-- 4. Find or open the correct chat thread (never a real booking)
CREATE OR REPLACE FUNCTION public.get_or_create_chat_thread(_other_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_thread uuid;
  v_my_role user_role;
  v_patient uuid;
  v_doctor uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _other_id IS NULL OR _other_id = v_me THEN RAISE EXCEPTION 'Invalid conversation'; END IF;

  SELECT a.id INTO v_thread
  FROM public.appointments a
  WHERE (a.patient_id = v_me AND a.doctor_id = _other_id)
     OR (a.patient_id = _other_id AND a.doctor_id = v_me)
  ORDER BY (a.consultation_type = 'chat') DESC, a.created_at DESC
  LIMIT 1;

  IF v_thread IS NOT NULL THEN RETURN v_thread; END IF;

  SELECT p.role INTO v_my_role FROM public.profiles p WHERE p.id = v_me;

  IF v_my_role = 'doctor' THEN
    v_doctor := v_me; v_patient := _other_id;
  ELSE
    v_patient := v_me; v_doctor := _other_id;
  END IF;

  INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, status, consultation_type)
  VALUES (v_patient, v_doctor, now(), 'chat', 'chat')
  RETURNING id INTO v_thread;

  RETURN v_thread;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_chat_thread(uuid) TO authenticated;
