
-- Pharmacy Orders table
CREATE TABLE public.pharmacy_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.pharmacy_medicines(id),
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC,
  notes TEXT,
  prescription_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;

-- Patients can create orders
CREATE POLICY "Patients can create pharmacy orders"
  ON public.pharmacy_orders FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Patients can view their own orders
CREATE POLICY "Patients can view their orders"
  ON public.pharmacy_orders FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Pharmacy owners can view orders for their pharmacy
CREATE POLICY "Pharmacy owners can view their orders"
  ON public.pharmacy_orders FOR SELECT
  TO authenticated
  USING (pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid()));

-- Pharmacy owners can update order status
CREATE POLICY "Pharmacy owners can update orders"
  ON public.pharmacy_orders FOR UPDATE
  TO authenticated
  USING (pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid()));

-- Lab Bookings table
CREATE TABLE public.lab_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  laboratory_id UUID NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.laboratory_services(id),
  test_name TEXT NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  result_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_bookings ENABLE ROW LEVEL SECURITY;

-- Patients can create lab bookings
CREATE POLICY "Patients can create lab bookings"
  ON public.lab_bookings FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Patients can view their own bookings
CREATE POLICY "Patients can view their lab bookings"
  ON public.lab_bookings FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Lab owners can view bookings for their lab
CREATE POLICY "Lab owners can view their bookings"
  ON public.lab_bookings FOR SELECT
  TO authenticated
  USING (laboratory_id IN (SELECT id FROM public.laboratories WHERE owner_id = auth.uid()));

-- Lab owners can update booking status
CREATE POLICY "Lab owners can update bookings"
  ON public.lab_bookings FOR UPDATE
  TO authenticated
  USING (laboratory_id IN (SELECT id FROM public.laboratories WHERE owner_id = auth.uid()));

-- Trigger to notify pharmacy of new order
CREATE OR REPLACE FUNCTION public.notify_pharmacy_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT owner_id, 'Agizo Jipya la Dawa',
    CONCAT('Mgonjwa ameagiza ', NEW.medicine_name, ' (x', NEW.quantity, ')'),
    'pharmacy_order', NEW.id
  FROM public.pharmacies WHERE id = NEW.pharmacy_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pharmacy_order_created
AFTER INSERT ON public.pharmacy_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_pharmacy_new_order();

-- Trigger to notify lab of new booking
CREATE OR REPLACE FUNCTION public.notify_lab_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT owner_id, 'Kipimo Kipya Kimeombwa',
    CONCAT('Mgonjwa ameomba kipimo: ', NEW.test_name),
    'lab_booking', NEW.id
  FROM public.laboratories WHERE id = NEW.laboratory_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lab_booking_created
AFTER INSERT ON public.lab_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_lab_new_booking();

-- Trigger to notify patient when order/booking status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.patient_id,
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Agizo Limekubaliwa'
        WHEN NEW.status = 'ready' THEN 'Dawa Zako Ziko Tayari'
        WHEN NEW.status = 'completed' THEN 'Agizo Limekamilika'
        WHEN NEW.status = 'cancelled' THEN 'Agizo Limeghairiwa'
        ELSE 'Hali ya Agizo Imebadilika'
      END,
      CASE
        WHEN NEW.status = 'confirmed' THEN CONCAT('Agizo lako la ', NEW.medicine_name, ' limekubaliwa')
        WHEN NEW.status = 'ready' THEN CONCAT('Dawa ', NEW.medicine_name, ' ziko tayari kuchukuliwa')
        WHEN NEW.status = 'completed' THEN CONCAT('Agizo la ', NEW.medicine_name, ' limekamilika')
        WHEN NEW.status = 'cancelled' THEN CONCAT('Agizo la ', NEW.medicine_name, ' limeghairiwa')
        ELSE CONCAT('Hali ya agizo la ', NEW.medicine_name, ' imebadilika')
      END,
      'pharmacy_order',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pharmacy_order_status_change
AFTER UPDATE ON public.pharmacy_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

CREATE OR REPLACE FUNCTION public.notify_lab_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.patient_id,
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Kipimo Kimekubaliwa'
        WHEN NEW.status = 'results_ready' THEN 'Matokeo ya Kipimo Yamekuja'
        WHEN NEW.status = 'completed' THEN 'Kipimo Kimekamilika'
        WHEN NEW.status = 'cancelled' THEN 'Kipimo Kimeghairiwa'
        ELSE 'Hali ya Kipimo Imebadilika'
      END,
      CASE
        WHEN NEW.status = 'confirmed' THEN CONCAT('Kipimo chako cha ', NEW.test_name, ' kimekubaliwa')
        WHEN NEW.status = 'results_ready' THEN CONCAT('Matokeo ya ', NEW.test_name, ' yako tayari')
        WHEN NEW.status = 'completed' THEN CONCAT('Kipimo cha ', NEW.test_name, ' kimekamilika')
        WHEN NEW.status = 'cancelled' THEN CONCAT('Kipimo cha ', NEW.test_name, ' kimeghairiwa')
        ELSE CONCAT('Hali ya kipimo cha ', NEW.test_name, ' imebadilika')
      END,
      'lab_booking',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lab_booking_status_change
AFTER UPDATE ON public.lab_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_lab_booking_status_change();
