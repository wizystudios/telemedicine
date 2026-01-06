-- Create hospital_services table for services that hospitals offer
CREATE TABLE public.hospital_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  ambulance_available BOOLEAN DEFAULT false,
  ambulance_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hospital_services ENABLE ROW LEVEL SECURITY;

-- Anyone can view hospital services
CREATE POLICY "Anyone can view hospital services"
ON public.hospital_services FOR SELECT
USING (true);

-- Hospital owners can manage their services
CREATE POLICY "Hospital owners can manage their services"
ON public.hospital_services FOR ALL
USING (
  hospital_id IN (
    SELECT id FROM public.hospitals WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  hospital_id IN (
    SELECT id FROM public.hospitals WHERE owner_id = auth.uid()
  )
);

-- Super admin can manage all services
CREATE POLICY "super_admin_manage_hospital_services"
ON public.hospital_services FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Add ambulance columns to hospitals table
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS has_ambulance BOOLEAN DEFAULT false;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS ambulance_phone TEXT;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS ambulance_available_24h BOOLEAN DEFAULT false;