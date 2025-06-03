
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useOnlineStatus() {
  const { user } = useAuth();
  const [onlineDoctors, setOnlineDoctors] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch initial online doctors
    const fetchOnlineDoctors = async () => {
      const { data } = await supabase
        .from('doctor_online_status')
        .select(`
          *,
          doctor:profiles!doctor_online_status_doctor_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .eq('is_online', true);
      
      setOnlineDoctors(data || []);
    };

    fetchOnlineDoctors();

    // Set up real-time subscription
    const channel = supabase
      .channel('online-doctors')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctor_online_status'
        },
        () => {
          fetchOnlineDoctors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateOnlineStatus = async (isOnline: boolean, statusMessage?: string) => {
    if (user?.id) {
      await supabase.rpc('update_doctor_online_status', {
        is_online_param: isOnline,
        status_message_param: statusMessage
      });
    }
  };

  return { onlineDoctors, updateOnlineStatus };
}
