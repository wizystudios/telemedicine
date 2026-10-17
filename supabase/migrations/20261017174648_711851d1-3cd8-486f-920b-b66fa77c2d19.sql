DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.dashboard_timeseries'::regproc);
  d := replace(d, 'SELECT a.appointment_date::date AS d, count(*)::int AS n, COALESCE(sum(a.fee) FILTER (WHERE a.payment_status=''paid''),0) AS rev',
                  'SELECT (a.created_at AT TIME ZONE ''Africa/Dar_es_Salaam'')::date AS d, count(*)::int AS n, COALESCE(sum(a.fee) FILTER (WHERE a.payment_status=''paid'' AND a.status NOT IN (''cancelled'',''rejected'')),0) AS rev');
  d := replace(d, 'WHERE a.appointment_date >= _from', 'WHERE a.created_at >= _from AND a.consultation_type <> ''chat''');
  EXECUTE d;
END $$;