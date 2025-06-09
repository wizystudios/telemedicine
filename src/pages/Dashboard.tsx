import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotificationsList } from '@/components/NotificationsList';
import { CallInterface } from '@/components/CallInterface';
import { 
  Calendar, 
  MessageCircle, 
  Users, 
  Heart,
  Clock,
  Activity,
  FileText,
  CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  
  console.log('Dashboard - Current user:', user);
  console.log('Dashboard - User role:', user?.user_metadata?.role);
  console.log('Dashboard - User metadata:', user?.user_metadata);

  // Get user role from metadata
  const userRole = user?.user_metadata?.role || 'patient';

  // Get total counts from profiles table
  const { data: profileCounts } = useQuery({
    queryKey: ['profile-counts'],
    queryFn: async () => {
      console.log('Fetching profile counts...');
      
      const [doctorsResult, patientsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'doctor'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'patient')
      ]);
      
      console.log('Doctors count:', doctorsResult.count);
      console.log('Patients count:', patientsResult.count);
      
      return {
        totalDoctors: doctorsResult.count || 0,
        totalPatients: patientsResult.count || 0
      };
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id, userRole],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      if (userRole === 'doctor') {
        console.log('Fetching doctor stats for user:', user?.id);
        
        const [appointments, messages, onlineStatus, totalPatients] = await Promise.all([
          supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', user.id)
            .gte('appointment_date', today),
          supabase
            .from('chat_messages')
            .select('*, appointment:appointments!inner(doctor_id)')
            .eq('appointment.doctor_id', user.id)
            .eq('is_read', false),
          supabase
            .from('doctor_online_status')
            .select('*')
            .eq('doctor_id', user.id)
            .single(),
          supabase
            .from('appointments')
            .select('patient_id')
            .eq('doctor_id', user.id)
            .eq('status', 'completed')
        ]);
        
        const uniquePatients = new Set(totalPatients.data?.map(a => a.patient_id)).size;
        
        return {
          upcomingAppointments: appointments.data?.length || 0,
          unreadMessages: messages.data?.length || 0,
          isOnline: onlineStatus.data?.is_online || false,
          totalPatients: uniquePatients,
          pendingAppointments: appointments.data?.filter(a => a.status === 'scheduled').length || 0,
          completedToday: appointments.data?.filter(a => a.status === 'completed').length || 0
        };
      } else {
        console.log('Fetching patient stats for user:', user?.id);
        
        const [appointments, messages, savedDoctors, prescriptions] = await Promise.all([
          supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', user.id)
            .gte('appointment_date', today),
          supabase
            .from('chat_messages')
            .select('*, appointment:appointments!inner(patient_id)')
            .eq('appointment.patient_id', user.id)
            .eq('is_read', false),
          supabase
            .from('saved_doctors')
            .select('*')
            .eq('patient_id', user.id),
          supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', user.id)
            .not('prescription', 'is', null)
        ]);
        
        return {
          upcomingAppointments: appointments.data?.length || 0,
          unreadMessages: messages.data?.length || 0,
          savedDoctors: savedDoctors.data?.length || 0,
          totalConsultations: appointments.data?.filter(a => a.status === 'completed').length || 0,
          prescriptions: prescriptions.data?.length || 0
        };
      }
    },
    enabled: !!user?.id
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity', user?.id, userRole],
    queryFn: async () => {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
          doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)
        `)
        .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      return appointments || [];
    },
    enabled: !!user?.id
  });

  const { data: onlineDoctors } = useQuery({
    queryKey: ['online-doctors-count'],
    queryFn: async () => {
      console.log('Fetching online doctors count...');
      
      const { data, error } = await supabase
        .from('doctor_online_status')
        .select('*, doctor:profiles!doctor_online_status_doctor_id_fkey(first_name, last_name)')
        .eq('is_online', true);
      
      if (error) {
        console.error('Error fetching online doctors:', error);
        return [];
      }
      
      console.log('Online doctors found:', data?.length || 0);
      return data || [];
    },
    enabled: userRole === 'patient'
  });

  const renderDoctorDashboard = () => (
    <>
      {/* Doctor Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileCounts?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${stats?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">
                {stats?.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Visible to patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unreadMessages || 0}</div>
            <p className="text-xs text-muted-foreground">New messages</p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderPatientDashboard = () => (
    <>
      {/* Patient Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Doctors</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.savedDoctors || 0}</div>
            <p className="text-xs text-muted-foreground">Your favorites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileCounts?.totalDoctors || 0}</div>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Doctors</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {onlineDoctors?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Available now</p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <CallInterface />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.user_metadata?.first_name || 'User'}!
          </h1>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant={userRole === 'doctor' ? 'default' : 'secondary'}>
              {userRole === 'doctor' ? '🩺 Doctor' : '👤 Patient'}
            </Badge>
            <p className="text-gray-600 dark:text-gray-300">
              {userRole === 'doctor' 
                ? 'Ready to help your patients today?'
                : 'Your health is our priority'
              }
            </p>
          </div>
        </div>

        {/* Role-based dashboard content */}
        {userRole === 'doctor' ? renderDoctorDashboard() : renderPatientDashboard()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((appointment) => {
                    const otherUser = user?.id === appointment.patient_id 
                      ? appointment.doctor 
                      : appointment.patient;
                    
                    return (
                      <div key={appointment.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherUser?.avatar_url} />
                          <AvatarFallback>
                            {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {userRole === 'doctor' ? 'Consultation with' : 'Appointment with'} {otherUser?.first_name} {otherUser?.last_name}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {appointment.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(appointment.appointment_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <NotificationsList />
        </div>
      </div>
    </div>
  );
}
