
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
      console.log('Fetching online doctors...');
      
      const { data, error } = await supabase
        .from('doctor_online_status')
        .select(`
          *,
          doctor:profiles!doctor_online_status_doctor_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            role,
            email,
            phone,
            country
          )
        `)
        .eq('is_online', true);
      
      if (error) {
        console.error('Error fetching online doctors:', error);
        setOnlineDoctors([]);
      } else {
        console.log('Online doctors fetched:', data?.length || 0);
        setOnlineDoctors(data || []);
      }
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
        (payload) => {
          console.log('Online status change:', payload);
          fetchOnlineDoctors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateOnlineStatus = async (isOnline: boolean, statusMessage?: string) => {
    if (!user?.id) {
      console.error('No user ID available for updating online status');
      return;
    }

    console.log('Updating online status:', { isOnline, statusMessage, userId: user.id });

    try {
      // First check if user is actually a doctor
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.role !== 'doctor') {
        console.error('User is not a doctor, cannot update online status');
        return;
      }

      const { data, error } = await supabase.rpc('update_doctor_online_status', {
        is_online_param: isOnline,
        status_message_param: statusMessage
      });

      if (error) {
        console.error('Error updating online status:', error);
      } else {
        console.log('Online status updated successfully');
      }
    } catch (error) {
      console.error('Exception updating online status:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data: currentStatus } = await supabase
        .from('doctor_online_status')
        .select('is_online')
        .eq('doctor_id', user.id)
        .single();
      
      const newStatus = !currentStatus?.is_online;
      await updateOnlineStatus(newStatus);
    } catch (error) {
      console.error('Error toggling online status:', error);
    }
  };

  return { onlineDoctors, updateOnlineStatus, toggleOnlineStatus };
}
