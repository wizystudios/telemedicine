import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Stethoscope, Building2, Pill, FlaskConical, MapPin, Bot, 
  Calendar, MessageCircle, Bell, FileText, Search, ChevronRight,
  Clock, Star, Heart, Activity
} from 'lucide-react';

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentDoctors, setRecentDoctors] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch unread notifications
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadNotifications(count || 0));

    // Fetch upcoming appointments
    supabase
      .from('appointments')
      .select(`*, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)`)
      .eq('patient_id', user.id)
      .in('status', ['scheduled', 'confirmed'])
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(3)
      .then(({ data }) => setUpcomingAppointments(data || []));

    // Subscribe to notifications
    const channel = supabase
      .channel('home-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => setUnreadNotifications(prev => prev + 1))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const firstName = user?.user_metadata?.first_name || 'Mgonjwa';

  const services = [
    { 
      icon: Stethoscope, 
      label: 'Madaktari', 
      desc: 'Tafuta & Ratiba', 
      path: '/doctors-list',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
    },
    { 
      icon: Building2, 
      label: 'Hospitali', 
      desc: 'Karibu nawe', 
      path: '/nearby',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
    },
    { 
      icon: Pill, 
      label: 'Famasi', 
      desc: 'Agiza dawa', 
      path: '/nearby',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
    },
    { 
      icon: FlaskConical, 
      label: 'Maabara', 
      desc: 'Panga kipimo', 
      path: '/nearby',
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' 
    },
  ];

  const quickActions = [
    { icon: Calendar, label: 'Miadi', path: '/appointments', count: upcomingAppointments.length },
    { icon: MessageCircle, label: 'Ujumbe', path: '/messages', count: 0 },
    { icon: Bell, label: 'Arifa', path: '/notifications', count: unreadNotifications },
    { icon: FileText, label: 'Dawa', path: '/prescriptions', count: 0 },
    { icon: Heart, label: 'Rekodi', path: '/medical-records', count: 0 },
    { icon: Activity, label: 'Profile', path: '/profile', count: 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-20 space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold">Habari, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">Unahitaji msaada gani leo?</p>
        </div>

        {/* AI Chatbot CTA */}
        <button
          onClick={() => navigate('/chatbot')}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-sm">Msaidizi wa AI</p>
            <p className="text-xs text-muted-foreground">Eleza dalili zako, pata ushauri</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border hover:bg-accent transition-colors relative"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium text-foreground">{action.label}</span>
              {action.count > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {action.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main Services */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Huduma</h2>
          <div className="grid grid-cols-2 gap-3">
            {services.map((service) => (
              <button
                key={service.label}
                onClick={() => navigate(service.path)}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left"
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${service.color}`}>
                  <service.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{service.label}</p>
                  <p className="text-[11px] text-muted-foreground">{service.desc}</p>
                </div>
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
                <Card key={apt.id} className="border">
                  <CardContent className="p-3 flex items-center gap-3">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Health Tips placeholder */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Vidokezo vya Afya</h2>
          <div className="grid grid-cols-1 gap-2">
            {[
              { title: 'Kunywa maji mengi', desc: 'Angalau glasi 8 kwa siku', icon: Heart },
              { title: 'Fanya mazoezi', desc: 'Dakika 30 kila siku', icon: Activity },
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <tip.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{tip.title}</p>
                  <p className="text-[11px] text-muted-foreground">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
