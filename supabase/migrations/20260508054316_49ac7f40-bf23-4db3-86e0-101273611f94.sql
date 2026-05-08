
REVOKE ALL ON FUNCTION public.pharmacy_lookup_orders(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pharmacy_lookup_orders(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.pharmacy_mark_picked_up(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pharmacy_mark_picked_up(uuid, text) TO authenticated;
