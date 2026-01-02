-- Create table for institution content (videos, tutorials, classes)
CREATE TABLE IF NOT EXISTS public.institution_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_type TEXT NOT NULL, -- 'hospital', 'pharmacy', 'laboratory', 'doctor'
  institution_id UUID, -- Reference to specific institution
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'tutorial', 'article', 'class'
  content_url TEXT, -- URL to video/content
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for content likes
CREATE TABLE IF NOT EXISTS public.content_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.institution_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id)
);

-- Create table for saved content
CREATE TABLE IF NOT EXISTS public.saved_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.institution_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id)
);

-- Create table for laboratory services (more detailed than test_types array)
CREATE TABLE IF NOT EXISTS public.laboratory_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  laboratory_id UUID NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  waiting_hours INTEGER, -- How long to wait for results
  category TEXT,
  preparation_required TEXT, -- Fasting, etc.
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add more columns to pharmacy_medicines for detailed info
ALTER TABLE public.pharmacy_medicines 
ADD COLUMN IF NOT EXISTS usage_instructions TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT, -- 'adults', 'children', 'all'
ADD COLUMN IF NOT EXISTS dosage TEXT,
ADD COLUMN IF NOT EXISTS side_effects TEXT,
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT false;

-- Add more columns to pharmacies for full profile
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS po_box TEXT,
ADD COLUMN IF NOT EXISTS quote_of_day TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT false;

-- Add more columns to laboratories for full profile
ALTER TABLE public.laboratories 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS po_box TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT false;

-- Add logo to hospitals
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.institution_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratory_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for institution_content
CREATE POLICY "Anyone can view published content"
ON public.institution_content FOR SELECT
USING (is_published = true);

CREATE POLICY "Owners can manage their content"
ON public.institution_content FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- RLS Policies for content_likes
CREATE POLICY "Anyone can view likes"
ON public.content_likes FOR SELECT
USING (true);

CREATE POLICY "Users can manage their likes"
ON public.content_likes FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for saved_content
CREATE POLICY "Users can manage their saved content"
ON public.saved_content FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for laboratory_services
CREATE POLICY "Anyone can view lab services"
ON public.laboratory_services FOR SELECT
USING (true);

CREATE POLICY "Lab owners can manage their services"
ON public.laboratory_services FOR ALL
USING (laboratory_id IN (
  SELECT id FROM public.laboratories WHERE owner_id = auth.uid()
))
WITH CHECK (laboratory_id IN (
  SELECT id FROM public.laboratories WHERE owner_id = auth.uid()
));

-- Function to increment content views
CREATE OR REPLACE FUNCTION public.increment_content_views(content_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.institution_content 
  SET views_count = views_count + 1,
      updated_at = now()
  WHERE id = content_id_param;
END;
$$;

-- Function to update content likes count
CREATE OR REPLACE FUNCTION public.update_content_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.institution_content 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.content_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.institution_content 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.content_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for content likes
DROP TRIGGER IF EXISTS trigger_update_content_likes ON public.content_likes;
CREATE TRIGGER trigger_update_content_likes
AFTER INSERT OR DELETE ON public.content_likes
FOR EACH ROW EXECUTE FUNCTION public.update_content_likes_count();