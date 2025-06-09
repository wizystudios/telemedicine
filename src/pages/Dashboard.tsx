
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationsList } from '@/components/NotificationsList';
import { CallInterface } from '@/components/CallInterface';
import { 
  Calendar, 
  MessageCircle, 
  Users, 
  Heart,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  
  console.log('Dashboard - Current user:', user);
  console.log('Dashboard - User role:', user?.user_metadata?.role);

  // Get user role from metadata
  const userRole = user?.user_metadata?.role || 'patient';

  // Get total counts from profiles table by role
  const { data: profileCounts } = useQuery({
    queryKey: ['profile-counts'],
    queryFn: async () => {
      console.log('Fetching profile counts by role...');
      
      const [doctorsResult, patientsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'doctor'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'patient')
      ]);
      
      console.log('Doctors count from profiles:', doctorsResult.count);
      console.log('Patients count from profiles:', patientsResult.count);
      
      return {
        totalDoctors: doctorsResult.count || 0,
        totalPatients: patientsResult.count || 0
      };
    }
  });

  // Get online doctors count
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

  const renderDoctorDashboard = () => (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miadi Ya Leo</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">Iliyopangwa leo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wagonjwa</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileCounts?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">Waliojisajili</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hali Mtandaoni</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${stats?.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">
                {stats?.isOnline ? 'Mtandaoni' : 'Nje ya mtandao'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Inaonekana kwa wagonjwa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ujumbe</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unreadMessages || 0}</div>
            <p className="text-xs text-muted-foreground">Ujumbe mpya</p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  const renderPatientDashboard = () => (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miadi Ijayo</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">Wiki hii</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Madaktari Waliohifadhiwa</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.savedDoctors || 0}</div>
            <p className="text-xs text-muted-foreground">Unaowapenda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Madaktari Jumla</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileCounts?.totalDoctors || 0}</div>
            <p className="text-xs text-muted-foreground">Waliojisajili</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Madaktari Mtandaoni</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {onlineDoctors?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Wanapatikana sasa</p>
          </CardContent>
        </Card>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <CallInterface />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <Badge variant={userRole === 'doctor' ? 'default' : 'secondary'}>
              {userRole === 'doctor' ? '🩺 Daktari' : '👤 Mgonjwa'}
            </Badge>
          </div>
        </div>

        {userRole === 'doctor' ? renderDoctorDashboard() : renderPatientDashboard()}

        <div className="grid grid-cols-1 gap-6">
          <NotificationsList />
        </div>
      </div>
    </div>
  );
}
