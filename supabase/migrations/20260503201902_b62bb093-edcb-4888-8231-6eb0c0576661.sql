
-- Enable trigram for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes for fast fuzzy text search
CREATE INDEX IF NOT EXISTS idx_pharmacy_medicines_name_trgm ON public.pharmacy_medicines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_first_name_trgm ON public.profiles USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name_trgm ON public.profiles USING gin (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hospitals_name_trgm ON public.hospitals USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pharmacies_name_trgm ON public.pharmacies USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_laboratories_name_trgm ON public.laboratories USING gin (name gin_trgm_ops);

-- Pending Wizy actions (queued while user is offline / not logged in)
CREATE TABLE IF NOT EXISTS public.pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact text NOT NULL,                         -- email or phone provided to Wizy
  contact_type text NOT NULL CHECK (contact_type IN ('email','phone')),
  matched_user_id uuid,                          -- resolved profile id (null if unknown)
  action_type text NOT NULL CHECK (action_type IN ('add_to_cart','create_appointment','send_message','post_problem','order_medicine')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,    -- includes resolved IDs (medicine_id, pharmacy_id, doctor_id, etc)
  human_summary text NOT NULL,                   -- "Nunua Panadol x2 kutoka Famasi ya Mwananyamala"
  status text NOT NULL DEFAULT 'awaiting_confirmation'
    CHECK (status IN ('awaiting_confirmation','confirmed','rejected','executed','failed','expired')),
  result_id uuid,                                -- id of created cart_item / appointment / etc
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);

ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own pending actions"
ON public.pending_actions FOR SELECT
USING (matched_user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE POLICY "Users update own pending actions"
ON public.pending_actions FOR UPDATE
USING (matched_user_id = auth.uid())
WITH CHECK (matched_user_id = auth.uid());

CREATE POLICY "Anyone can insert (Wizy)"
ON public.pending_actions FOR INSERT
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pending_actions_user_status
  ON public.pending_actions (matched_user_id, status, created_at DESC);

-- Updated-at trigger
CREATE TRIGGER trg_pending_actions_updated_at
BEFORE UPDATE ON public.pending_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify the matched user when Wizy queues an action for them
CREATE OR REPLACE FUNCTION public.notify_pending_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.matched_user_id IS NOT NULL AND NEW.status = 'awaiting_confirmation' THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.matched_user_id,
      'Wizy: Thibitisha kitendo',
      NEW.human_summary,
      'pending_action',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pending_action ON public.pending_actions;
CREATE TRIGGER trg_notify_pending_action
AFTER INSERT ON public.pending_actions
FOR EACH ROW EXECUTE FUNCTION public.notify_pending_action();

-- Fuzzy medicine search (ordered by similarity)
CREATE OR REPLACE FUNCTION public.fuzzy_search_medicines(q text, lim int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  dosage text,
  in_stock boolean,
  category text,
  pharmacy_id uuid,
  pharmacy_name text,
  similarity real
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.name, m.price, m.dosage, m.in_stock, m.category,
         m.pharmacy_id, p.name as pharmacy_name,
         GREATEST(similarity(m.name, q), CASE WHEN m.name ILIKE '%'||q||'%' THEN 0.6 ELSE 0 END) AS similarity
  FROM public.pharmacy_medicines m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE p.is_verified = true
    AND (m.name % q OR m.name ILIKE '%'||q||'%' OR m.category ILIKE '%'||q||'%')
  ORDER BY m.in_stock DESC, similarity DESC, m.price ASC NULLS LAST
  LIMIT lim;
$$;

-- Fuzzy doctor search by name or specialty/type
CREATE OR REPLACE FUNCTION public.fuzzy_search_doctors(q text, lim int DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  doctor_type text,
  bio text,
  consultation_fee numeric,
  rating numeric,
  similarity real
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT dp.user_id, pr.first_name, pr.last_name, pr.avatar_url,
         dp.doctor_type, dp.bio, dp.consultation_fee, dp.rating,
         GREATEST(
           similarity(coalesce(pr.first_name,''), q),
           similarity(coalesce(pr.last_name,''), q),
           similarity(coalesce(dp.doctor_type,''), q),
           CASE WHEN coalesce(pr.first_name,'') ILIKE '%'||q||'%' OR coalesce(pr.last_name,'') ILIKE '%'||q||'%' OR coalesce(dp.doctor_type,'') ILIKE '%'||q||'%' THEN 0.6 ELSE 0 END
         ) AS similarity
  FROM public.doctor_profiles dp
  JOIN public.profiles pr ON pr.id = dp.user_id
  WHERE dp.is_verified = true
    AND ( pr.first_name % q OR pr.last_name % q OR dp.doctor_type % q
          OR pr.first_name ILIKE '%'||q||'%' OR pr.last_name ILIKE '%'||q||'%' OR dp.doctor_type ILIKE '%'||q||'%' OR dp.bio ILIKE '%'||q||'%')
  ORDER BY similarity DESC, dp.rating DESC NULLS LAST
  LIMIT lim;
$$;

-- Resolve a contact (email/phone) to a profile id. Used by Wizy to confirm an account exists.
CREATE OR REPLACE FUNCTION public.lookup_user_by_contact(contact text)
RETURNS TABLE (id uuid, first_name text, last_name text, email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.first_name, p.last_name, p.email, p.phone
  FROM public.profiles p
  WHERE lower(p.email) = lower(contact)
     OR p.phone = contact
     OR replace(replace(p.phone,' ',''),'+','') = replace(replace(contact,' ',''),'+','')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fuzzy_search_medicines(text,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fuzzy_search_doctors(text,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_contact(text) TO anon, authenticated;
