REVOKE ALL ON FUNCTION public.is_admin_or_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;