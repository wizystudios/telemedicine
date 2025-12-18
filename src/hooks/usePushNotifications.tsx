import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePushNotifications() {
  const { user } = useAuth();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }, []);

  // Subscribe to appointment reminders
  useEffect(() => {
    if (!user?.id) return;

    // Request permission on mount
    requestPermission();

    // Subscribe to new notifications
    const channel = supabase
      .channel('push-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        showNotification(payload.new.title, {
          body: payload.new.message,
          tag: payload.new.id,
        });
      })
      .subscribe();

    // Check for upcoming appointments every minute
    const checkAppointments = async () => {
      const now = new Date();
      const in15Min = new Date(now.getTime() + 15 * 60000);
      const in1Hour = new Date(now.getTime() + 60 * 60000);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_doctor_id_fkey(first_name, last_name)')
        .eq('patient_id', user.id)
        .in('status', ['scheduled', 'confirmed'])
        .gte('appointment_date', now.toISOString())
        .lte('appointment_date', in1Hour.toISOString());

      appointments?.forEach((apt) => {
        const aptDate = new Date(apt.appointment_date);
        const diff = aptDate.getTime() - now.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes <= 15 && minutes > 10) {
          showNotification('Miadi Inakaribia!', {
            body: `Miadi na Dr. ${apt.profiles?.first_name} ${apt.profiles?.last_name} baada ya dakika ${minutes}`,
            tag: `apt-${apt.id}-15`,
          });
        } else if (minutes <= 5 && minutes > 0) {
          showNotification('Miadi Sasa Hivi!', {
            body: `Miadi na Dr. ${apt.profiles?.first_name} ${apt.profiles?.last_name} inaanza baada ya dakika ${minutes}`,
            tag: `apt-${apt.id}-5`,
          });
        }
      });
    };

    // Check immediately and then every minute
    checkAppointments();
    const interval = setInterval(checkAppointments, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, requestPermission, showNotification]);

  return { requestPermission, showNotification };
}
