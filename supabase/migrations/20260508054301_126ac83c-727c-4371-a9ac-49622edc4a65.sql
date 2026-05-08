
-- 1. Columns
ALTER TABLE public.pharmacy_orders
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS patient_confirmed_at timestamptz;

-- 2. Patient self-update policy (so patient can confirm receipt -> completed)
DROP POLICY IF EXISTS "Patients can update their own orders" ON public.pharmacy_orders;
CREATE POLICY "Patients can update their own orders"
ON public.pharmacy_orders
FOR UPDATE
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- 3. Improve notify trigger (handles ready / picked_up / completed wording)
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.patient_id,
      CASE
        WHEN NEW.status = 'confirmed' THEN 'Agizo Limekubaliwa'
        WHEN NEW.status = 'ready' THEN 'Dawa Ziko Tayari Kuchukuliwa 📦'
        WHEN NEW.status = 'dispatched' THEN 'Agizo Limetumwa kwa Mtoaji 🛵'
        WHEN NEW.status = 'picked_up' THEN 'Agizo Limechukuliwa ✅'
        WHEN NEW.status = 'completed' THEN 'Agizo Limekamilika'
        WHEN NEW.status = 'cancelled' THEN 'Agizo Limeghairiwa'
        ELSE 'Hali ya Agizo Imebadilika'
      END,
      CASE
        WHEN NEW.status = 'confirmed' THEN CONCAT('Agizo lako la ', NEW.medicine_name, ' limekubaliwa.')
        WHEN NEW.status = 'ready' THEN CONCAT('Dawa ', NEW.medicine_name, ' ziko tayari. Namba: ', COALESCE(NEW.order_code, ''))
        WHEN NEW.status = 'dispatched' THEN CONCAT('Agizo limetumwa. Mtoaji: ', COALESCE(NEW.delivery_person_name,'—'), ' (', COALESCE(NEW.delivery_person_phone,'—'), ')')
        WHEN NEW.status = 'picked_up' THEN CONCAT('Agizo la ', NEW.medicine_name, ' limechukuliwa. Tafadhali thibitisha umepokea ili kukamilisha.')
        WHEN NEW.status = 'completed' THEN CONCAT('Asante! Agizo la ', NEW.medicine_name, ' limekamilika.')
        WHEN NEW.status = 'cancelled' THEN CONCAT('Agizo la ', NEW.medicine_name, ' limeghairiwa.')
        ELSE CONCAT('Hali ya agizo la ', NEW.medicine_name, ' imebadilika.')
      END,
      'pharmacy_order',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.pharmacy_orders;
CREATE TRIGGER trg_notify_order_status_change
AFTER UPDATE ON public.pharmacy_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- 4. Pharmacy lookup by code or customer name
CREATE OR REPLACE FUNCTION public.pharmacy_lookup_orders(_pharmacy_id uuid, _q text)
RETURNS TABLE (
  id uuid, order_code text, medicine_name text, quantity integer,
  status text, fulfillment_type text, total_price numeric,
  patient_first_name text, patient_last_name text, patient_phone text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT o.id, o.order_code, o.medicine_name, o.quantity, o.status,
         o.fulfillment_type, o.total_price,
         pr.first_name, pr.last_name,
         COALESCE(o.patient_phone, pr.phone) AS patient_phone,
         o.created_at
  FROM public.pharmacy_orders o
  LEFT JOIN public.profiles pr ON pr.id = o.patient_id
  WHERE o.pharmacy_id = _pharmacy_id
    AND EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = _pharmacy_id AND p.owner_id = auth.uid())
    AND (
      _q IS NULL OR btrim(_q) = ''
      OR upper(o.order_code) = upper(btrim(_q))
      OR o.order_code ILIKE '%'||_q||'%'
      OR pr.first_name ILIKE '%'||_q||'%'
      OR pr.last_name ILIKE '%'||_q||'%'
      OR COALESCE(o.patient_phone, pr.phone) ILIKE '%'||_q||'%'
    )
  ORDER BY o.created_at DESC
  LIMIT 50;
$$;

-- 5. Mark order as picked_up by code (used by QR scan)
CREATE OR REPLACE FUNCTION public.pharmacy_mark_picked_up(_pharmacy_id uuid, _order_code text)
RETURNS public.pharmacy_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_order public.pharmacy_orders;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pharmacies WHERE id = _pharmacy_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized for this pharmacy';
  END IF;

  UPDATE public.pharmacy_orders
  SET status = 'picked_up',
      picked_up_at = now(),
      updated_at = now()
  WHERE pharmacy_id = _pharmacy_id
    AND upper(order_code) = upper(btrim(_order_code))
    AND status NOT IN ('completed','cancelled')
  RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found or already completed';
  END IF;

  RETURN v_order;
END;
$$;
