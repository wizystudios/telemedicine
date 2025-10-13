-- CRITICAL SECURITY FIX: Create separate user_roles table
-- This prevents privilege escalation attacks

-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'hospital_owner', 'pharmacy_owner', 'lab_owner', 'admin');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- 6. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Migrate existing roles from profiles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Add doctor type and hospital info to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS doctor_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS hospital_name TEXT,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 9. Create timetable table for doctors
CREATE TABLE IF NOT EXISTS public.doctor_timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.doctor_timetable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view doctor timetables"
ON public.doctor_timetable
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Doctors can manage their own timetable"
ON public.doctor_timetable
FOR ALL
TO authenticated
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- 10. Add medicines to pharmacies
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC;

CREATE TABLE IF NOT EXISTS public.pharmacy_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC,
    in_stock BOOLEAN DEFAULT true,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pharmacy_medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view medicines"
ON public.pharmacy_medicines
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Pharmacy owners can manage their medicines"
ON public.pharmacy_medicines
FOR ALL
TO authenticated
USING (
    pharmacy_id IN (
        SELECT id FROM public.pharmacies WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    pharmacy_id IN (
        SELECT id FROM public.pharmacies WHERE owner_id = auth.uid()
    )
);