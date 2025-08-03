-- Create notifications for patient problems and appointments
-- First, create a function to notify doctors about new patient problems
CREATE OR REPLACE FUNCTION public.notify_doctors_of_patient_problem()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all doctors about the new patient problem
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    profiles.id,
    'Mgonjwa Anahitaji Msaada',
    CONCAT('Mgonjwa ', 
      (SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) 
       FROM profiles WHERE id = NEW.patient_id), 
      ' ameweka tatizo jipya: ', LEFT(NEW.problem_text, 50), '...'),
    'patient_problem',
    NEW.id
  FROM profiles 
  WHERE role = 'doctor';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for patient problems
DROP TRIGGER IF EXISTS notify_doctors_on_new_problem ON public.patient_problems;
CREATE TRIGGER notify_doctors_on_new_problem
  AFTER INSERT ON public.patient_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_doctors_of_patient_problem();

-- Create function to notify about appointment status changes
CREATE OR REPLACE FUNCTION public.notify_appointment_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for appointment status changes
DROP TRIGGER IF EXISTS notify_appointment_status_change ON public.appointments;
CREATE TRIGGER notify_appointment_status_change
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_status_change();

-- Add file support to patient problems
ALTER TABLE public.patient_problems 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- Add file support to chat messages (already exists)
-- chat_messages already has file_url and file_type columns

-- Create storage policy for problem attachments in avatars bucket
CREATE POLICY "Users can upload problem attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] = 'problems'
);

-- Allow users to view problem attachments
CREATE POLICY "Users can view problem attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[2] = 'problems'
);