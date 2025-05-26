
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  Video, 
  MessageCircle, 
  Heart, 
  Activity,
  Users,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedConsultations: 0,
    unreadMessages: 0,
    upcomingToday: 0
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUpcomingAppointments();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(data);
  };

  const fetchUpcomingAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url),
        patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
        specialty:specialties(name)
      `)
      .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`)
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(3);
    
    setUpcomingAppointments(data || []);
  };

  const fetchStats = async () => {
    // Fetch total appointments
    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`);

    // Fetch completed consultations
    const { count: completedConsultations } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`)
      .eq('status', 'completed');

    // Fetch unread messages
    const { count: unreadMessages } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);

    // Fetch today's appointments
    const today = new Date().toISOString().split('T')[0];
    const { count: upcomingToday } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`)
      .gte('appointment_date', today)
      .lt('appointment_date', today + 'T23:59:59');

    setStats({
      totalAppointments: totalAppointments || 0,
      completedConsultations: completedConsultations || 0,
      unreadMessages: unreadMessages || 0,
      upcomingToday: upcomingToday || 0
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!profile) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile.first_name}!
        </h1>
        <p className="text-gray-600">
          {profile.role === 'doctor' ? 'Ready to help your patients today?' : 'How can we help you today?'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                <p className="text-xs text-gray-600">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completedConsultations}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                <p className="text-xs text-gray-600">Unread Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.upcomingToday}</p>
                <p className="text-xs text-gray-600">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              {profile.role === 'doctor' ? 'Manage your practice' : 'Get the care you need'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.role === 'patient' ? (
              <>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/doctors')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Find a Doctor
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/appointments')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  My Appointments
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/messages')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Messages
                </Button>
              </>
            ) : (
              <>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/doctor/availability')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Set Availability
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/appointments')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Appointments
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/doctor/patients')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Patient Records
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your next scheduled consultations</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => {
                  const otherUser = profile.role === 'patient' ? appointment.doctor : appointment.patient;
                  return (
                    <div key={appointment.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={otherUser?.avatar_url} />
                        <AvatarFallback>
                          {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {profile.role === 'patient' ? 'Dr.' : ''} {otherUser?.first_name} {otherUser?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(appointment.appointment_date), 'MMM d, h:mm a')}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                          {appointment.specialty?.name && (
                            <span className="text-xs text-gray-500">
                              {appointment.specialty.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
