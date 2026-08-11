ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

ALTER TABLE public.laboratories
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

ALTER TABLE public.polyclinics
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

COMMENT ON COLUMN public.hospitals.latitude IS 'Geographic latitude for real map distance calculations';
COMMENT ON COLUMN public.hospitals.longitude IS 'Geographic longitude for real map distance calculations';
COMMENT ON COLUMN public.pharmacies.latitude IS 'Geographic latitude for real map distance calculations';
COMMENT ON COLUMN public.pharmacies.longitude IS 'Geographic longitude for real map distance calculations';
COMMENT ON COLUMN public.laboratories.latitude IS 'Geographic latitude for real map distance calculations';
COMMENT ON COLUMN public.laboratories.longitude IS 'Geographic longitude for real map distance calculations';
COMMENT ON COLUMN public.polyclinics.latitude IS 'Geographic latitude for real map distance calculations';
COMMENT ON COLUMN public.polyclinics.longitude IS 'Geographic longitude for real map distance calculations';