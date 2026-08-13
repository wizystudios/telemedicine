
REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, text, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_org_license(text, uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_backfill_directory(boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_license_queue() FROM anon;
