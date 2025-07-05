
-- Fix the consultation_type constraint to allow the correct values
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointment_consultation_type_check;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointment_consultation_type_check 
CHECK (consultation_type IN ('video', 'audio', 'chat', 'in-person'));
