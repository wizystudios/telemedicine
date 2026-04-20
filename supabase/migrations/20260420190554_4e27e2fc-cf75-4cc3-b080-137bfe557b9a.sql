
-- ============ PASSWORD POLICY ============
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Force ALL existing users to change password on next login
UPDATE public.profiles SET must_change_password = true WHERE password_changed_at IS NULL;

-- ============ ORG STAFF (multi-user per shirika) ============
CREATE TABLE IF NOT EXISTS public.org_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type text NOT NULL CHECK (org_type IN ('hospital','pharmacy','laboratory','polyclinic')),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_type, org_id, user_id)
);

ALTER TABLE public.org_staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_type text, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _org_type
    WHEN 'hospital' THEN EXISTS(SELECT 1 FROM hospitals WHERE id = _org_id AND owner_id = _user_id)
    WHEN 'pharmacy' THEN EXISTS(SELECT 1 FROM pharmacies WHERE id = _org_id AND owner_id = _user_id)
    WHEN 'laboratory' THEN EXISTS(SELECT 1 FROM laboratories WHERE id = _org_id AND owner_id = _user_id)
    WHEN 'polyclinic' THEN EXISTS(SELECT 1 FROM polyclinics WHERE id = _org_id AND owner_id = _user_id)
    ELSE false END
$$;

CREATE POLICY "Owners manage staff" ON public.org_staff FOR ALL
  USING (public.is_org_owner(auth.uid(), org_type, org_id) OR is_super_admin(auth.uid()))
  WITH CHECK (public.is_org_owner(auth.uid(), org_type, org_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff view own membership" ON public.org_staff FOR SELECT
  USING (user_id = auth.uid());

-- ============ DELIVERY / ORDER LIFECYCLE ============
ALTER TABLE public.pharmacy_orders
  ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup','delivery')),
  ADD COLUMN IF NOT EXISTS pickup_time timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_person_name text,
  ADD COLUMN IF NOT EXISTS delivery_person_phone text,
  ADD COLUMN IF NOT EXISTS patient_phone text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Trigger updated_at
CREATE TRIGGER trg_org_staff_updated_at BEFORE UPDATE ON public.org_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTIFICATION TRIGGERS (re-attach since none currently active) ============
DROP TRIGGER IF EXISTS trg_notify_appointment_created ON public.appointments;
CREATE TRIGGER trg_notify_appointment_created AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_created();

DROP TRIGGER IF EXISTS trg_notify_appointment_status ON public.appointments;
CREATE TRIGGER trg_notify_appointment_status AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_status_change();

DROP TRIGGER IF EXISTS trg_notify_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_chat_message AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_chat_message();

DROP TRIGGER IF EXISTS trg_notify_pharmacy_order ON public.pharmacy_orders;
CREATE TRIGGER trg_notify_pharmacy_order AFTER INSERT ON public.pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_pharmacy_new_order();

DROP TRIGGER IF EXISTS trg_notify_order_status ON public.pharmacy_orders;
CREATE TRIGGER trg_notify_order_status AFTER UPDATE ON public.pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();
