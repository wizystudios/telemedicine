import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if the logged-in user has must_change_password=true and
 * redirects them to /force-password-change. Skips check on auth pages.
 */
export function PasswordChangeGuard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) { setChecked(false); return; }
    if (checked) return;
    if (location.pathname === '/force-password-change' ||
        location.pathname === '/auth' ||
        location.pathname === '/reset-password') return;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .maybeSingle();
      setChecked(true);
      if ((data as any)?.must_change_password) {
        navigate('/force-password-change', { replace: true });
      }
    })();
  }, [user, location.pathname, checked, navigate]);

  return null;
}
