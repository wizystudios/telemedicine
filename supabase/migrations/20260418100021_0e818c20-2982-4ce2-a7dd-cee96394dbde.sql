-- Ensure helper function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PHARMACY CART ============
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.pharmacy_medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, medicine_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cart" ON public.cart_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ADS ============
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  cta_text TEXT DEFAULT 'Tazama',
  target_pages TEXT[] DEFAULT ARRAY['home']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active ads" ON public.ads
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admin manage ads" ON public.ads
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AI HEALTH TIPS ============
CREATE TABLE IF NOT EXISTS public.ai_health_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  language TEXT NOT NULL DEFAULT 'sw',
  is_approved BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  generated_by_ai BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_health_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view approved tips" ON public.ai_health_tips
  FOR SELECT USING (is_active = true AND is_approved = true);

CREATE POLICY "Super admin manage tips" ON public.ai_health_tips
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER ai_health_tips_updated_at
  BEFORE UPDATE ON public.ai_health_tips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_health_tips (title, content, category) VALUES
  ('Kunywa Maji ya Kutosha', 'Kunywa angalau glasi 8 za maji kwa siku kwa afya bora ya figo na ngozi.', 'hydration'),
  ('Pumzika Vya Kutosha', 'Pata masaa 7-8 ya usingizi kila usiku ili mwili wako upone na ufanye kazi vizuri.', 'sleep'),
  ('Fanya Mazoezi', 'Dakika 30 za mazoezi ya kawaida kwa siku huongeza nguvu ya moyo na akili.', 'exercise'),
  ('Kula Matunda na Mboga', 'Jumuisha matunda na mboga 5 kwa siku kwa vitamini na nyuzi muhimu.', 'nutrition'),
  ('Osha Mikono Mara kwa Mara', 'Kuosha mikono kwa sabuni huzuia maambukizi ya magonjwa mengi.', 'hygiene')
ON CONFLICT DO NOTHING;