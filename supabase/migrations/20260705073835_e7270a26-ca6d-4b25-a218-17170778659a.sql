
CREATE TABLE public.org_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('hospital','pharmacy','laboratory','polyclinic')),
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT DEFAULT 'Tazama Zaidi',
  services TEXT[] DEFAULT '{}',
  hours TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  clicks_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.org_ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_ads TO authenticated;
GRANT ALL ON public.org_ads TO service_role;

ALTER TABLE public.org_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active current ads"
  ON public.org_ads FOR SELECT
  USING (is_active = true AND now() BETWEEN starts_at AND ends_at);

CREATE POLICY "Owners can view all their ads"
  ON public.org_ads FOR SELECT TO authenticated
  USING (public.is_org_owner(auth.uid(), org_type, org_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Owners can insert own org ads"
  ON public.org_ads FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_org_owner(auth.uid(), org_type, org_id));

CREATE POLICY "Owners can update own org ads"
  ON public.org_ads FOR UPDATE TO authenticated
  USING (public.is_org_owner(auth.uid(), org_type, org_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Owners can delete own org ads"
  ON public.org_ads FOR DELETE TO authenticated
  USING (public.is_org_owner(auth.uid(), org_type, org_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_org_ads_updated_at
  BEFORE UPDATE ON public.org_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_org_ads_active ON public.org_ads (is_active, starts_at, ends_at, display_order);
CREATE INDEX idx_org_ads_owner ON public.org_ads (owner_id);

-- RPC: increment view/click safely
CREATE OR REPLACE FUNCTION public.increment_org_ad_metric(_ad_id UUID, _metric TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _metric = 'view' THEN
    UPDATE public.org_ads SET views_count = views_count + 1 WHERE id = _ad_id;
  ELSIF _metric = 'click' THEN
    UPDATE public.org_ads SET clicks_count = clicks_count + 1 WHERE id = _ad_id;
  END IF;
END;
$$;

-- RPC: doctors available on a specific date (uses doctor_timetable weekly schedule)
CREATE OR REPLACE FUNCTION public.doctors_available_on_date(_date DATE)
RETURNS TABLE(
  doctor_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  doctor_type TEXT,
  consultation_fee NUMERIC,
  rating NUMERIC,
  start_time TIME,
  end_time TIME,
  location TEXT,
  hospital_id UUID,
  hospital_name TEXT,
  polyclinic_id UUID,
  polyclinic_name TEXT,
  is_online BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dp.user_id AS doctor_id,
    pr.first_name,
    pr.last_name,
    pr.avatar_url,
    dp.doctor_type,
    dp.consultation_fee,
    dp.rating,
    t.start_time,
    t.end_time,
    t.location,
    dp.hospital_id,
    h.name AS hospital_name,
    dp.polyclinic_id,
    p.name AS polyclinic_name,
    COALESCE(os.is_online, false) AS is_online
  FROM public.doctor_timetable t
  JOIN public.doctor_profiles dp ON dp.user_id = t.doctor_id
  JOIN public.profiles pr ON pr.id = t.doctor_id
  LEFT JOIN public.hospitals h ON h.id = dp.hospital_id
  LEFT JOIN public.polyclinics p ON p.id = dp.polyclinic_id
  LEFT JOIN public.doctor_online_status os ON os.doctor_id = t.doctor_id
  WHERE t.is_available = true
    AND dp.is_verified = true
    AND t.day_of_week = EXTRACT(DOW FROM _date)::int
  ORDER BY COALESCE(os.is_online,false) DESC, dp.rating DESC NULLS LAST, t.start_time ASC;
$$;

GRANT EXECUTE ON FUNCTION public.doctors_available_on_date(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_org_ad_metric(UUID, TEXT) TO anon, authenticated;
