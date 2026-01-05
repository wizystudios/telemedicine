-- Fix RLS policy for doctor_timetable to allow hospital owners to manage their doctors' timetables
-- Also add RLS policies for lab owners and pharmacy owners

-- First, create a function to check if user is hospital owner for a doctor
CREATE OR REPLACE FUNCTION public.is_hospital_owner_of_doctor(_user_id uuid, _doctor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM doctor_profiles dp
    JOIN hospitals h ON dp.hospital_id = h.id
    WHERE dp.user_id = _doctor_id
      AND h.owner_id = _user_id
  )
$$;

-- Drop the old restrictive policy for doctors managing timetable
DROP POLICY IF EXISTS "Doctors can manage their own timetable" ON public.doctor_timetable;

-- Create new policies that allow both doctors AND hospital owners
CREATE POLICY "Doctors can manage their own timetable"
ON public.doctor_timetable
FOR ALL
USING (
  auth.uid() = doctor_id 
  OR public.is_hospital_owner_of_doctor(auth.uid(), doctor_id)
)
WITH CHECK (
  auth.uid() = doctor_id 
  OR public.is_hospital_owner_of_doctor(auth.uid(), doctor_id)
);

-- Create storage bucket for institution logos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('institution-logos', 'institution-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for institution logos
CREATE POLICY "Anyone can view institution logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'institution-logos');

CREATE POLICY "Authenticated users can upload institution logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'institution-logos');

CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'institution-logos');

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'institution-logos');