import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Stethoscope, Building2, Pill, FlaskConical,
  Clock, ChevronDown, ChevronUp, Heart, Activity
} from 'lucide-react';

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('appointments')
      .select(`*, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)`)
      .eq('patient_id', user.id)
      .in('status', ['scheduled', 'confirmed'])
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(3)
      .then(({ data }) => setUpcomingAppointments(data || []));
  }, [user]);

  const services = [
    { icon: Stethoscope, label: 'Madaktari', path: '/doctors-list' },
    { icon: Building2, label: 'Hospitali', path: '/nearby' },
    { icon: Pill, label: 'Famasi', path: '/nearby' },
    { icon: FlaskConical, label: 'Maabara', path: '/nearby' },
  ];

  const healthTips = [
    { 
      title: 'Kunywa maji mengi', 
      icon: Heart,
      desc: 'Maji husaidia mwili kufanya kazi vizuri. Kunywa angalau glasi 8 kwa siku kunasaidia figo, ngozi na ubongo kufanya kazi vizuri. Epuka vinywaji vya sukari nyingi.' 
    },
    { 
      title: 'Fanya mazoezi', 
      icon: Activity,
      desc: 'Mazoezi ya dakika 30 kila siku yanasaidia moyo, misuli na akili. Tembea, kimbia au fanya mazoezi nyepesi nyumbani. Anza polepole na ongeza hatua kwa hatua.' 
    },
    { 
      title: 'Lala vizuri', 
      icon: Clock,
      desc: 'Usingizi wa masaa 7-8 kwa siku ni muhimu kwa afya. Epuka simu kabla ya kulala, lala wakati uleule kila siku, na hakikisha chumba chako ni giza na kimya.' 
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20 space-y-6">

      {/* Services - icon + label only, no background */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Huduma</h2>
        <div className="grid grid-cols-4 gap-3">
          {services.map((s) => (
            <button
              key={s.label}
              onClick={() => navigate(s.path)}
              className="flex flex-col items-center gap-1.5 py-2 hover:opacity-70 transition-opacity"
            >
              <s.icon className="h-6 w-6 text-primary" />
              <span className="text-[11px] font-medium text-foreground">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Miadi Ijayo</h2>
            <button onClick={() => navigate('/appointments')} className="text-xs text-primary font-medium">
              Tazama zote
            </button>
          </div>
          <div className="space-y-2">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={apt.doctor?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {apt.doctor?.first_name?.[0]}{apt.doctor?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Dk. {apt.doctor?.first_name} {apt.doctor?.last_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(apt.appointment_date).toLocaleDateString('sw-TZ', { 
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>
                <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'} className="text-[10px]">
                  {apt.status === 'confirmed' ? 'Imeidhinishwa' : 'Inasubiri'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Tips - dropdown style, no box */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Vidokezo vya Afya</h2>
        <div className="space-y-1">
          {healthTips.map((tip, i) => (
            <div key={i}>
              <button
                onClick={() => setExpandedTip(expandedTip === i ? null : i)}
                className="w-full flex items-center justify-between py-3 px-1 text-left hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <tip.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{tip.title}</span>
                </div>
                {expandedTip === i ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedTip === i && (
                <p className="text-xs text-muted-foreground pl-7 pb-3 leading-relaxed animate-fade-in">
                  {tip.desc}
                </p>
              )}
              {i < healthTips.length - 1 && <div className="border-b border-border/50" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
