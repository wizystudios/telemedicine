
DROP TRIGGER IF EXISTS trg_notify_new_chat_message ON public.chat_messages;
DROP TRIGGER IF EXISTS trg_notify_appointment_status ON public.appointments;
DROP TRIGGER IF EXISTS trg_notify_lab_booking_status_change ON public.lab_bookings;
DROP TRIGGER IF EXISTS trg_notify_lab_new_booking ON public.lab_bookings;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.wizy_list_my_orders(_user_id uuid, _limit int DEFAULT 10)
RETURNS TABLE (id uuid, medicine_name text, quantity int, status text, total_price numeric, pharmacy_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.medicine_name, o.quantity, o.status, o.total_price, p.name, o.created_at
  FROM public.pharmacy_orders o
  LEFT JOIN public.pharmacies p ON p.id = o.pharmacy_id
  WHERE o.patient_id = _user_id
  ORDER BY o.created_at DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.wizy_unread_summary(_user_id uuid)
RETURNS TABLE (total_unread bigint, unread_messages bigint, unread_appointments bigint, unread_orders bigint, unread_other bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(*) FILTER (WHERE NOT is_read) AS total_unread,
    COUNT(*) FILTER (WHERE NOT is_read AND type = 'message') AS unread_messages,
    COUNT(*) FILTER (WHERE NOT is_read AND type IN ('appointment','appointment_request')) AS unread_appointments,
    COUNT(*) FILTER (WHERE NOT is_read AND type = 'pharmacy_order') AS unread_orders,
    COUNT(*) FILTER (WHERE NOT is_read AND type NOT IN ('message','appointment','appointment_request','pharmacy_order')) AS unread_other
  FROM public.notifications
  WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.wizy_recent_chats(_user_id uuid, _limit int DEFAULT 10)
RETURNS TABLE (other_id uuid, other_name text, last_message text, last_at timestamptz, unread_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH convs AS (
    SELECT a.id AS appt_id,
      CASE WHEN a.patient_id = _user_id THEN a.doctor_id ELSE a.patient_id END AS other_id
    FROM public.appointments a
    WHERE a.patient_id = _user_id OR a.doctor_id = _user_id
  ),
  last_msg AS (
    SELECT DISTINCT ON (c.other_id)
      c.other_id, cm.message, cm.created_at, cm.sender_id, cm.is_read, cm.appointment_id
    FROM convs c
    JOIN public.chat_messages cm ON cm.appointment_id = c.appt_id
    ORDER BY c.other_id, cm.created_at DESC
  )
  SELECT
    lm.other_id,
    TRIM(CONCAT(COALESCE(pr.first_name,''), ' ', COALESCE(pr.last_name,''))) AS other_name,
    lm.message AS last_message,
    lm.created_at AS last_at,
    (SELECT COUNT(*) FROM public.chat_messages cm2
       JOIN convs c2 ON c2.appt_id = cm2.appointment_id
       WHERE c2.other_id = lm.other_id AND cm2.sender_id <> _user_id AND cm2.is_read = false) AS unread_count
  FROM last_msg lm
  LEFT JOIN public.profiles pr ON pr.id = lm.other_id
  ORDER BY lm.created_at DESC
  LIMIT _limit;
$$;
