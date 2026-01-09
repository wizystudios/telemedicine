-- Create polyclinics table
CREATE TABLE public.polyclinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  description TEXT,
  logo_url TEXT,
  services TEXT[],
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_promoted BOOLEAN DEFAULT false,
  promotion_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create polyclinic_services table
CREATE TABLE public.polyclinic_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polyclinic_id UUID NOT NULL REFERENCES public.polyclinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create polyclinic_insurance junction table
CREATE TABLE public.polyclinic_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polyclinic_id UUID REFERENCES public.polyclinics(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add polyclinic_id to doctor_profiles
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS polyclinic_id UUID REFERENCES public.polyclinics(id) ON DELETE SET NULL;
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS polyclinic_name TEXT;

-- Enable RLS
ALTER TABLE public.polyclinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polyclinic_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polyclinic_insurance ENABLE ROW LEVEL SECURITY;

-- Polyclinics policies
CREATE POLICY "Anyone can view polyclinics" ON public.polyclinics FOR SELECT USING (true);
CREATE POLICY "Owners can manage their polyclinic" ON public.polyclinics FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Super admins can manage all polyclinics" ON public.polyclinics FOR ALL USING (public.is_super_admin(auth.uid()));

-- Polyclinic services policies  
CREATE POLICY "Anyone can view polyclinic services" ON public.polyclinic_services FOR SELECT USING (true);
CREATE POLICY "Polyclinic owners can manage services" ON public.polyclinic_services FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.polyclinics WHERE id = polyclinic_id AND owner_id = auth.uid()));

-- Polyclinic insurance policies
CREATE POLICY "Anyone can view polyclinic insurance" ON public.polyclinic_insurance FOR SELECT USING (true);
CREATE POLICY "Polyclinic owners can manage insurance" ON public.polyclinic_insurance FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.polyclinics WHERE id = polyclinic_id AND owner_id = auth.uid()));

-- Create function to check polyclinic ownership for doctors
CREATE OR REPLACE FUNCTION public.is_polyclinic_owner_of_doctor(_user_id uuid, _doctor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM doctor_profiles dp
    JOIN polyclinics p ON dp.polyclinic_id = p.id
    WHERE dp.user_id = _doctor_id
      AND p.owner_id = _user_id
  )
$$;