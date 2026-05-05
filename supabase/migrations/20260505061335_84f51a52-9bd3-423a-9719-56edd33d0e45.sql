-- Allow public guest browsing of verified doctors and verified pharmacy medicines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'doctor_profiles'
      AND policyname = 'Anyone can view verified doctor profiles'
  ) THEN
    CREATE POLICY "Anyone can view verified doctor profiles"
    ON public.doctor_profiles
    FOR SELECT
    TO anon, authenticated
    USING (is_verified = true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pharmacy_medicines'
      AND policyname = 'Anyone can view medicines from verified pharmacies'
  ) THEN
    CREATE POLICY "Anyone can view medicines from verified pharmacies"
    ON public.pharmacy_medicines
    FOR SELECT
    TO anon, authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.pharmacies p
        WHERE p.id = pharmacy_medicines.pharmacy_id
          AND p.is_verified = true
      )
    );
  END IF;
END $$;

-- Track whether pending actions have been read/cleared in the UI
ALTER TABLE public.pending_actions
ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pending_actions_user_read_status
  ON public.pending_actions (matched_user_id, is_read, status, created_at DESC);

-- Server-side helper for Wizy to place medicine orders for an existing account without exposing elevated keys to the app
CREATE OR REPLACE FUNCTION public.wizy_create_pharmacy_order_for_contact(
  p_contact text,
  p_pharmacy_id uuid,
  p_medicine_id uuid,
  p_medicine_name text,
  p_quantity integer DEFAULT 1,
  p_notes text DEFAULT NULL,
  p_fulfillment_type text DEFAULT 'pickup',
  p_delivery_address text DEFAULT NULL,
  p_pickup_time timestamptz DEFAULT NULL,
  p_patient_phone text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, patient_id uuid, medicine_name text, quantity integer, total_price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_medicine record;
  v_order_id uuid;
  v_quantity integer;
  v_total numeric;
BEGIN
  IF p_contact IS NULL OR btrim(p_contact) = '' THEN
    RAISE EXCEPTION 'Contact is required';
  END IF;

  SELECT * INTO v_user
  FROM public.lookup_user_by_contact(p_contact)
  LIMIT 1;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'No registered account matches that contact';
  END IF;

  SELECT m.id, m.name, m.price, m.in_stock, m.pharmacy_id, p.name AS pharmacy_name
  INTO v_medicine
  FROM public.pharmacy_medicines m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.id = p_medicine_id
    AND m.pharmacy_id = p_pharmacy_id
    AND p.is_verified = true
  LIMIT 1;

  IF v_medicine.id IS NULL THEN
    RAISE EXCEPTION 'Medicine is not available from a verified pharmacy';
  END IF;

  IF v_medicine.in_stock IS NOT TRUE THEN
    RAISE EXCEPTION 'Medicine is currently out of stock';
  END IF;

  v_quantity := GREATEST(COALESCE(p_quantity, 1), 1);
  v_total := COALESCE(v_medicine.price, 0) * v_quantity;

  INSERT INTO public.pharmacy_orders (
    patient_id,
    pharmacy_id,
    medicine_id,
    medicine_name,
    quantity,
    total_price,
    notes,
    status,
    fulfillment_type,
    delivery_address,
    pickup_time,
    patient_phone
  ) VALUES (
    v_user.id,
    p_pharmacy_id,
    p_medicine_id,
    COALESCE(NULLIF(btrim(p_medicine_name), ''), v_medicine.name),
    v_quantity,
    v_total,
    p_notes,
    'pending',
    COALESCE(NULLIF(p_fulfillment_type, ''), 'pickup'),
    p_delivery_address,
    p_pickup_time,
    COALESCE(NULLIF(p_patient_phone, ''), p_contact)
  )
  RETURNING id INTO v_order_id;

  order_id := v_order_id;
  patient_id := v_user.id;
  medicine_name := COALESCE(NULLIF(btrim(p_medicine_name), ''), v_medicine.name);
  quantity := v_quantity;
  total_price := v_total;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.wizy_create_pharmacy_order_for_contact(text, uuid, uuid, text, integer, text, text, text, timestamptz, text) TO anon, authenticated;