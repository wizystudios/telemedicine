-- Fix appointments table issues
-- Add missing suggested_time column
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS suggested_time timestamp with time zone;

-- Check current status constraint and update it
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'approved', 'rejected', 'completed', 'cancelled'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status ON public.appointments(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);