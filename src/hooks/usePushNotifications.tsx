import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const TYPE_TO_URL: Record<string, string> = {
  pending_action: '/pending-actions',
  appointment: '/appointments',
  appointment_request: '/appointments',
  message: '/messages',
  pharmacy_order: '/my-orders',
  prescription: '/prescriptions',
  patient_problem: '/patient-problems',
  lab_booking: '/appointments',
};

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register SW once
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(reg => {
      swRegRef.current = reg;
    }).catch(err => console.warn('SW register failed', err));

    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'NAVIGATE' && e.data.url) navigate(e.data.url);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [navigate]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions & { url?: string },
  ) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const url = (options as any)?.url || '/';
    const payload = {
      title,
      body: options?.body || '',
      tag: options?.tag,
      icon: options?.icon || '/favicon.ico',
      url,
    };
    // Prefer SW (works even when tab is hidden / phone screen off)
    try {
      const reg = swRegRef.current || (await navigator.serviceWorker?.getRegistration());
      if (reg?.active) {
        reg.active.postMessage({ type: 'SHOW_NOTIFICATION', payload });
        return;
      }
      if (reg) {
        await reg.showNotification(title, {
          body: payload.body,
          tag: payload.tag,
          icon: payload.icon,
          badge: '/favicon.ico',
          data: { url },
        });
        return;
      }
    } catch {}
    // Fallback to in-page Notification
    const n = new Notification(title, { icon: '/favicon.ico', badge: '/favicon.ico', ...options });
    n.onclick = () => { window.focus(); navigate(url); n.close(); };
    setTimeout(() => n.close(), 6000);
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) return;

    requestPermission();

    const channel = supabase
      .channel('push-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        const url = TYPE_TO_URL[payload.new.type] || '/notifications';
        showNotification(payload.new.title, {
          body: payload.new.message,
          tag: payload.new.id,
          url,
        } as any);
      })
      .subscribe();

    const checkAppointments = async () => {
      const now = new Date();
      const in1Hour = new Date(now.getTime() + 60 * 60000);
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_doctor_id_fkey(first_name, last_name)')
        .eq('patient_id', user.id)
        .in('status', ['scheduled', 'confirmed'])
        .gte('appointment_date', now.toISOString())
        .lte('appointment_date', in1Hour.toISOString());

      appointments?.forEach((apt: any) => {
        const minutes = Math.floor((new Date(apt.appointment_date).getTime() - now.getTime()) / 60000);
        const name = `Dr. ${apt.profiles?.first_name || ''} ${apt.profiles?.last_name || ''}`.trim();
        if (minutes <= 15 && minutes > 10) {
          showNotification('Miadi Inakaribia!', { body: `Miadi na ${name} baada ya dakika ${minutes}`, tag: `apt-${apt.id}-15`, url: '/appointments' } as any);
        } else if (minutes <= 5 && minutes > 0) {
          showNotification('Miadi Sasa Hivi!', { body: `Miadi na ${name} inaanza baada ya dakika ${minutes}`, tag: `apt-${apt.id}-5`, url: '/appointments' } as any);
        }
      });
    };

    checkAppointments();
    const interval = setInterval(checkAppointments, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, requestPermission, showNotification]);

  return { requestPermission, showNotification };
}
