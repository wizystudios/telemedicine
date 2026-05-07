
REVOKE EXECUTE ON FUNCTION public.wizy_list_my_orders(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wizy_unread_summary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wizy_recent_chats(uuid, int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.wizy_list_my_orders(uuid, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wizy_unread_summary(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wizy_recent_chats(uuid, int) TO authenticated, service_role;
