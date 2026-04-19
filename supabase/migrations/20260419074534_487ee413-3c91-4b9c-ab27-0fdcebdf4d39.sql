-- Notify patient when their appointment is created (booking confirmation)
CREATE OR REPLACE FUNCTION public.notify_appointment_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    NEW.patient_id,
    'Ombi la Miadi Limetumwa ✅',
    'Ombi lako la miadi limetumwa kwa daktari. Utapata jibu hivi karibuni.',
    'appointment',
    NEW.id
  );
  -- Also notify the doctor
  IF NEW.doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.doctor_id,
      'Ombi Jipya la Miadi 📅',
      'Mgonjwa ameomba miadi nawe. Tafadhali kagua na uthibitishe.',
      'appointment',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_appointment_created ON public.appointments;
CREATE TRIGGER trg_notify_appointment_created
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_created();

-- Ensure status-change trigger exists
DROP TRIGGER IF EXISTS trg_notify_appointment_status ON public.appointments;
CREATE TRIGGER trg_notify_appointment_status
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_status_change();

-- Notify when a new chat message arrives
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
BEGIN
  SELECT CASE WHEN a.patient_id = NEW.sender_id THEN a.doctor_id ELSE a.patient_id END
  INTO recipient_id
  FROM public.appointments a WHERE a.id = NEW.appointment_id;

  IF recipient_id IS NULL THEN RETURN NEW; END IF;

  SELECT CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))
  INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, title, message, type, related_id, appointment_id)
  VALUES (
    recipient_id,
    CONCAT('Ujumbe Mpya kutoka ', COALESCE(NULLIF(TRIM(sender_name),''), 'mtumiaji')),
    LEFT(COALESCE(NEW.message, 'Faili imetumwa'), 80),
    'message',
    NEW.id,
    NEW.appointment_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_new_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_chat_message();

-- Ensure pharmacy / lab notification triggers exist
DROP TRIGGER IF EXISTS trg_notify_pharmacy_new_order ON public.pharmacy_orders;
CREATE TRIGGER trg_notify_pharmacy_new_order
AFTER INSERT ON public.pharmacy_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_pharmacy_new_order();

DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.pharmacy_orders;
CREATE TRIGGER trg_notify_order_status_change
AFTER UPDATE ON public.pharmacy_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

DROP TRIGGER IF EXISTS trg_notify_lab_new_booking ON public.lab_bookings;
CREATE TRIGGER trg_notify_lab_new_booking
AFTER INSERT ON public.lab_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_lab_new_booking();

DROP TRIGGER IF EXISTS trg_notify_lab_booking_status_change ON public.lab_bookings;
CREATE TRIGGER trg_notify_lab_booking_status_change
AFTER UPDATE ON public.lab_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_lab_booking_status_change();