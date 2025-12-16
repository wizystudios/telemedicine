import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, MessageCircle, Users, Clock, CheckCircle, XCircle, 
  Video, Phone, Activity, Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { updateOnlineStatus } = useOnlineStatus();
  
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({ today: 0, pending: 0, completed: 0, rating: 0 });
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
      fetchOnlineStatus();
    }
  }, [user?.id]);

  const fetchOnlineStatus = async () => {
    const { data } = await supabase
      .from('doctor_online_status')
      .select('is_online')
      .eq('doctor_id', user?.id)
      .single();
    setIsOnline(data?.is_online || false);
  };

  const handleOnlineToggle = async (online: boolean) => {
    setIsOnline(online);
    await updateOnlineStatus(online);
  };

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch pending appointments
      const { data: pending } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url)')
        .eq('doctor_id', user?.id)
        .eq('status', 'pending')
        .order('appointment_date', { ascending: true })
        .limit(5);

      // Fetch today's confirmed appointments
      const { data: todayAppts } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url)')
        .eq('doctor_id', user?.id)
        .gte('appointment_date', today)
        .lt('appointment_date', today + 'T23:59:59')
        .order('appointment_date', { ascending: true });

      // Fetch stats
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user?.id)
        .gte('appointment_date', today);

      const { count: completedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user?.id)
        .eq('status', 'completed')
        .gte('appointment_date', today);

      // Fetch doctor rating
      const { data: doctorProfile } = await supabase
        .from('doctor_profiles')
        .select('rating')
        .eq('user_id', user?.id)
        .single();

      setPendingAppointments(pending || []);
      setTodayAppointments(todayAppts || []);
      setStats({
        today: todayCount || 0,
        pending: pending?.length || 0,
        completed: completedCount || 0,
        rating: doctorProfile?.rating || 0
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointment = async (id: string, status: 'confirmed' | 'cancelled') => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Kosa', description: 'Imeshindikana', variant: 'destructive' });
    } else {
      toast({ title: 'Imefanikiwa', description: status === 'confirmed' ? 'Miadi imekubaliwa' : 'Miadi imekataliwa' });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Habari, Dr. {user?.user_metadata?.first_name}</h1>
          <p className="text-xs text-muted-foreground">Dashboard yako</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Online</span>
          <Switch checked={isOnline} onCheckedChange={handleOnlineToggle} />
          <Badge variant={isOnline ? 'default' : 'secondary'} className="text-[10px]">
            {isOnline ? 'Mtandaoni' : 'Nje'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Leo', value: stats.today, icon: Users, color: 'text-blue-500' },
          { label: 'Inasubiri', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Imekamilika', value: stats.completed, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Rating', value: stats.rating.toFixed(1), icon: Activity, color: 'text-purple-500' },
        ].map((s, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Requests */}
      {pendingAppointments.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Maombi ({pendingAppointments.length})
            </h3>
            <div className="space-y-2">
              {pendingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={apt.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {apt.profiles?.first_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {apt.profiles?.first_name} {apt.profiles?.last_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(apt.appointment_date).toLocaleDateString('sw-TZ')}
                      {apt.consultation_type === 'video' ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleAppointment(apt.id, 'cancelled')}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="h-7 w-7 p-0" onClick={() => handleAppointment(apt.id, 'confirmed')}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Leo ({todayAppointments.length})
          </h3>
          {todayAppointments.length > 0 ? (
            <div className="space-y-2">
              {todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={apt.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary/10">
                      {apt.profiles?.first_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {apt.profiles?.first_name} {apt.profiles?.last_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(apt.appointment_date).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'} className="text-[10px]">
                    {apt.status}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => navigate(`/messages?patient=${apt.patient_id}`)}>
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center text-muted-foreground py-4">Hakuna miadi leo</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/appointments')}>
          <Calendar className="h-4 w-4" />
          <span className="text-[10px]">Miadi</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/patients')}>
          <Users className="h-4 w-4" />
          <span className="text-[10px]">Wagonjwa</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/messages')}>
          <MessageCircle className="h-4 w-4" />
          <span className="text-[10px]">Ujumbe</span>
        </Button>
      </div>
    </div>
  );
}
