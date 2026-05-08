
-- Add unique short order_code to pharmacy_orders
ALTER TABLE public.pharmacy_orders
  ADD COLUMN IF NOT EXISTS order_code text;

CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  IF NEW.order_code IS NOT NULL AND length(NEW.order_code) > 0 THEN
    RETURN NEW;
  END IF;
  LOOP
    v_code := 'ORD-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.pharmacy_orders WHERE order_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN EXIT; END IF;
  END LOOP;
  NEW.order_code := v_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pharmacy_orders_set_order_code ON public.pharmacy_orders;
CREATE TRIGGER pharmacy_orders_set_order_code
  BEFORE INSERT ON public.pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_code();

-- Backfill existing
UPDATE public.pharmacy_orders
SET order_code = 'ORD-' || upper(substr(md5(id::text), 1, 6))
WHERE order_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_orders_order_code_idx ON public.pharmacy_orders(order_code);

-- Allow pharmacy owners to view profiles of patients who placed orders with them
CREATE POLICY "pharmacy_owners_view_order_patients"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pharmacy_orders po
    JOIN public.pharmacies ph ON ph.id = po.pharmacy_id
    WHERE po.patient_id = profiles.id AND ph.owner_id = auth.uid()
  )
);

-- Same for lab owners viewing booking patients
CREATE POLICY "lab_owners_view_booking_patients"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lab_bookings lb
    JOIN public.laboratories l ON l.id = lb.laboratory_id
    WHERE lb.patient_id = profiles.id AND l.owner_id = auth.uid()
  )
);
