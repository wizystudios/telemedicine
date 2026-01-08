-- Create insurance providers table
CREATE TABLE IF NOT EXISTS public.insurance_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_code TEXT,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create hospital-insurance junction table
CREATE TABLE IF NOT EXISTS public.hospital_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(hospital_id, insurance_id)
);

-- Create pharmacy-insurance junction table  
CREATE TABLE IF NOT EXISTS public.pharmacy_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pharmacy_id, insurance_id)
);

-- Create lab-insurance junction table
CREATE TABLE IF NOT EXISTS public.laboratory_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  laboratory_id UUID REFERENCES public.laboratories(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES public.insurance_providers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(laboratory_id, insurance_id)
);

-- Add insurance to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS insurance_id UUID REFERENCES public.insurance_providers(id);

-- Enable RLS
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratory_insurance ENABLE ROW LEVEL SECURITY;

-- Insurance providers policies (readable by everyone, managed by admins)
CREATE POLICY "Anyone can view active insurance providers" ON public.insurance_providers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage insurance providers" ON public.insurance_providers
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Hospital insurance policies
CREATE POLICY "Anyone can view hospital insurance" ON public.hospital_insurance
  FOR SELECT USING (true);

CREATE POLICY "Hospital owners can manage their insurance" ON public.hospital_insurance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.hospitals WHERE id = hospital_id AND owner_id = auth.uid())
  );

-- Pharmacy insurance policies
CREATE POLICY "Anyone can view pharmacy insurance" ON public.pharmacy_insurance
  FOR SELECT USING (true);

CREATE POLICY "Pharmacy owners can manage their insurance" ON public.pharmacy_insurance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pharmacies WHERE id = pharmacy_id AND owner_id = auth.uid())
  );

-- Lab insurance policies
CREATE POLICY "Anyone can view lab insurance" ON public.laboratory_insurance
  FOR SELECT USING (true);

CREATE POLICY "Lab owners can manage their insurance" ON public.laboratory_insurance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.laboratories WHERE id = laboratory_id AND owner_id = auth.uid())
  );

-- Insert some common Tanzanian insurance providers
INSERT INTO public.insurance_providers (name, short_code, description) VALUES
  ('National Health Insurance Fund', 'NHIF', 'Mfuko wa Taifa wa Bima ya Afya'),
  ('AAR Healthcare', 'AAR', 'Bima ya afya ya AAR'),
  ('Jubilee Insurance', 'JUBILEE', 'Jubilee Insurance Tanzania'),
  ('Resolution Insurance', 'RESOLUTION', 'Resolution Health Insurance'),
  ('Strategies Insurance', 'STRATEGIES', 'Strategies Insurance Tanzania'),
  ('UAP Insurance', 'UAP', 'UAP Old Mutual Insurance'),
  ('Reliance Insurance', 'RELIANCE', 'Reliance Insurance Tanzania'),
  ('Alliance Insurance', 'ALLIANCE', 'Alliance Insurance Corporation')
ON CONFLICT DO NOTHING;