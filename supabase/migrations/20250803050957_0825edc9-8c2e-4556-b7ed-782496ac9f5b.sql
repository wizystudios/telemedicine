-- Fix function search path security warnings by adding SET search_path
-- Update all existing functions to set proper search_path

CREATE OR REPLACE FUNCTION public.update_patient_problem_indicator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.patient_problem_indicators (patient_id, has_urgent_problem, problem_id)
    VALUES (NEW.patient_id, TRUE, NEW.id)
    ON CONFLICT (patient_id) 
    DO UPDATE SET 
      has_urgent_problem = TRUE,
      problem_id = NEW.id,
      updated_at = NOW();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'resolved' THEN
    UPDATE public.patient_problem_indicators 
    SET has_urgent_problem = FALSE, updated_at = NOW()
    WHERE patient_id = NEW.patient_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = username_to_check
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.doctor_posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.doctor_posts 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_doctor_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.doctor_profiles 
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM public.reviews 
      WHERE doctor_id = NEW.doctor_id
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE doctor_id = NEW.doctor_id
    )
  WHERE user_id = NEW.doctor_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_post_views(post_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.doctor_posts 
  SET views_count = views_count + 1,
      updated_at = now()
  WHERE id = post_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(role::text, 'patient') FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    username, 
    phone, 
    country_code, 
    country
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'country_code', NULL),
    COALESCE(NEW.raw_user_meta_data->>'country', NULL)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_doctor_online_status(is_online_param boolean, status_message_param text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Only update if user is a doctor
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor') THEN
    INSERT INTO public.doctor_online_status (doctor_id, is_online, status_message, last_seen)
    VALUES (auth.uid(), is_online_param, status_message_param, now())
    ON CONFLICT (doctor_id) 
    DO UPDATE SET 
      is_online = is_online_param,
      status_message = COALESCE(status_message_param, public.doctor_online_status.status_message),
      last_seen = now(),
      updated_at = now();
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_doctors_of_patient_problem()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notify all doctors about the new patient problem
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    public.profiles.id,
    'Mgonjwa Anahitaji Msaada',
    CONCAT('Mgonjwa ', 
      (SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) 
       FROM public.profiles WHERE id = NEW.patient_id), 
      ' ameweka tatizo jipya: ', LEFT(NEW.problem_text, 50), '...'),
    'patient_problem',
    NEW.id
  FROM public.profiles 
  WHERE role = 'doctor';
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_appointment_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notify patient about appointment status change
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.patient_id,
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Miadi Imeidhinishwa'
        WHEN NEW.status = 'cancelled' THEN 'Miadi Imeghairiwa'
        WHEN NEW.status = 'completed' THEN 'Miadi Imekamilika'
        ELSE 'Miadi Imebadilishwa'
      END,
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Miadi yako imeidhinishwa na daktari'
        WHEN NEW.status = 'cancelled' THEN 'Miadi yako imeghairiwa'
        WHEN NEW.status = 'completed' THEN 'Miadi yako imekamilika'
        ELSE 'Hali ya miadi yako imebadilishwa'
      END,
      'appointment',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;