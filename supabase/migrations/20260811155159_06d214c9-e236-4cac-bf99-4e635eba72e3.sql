-- Keep chat-only conversation rows from producing appointment booking notifications.
CREATE OR REPLACE FUNCTION public.notify_appointment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF COALESCE(NEW.consultation_type, '') = 'chat' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    NEW.patient_id,
    'Ombi la Miadi Limetumwa ✅',
    'Ombi lako la miadi limetumwa kwa daktari. Utapata jibu hivi karibuni.',
    'appointment',
    NEW.id
  );

  IF NEW.doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.doctor_id,
      'Ombi Jipya la Miadi 📅',
      'Mgonjwa ameomba miadi nawe. Tafadhali kagua na uthibitishe.',
      'appointment',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- If the trigger was missing in the live database, recreate it safely.
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_created();

-- Private chat attachment access using the appointment participants.
CREATE OR REPLACE FUNCTION public.can_access_chat_attachment(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_appointment_id uuid;
BEGIN
  BEGIN
    v_appointment_id := split_part(_name, '/', 1)::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id = v_appointment_id
      AND (a.patient_id = auth.uid() OR a.doctor_id = auth.uid() OR public.is_admin_or_super_admin(auth.uid()))
  );
END;
$function$;

-- Policies for a private chat-attachments bucket if the bucket exists.
DROP POLICY IF EXISTS "Chat participants can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can upload attachments" ON storage.objects;

CREATE POLICY "Chat participants can view attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.can_access_chat_attachment(name)
);

CREATE POLICY "Chat participants can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.can_access_chat_attachment(name)
);

-- Keep approved organization rows consistent so browse pages can show them.
UPDATE public.hospitals SET org_approval_status = 'approved' WHERE is_verified = true AND COALESCE(org_approval_status, '') <> 'approved';
UPDATE public.pharmacies SET org_approval_status = 'approved' WHERE is_verified = true AND COALESCE(org_approval_status, '') <> 'approved';
UPDATE public.laboratories SET org_approval_status = 'approved' WHERE is_verified = true AND COALESCE(org_approval_status, '') <> 'approved';
UPDATE public.polyclinics SET org_approval_status = 'approved' WHERE is_verified = true AND COALESCE(org_approval_status, '') <> 'approved';
