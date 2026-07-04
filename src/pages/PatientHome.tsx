import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope, Building2, Pill, FlaskConical, Clock,
  ChevronRight, MapPin, Bell
} from 'lucide-react';
import { AdBanner } from '@/components/AdBanner';
import { HealthTipCard } from '@/components/HealthTipCard';
import { UniversalSearch } from '@/components/UniversalSearch';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { NextStepNudge } from '@/components/NextStepNudge';

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [latestNotif, setLatestNotif] = useState<any | null>(null);
  const { count: unreadCount } = useUnreadNotifications();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('appointments')
      .select(`*, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)`)
      .eq('patient_id', user.id)
      .in('status', ['scheduled', 'confirmed', 'approved'])
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(2)
      .then(({ data }) => setUpcomingAppointments(data || []));

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setLatestNotif(data?.[0] || null));
  }, [user, unreadCount]);

  const services = [
    { icon: Stethoscope, label: 'Madaktari', path: '/doctors-list' },
    { icon: Building2, label: 'Hospitali', path: '/nearby?type=hospitals' },
    { icon: Pill, label: 'Famasi', path: '/marketplace' },
    { icon: FlaskConical, label: 'Maabara', path: '/nearby?type=laboratories' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">
      <UniversalSearch placeholder="Tafuta daktari, hospitali, dawa..." global />

      <AdBanner page="home" />
      <HealthTipCard />

      {/* Services */}
      <div className="grid grid-cols-4 gap-2">
        {services.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.path)}
            className="flex flex-col items-center gap-1.5 py-2 transition-transform active:scale-95"
          >
            <s.icon className="h-6 w-6 text-foreground" strokeWidth={1.6} />
            <span className="text-[11px] font-medium text-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Miadi Ijayo</h2>
            <button onClick={() => navigate('/appointments')} className="text-xs text-primary font-medium flex items-center gap-0.5">
              Zote <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-3 py-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={apt.doctor?.avatar_url} />
                  <AvatarFallback className="text-xs bg-muted text-foreground font-semibold">
                    {apt.doctor?.first_name?.[0]}{apt.doctor?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Dk. {apt.doctor?.first_name} {apt.doctor?.last_name}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    {new Date(apt.appointment_date).toLocaleDateString('sw-TZ', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <Badge
                  variant={apt.status === 'confirmed' || apt.status === 'approved' ? 'default' : 'secondary'}
                  className="text-[10px] shrink-0"
                >
                  {apt.status === 'confirmed' || apt.status === 'approved' ? 'Imeidhinishwa' : 'Inasubiri'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby */}
      <button onClick={() => navigate('/nearby')} className="w-full flex items-center gap-3 py-2">
        <MapPin className="h-5 w-5 text-foreground" strokeWidth={1.6} />
        <div className="text-left flex-1">
          <p className="text-sm font-medium">Vituo Karibu Nawe</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Notifications quick-access (replaces previous gap) */}
      <button
        onClick={() => navigate('/notifications')}
        className="w-full rounded-2xl border border-border bg-card p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
      >
        <div className="relative h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-primary" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold">Arifa zako</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {latestNotif ? latestNotif.title : 'Hakuna arifa mpya'}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Sponsored / Wizy promo strip */}
      <AdBanner page="home-secondary" />
    </div>
  );
}
