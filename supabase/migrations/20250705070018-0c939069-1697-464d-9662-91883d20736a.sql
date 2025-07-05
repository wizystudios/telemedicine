-- Fix appointments table constraints and make symptoms optional
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_consultation_type_check;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_consultation_type_check 
CHECK (consultation_type IN ('video', 'audio', 'chat', 'in-person'));

-- Make symptoms optional by allowing null values
UPDATE public.appointments SET symptoms = 'General consultation' WHERE symptoms IS NULL;

-- Fix online status function to only work for doctors
CREATE OR REPLACE FUNCTION public.update_doctor_online_status(is_online_param boolean, status_message_param text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if user is a doctor
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor') THEN
    INSERT INTO public.doctor_online_status (doctor_id, is_online, status_message, last_seen)
    VALUES (auth.uid(), is_online_param, status_message_param, now())
    ON CONFLICT (doctor_id) 
    DO UPDATE SET 
      is_online = is_online_param,
      status_message = COALESCE(status_message_param, doctor_online_status.status_message),
      last_seen = now(),
      updated_at = now();
  END IF;
END;
$$;