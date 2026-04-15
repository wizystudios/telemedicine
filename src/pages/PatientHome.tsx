import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, Building2, Pill, FlaskConical, Clock, 
  ChevronRight, Search, MapPin
} from 'lucide-react';

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, [user]);

  const services = [
    { icon: Stethoscope, label: 'Madaktari', desc: 'Tafuta daktari', path: '/doctors-list', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' },
    { icon: Building2, label: 'Hospitali', desc: 'Karibu nawe', path: '/nearby', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' },
    { icon: Pill, label: 'Famasi', desc: 'Agiza dawa', path: '/nearby', color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' },
    { icon: FlaskConical, label: 'Maabara', desc: 'Vipimo', path: '/nearby', color: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400' },
  ];

  const firstName = user?.user_metadata?.first_name || '';

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-6">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tafuta daktari, hospitali, dawa..."
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Services */}
      <div className="grid grid-cols-2 gap-3">
        {services.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.path)}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left group"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.color} transition-transform group-hover:scale-105`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-[11px] text-muted-foreground">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Miadi Ijayo</h2>
            <button onClick={() => navigate('/appointments')} className="text-xs text-primary font-medium flex items-center gap-0.5">
              Zote <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={apt.doctor?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {apt.doctor?.first_name?.[0]}{apt.doctor?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Dk. {apt.doctor?.first_name} {apt.doctor?.last_name}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
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

      {/* Nearby Facilities */}
      <button 
        onClick={() => navigate('/nearby')}
        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10 hover:border-primary/20 transition-all"
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">Vituo Karibu Nawe</p>
          <p className="text-[11px] text-muted-foreground">Hospitali, famasi na maabara</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
