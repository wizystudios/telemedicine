
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  Video,
  Clock,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get user role from database
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch real dashboard statistics
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, userProfile?.role],
    queryFn: async () => {
      if (!user?.id || !userProfile?.role) return null;

      const stats: any = {};

      if (userProfile.role === 'doctor') {
        // Fetch doctor-specific statistics
        const [appointmentsResult, patientsResult, messagesResult] = await Promise.all([
          supabase
            .from('appointments')
            .select('id, status')
            .eq('doctor_id', user.id),
          supabase
            .from('appointments')
            .select('patient_id')
            .eq('doctor_id', user.id)
            .not('patient_id', 'is', null),
          supabase
            .from('chat_messages')
            .select('id')
            .eq('sender_id', user.id)
        ]);

        // Get unique patients count
        const uniquePatients = new Set(patientsResult.data?.map(a => a.patient_id) || []);
        
        stats.todayAppointments = appointmentsResult.data?.filter(apt => 
          apt.status === 'scheduled' || apt.status === 'confirmed'
        ).length || 0;
        stats.totalPatients = uniquePatients.size;
        stats.unreadMessages = messagesResult.data?.length || 0;
        stats.videoCalls = appointmentsResult.data?.filter(apt => 
          apt.status === 'completed'
        ).length || 0;
        
      } else if (userProfile.role === 'patient') {
        // Fetch patient-specific statistics
        const [appointmentsResult, doctorsResult, messagesResult, recordsResult] = await Promise.all([
          supabase
            .from('appointments')
            .select('id, status, appointment_date')
            .eq('patient_id', user.id),
          supabase
            .from('saved_doctors')
            .select('id')
            .eq('patient_id', user.id),
          supabase
            .from('chat_messages')
            .select('id')
            .eq('sender_id', user.id),
          supabase
            .from('medical_records')
            .select('id')
            .eq('patient_id', user.id)
        ]);

        const today = new Date().toISOString().split('T')[0];
        
        stats.todayAppointments = appointmentsResult.data?.filter(apt => 
          apt.appointment_date && apt.appointment_date.startsWith(today)
        ).length || 0;
        stats.savedDoctors = doctorsResult.data?.length || 0;
        stats.messages = messagesResult.data?.length || 0;
        stats.medicalRecords = recordsResult.data?.length || 0;
      }

      return stats;
    },
    enabled: !!user?.id && !!userProfile?.role
  });

  const userRole = userProfile?.role || user?.user_metadata?.role;
  const userName = userProfile?.first_name || user?.user_metadata?.first_name || 'Mtumiaji';

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Karibu, {userName}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {userRole === 'doctor' ? 'Daktari Dashboard' : 'Mgonjwa Dashboard'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {userRole === 'doctor' ? (
                <>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.todayAppointments || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Miadi ya Leo</p>
                    </CardContent>
                  </Card>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <Users className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.totalPatients || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Wagonjwa</p>
                    </CardContent>
                  </Card>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <MessageCircle className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.unreadMessages || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Ujumbe</p>
                    </CardContent>
                  </Card>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <Video className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.videoCalls || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Video Calls</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.todayAppointments || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Miadi ya Leo</p>
                    </CardContent>
                  </Card>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <Star className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.savedDoctors || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Madaktari Niliyohifadhi</p>
                    </CardContent>
                  </Card>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <MessageCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.messages || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Mazungumzo</p>
                    </CardContent>
                  </Card>
                  <Card className="p-3">
                    <CardContent className="p-0 text-center">
                      <Activity className="w-6 h-6 text-red-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {dashboardStats?.medicalRecords || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Rekodi za Matibabu</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vitendo vya Haraka</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="outline" 
                    className="justify-start h-12"
                    onClick={() => navigate(userRole === 'doctor' ? '/patients' : '/doctors')}
                  >
                    <Users className="w-4 h-4 mr-3" />
                    {userRole === 'doctor' ? 'Ona Wagonjwa' : 'Tafuta Madaktari'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start h-12"
                    onClick={() => navigate('/appointments')}
                  >
                    <Calendar className="w-4 h-4 mr-3" />
                    Miadi
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start h-12"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageCircle className="w-4 h-4 mr-3" />
                    Ujumbe
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Shughuli za Hivi Karibuni</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Hakuna shughuli za hivi karibuni
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
