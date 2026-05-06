-- 1. Fix notifications type constraint to allow all in-app notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IS NULL OR type = ANY (ARRAY[
    'info','reminder','appointment','appointment_request','prescription',
    'message','pharmacy_order','lab_booking','patient_problem',
    'pending_action','call','review','system'
  ]));

-- 2. Drop duplicate pharmacy_orders triggers (keep one of each)
DROP TRIGGER IF EXISTS trg_notify_order_status ON public.pharmacy_orders;
DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.pharmacy_orders;
DROP TRIGGER IF EXISTS trg_notify_pharmacy_new_order ON public.pharmacy_orders;
DROP TRIGGER IF EXISTS trg_notify_pharmacy_order ON public.pharmacy_orders;