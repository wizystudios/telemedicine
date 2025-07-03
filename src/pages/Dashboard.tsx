
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
  Activity,
  Clock,
  UserPlus,
  Stethoscope
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  // Get user profile to check role from database
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
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

  // Check role from either database profile or user metadata
  const userRole = userProfile?.role || user?.user_metadata?.role;

  // Fetch dashboard statistics
  const { data: stats = { doctors: 0, patients: 0, appointments: 0, messages: 0 } } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [doctorsResult, patientsResult, appointmentsResult, messagesResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'doctor'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'patient'),
        supabase.from('appointments').select('id', { count: 'exact' }),
        supabase.from('chat_messages').select('id', { count: 'exact' })
      ]);

      return {
        doctors: doctorsResult.count || 0,
        patients: patientsResult.count || 0,
        appointments: appointmentsResult.count || 0,
        messages: messagesResult.count || 0
      };
    }
  });

  // Fetch recent activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching recent activities:', error);
        return [];
      }
      
      return data || [];
    }
  });

  const quickActions = userRole === 'doctor' ? [
    { icon: UserPlus, label: 'Wagonjwa Wapya', href: '/patients' },
    { icon: Calendar, label: 'Miadi ya Leo', href: '/appointments' },
    { icon: MessageCircle, label: 'Mazungumzo', href: '/messages' },
    { icon: Video, label: 'Video Call', href: '/appointments' }
  ] : [
    { icon: Stethoscope, label: 'Tafuta Daktari', href: '/doctors-list' },
    { icon: Calendar, label: 'Panga Miadi', href: '/book-appointment' },
    { icon: MessageCircle, label: 'Mazungumzo', href: '/messages' },
    { icon: Activity, label: 'Rekodi Zangu', href: '/profile' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">TeleMed</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Karibu, {user?.user_metadata?.first_name || 'Mtumiaji'}
          </p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
              {userRole === 'doctor' ? 'Daktari Dashboard' : 'Mgonjwa Dashboard'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {userRole === 'doctor' ? 'Miadi ya Leo' : 'Miadi Yangu'}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.appointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {userRole === 'doctor' ? 'Wagonjwa' : 'Madaktari'}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {userRole === 'doctor' ? stats.patients : stats.doctors}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Ujumbe</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.messages}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Video Calls</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">Vitendo vya Haraka</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => window.location.href = action.href}
                >
                  <action.icon className="w-6 h-6" />
                  <span className="text-xs text-center">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">Shughuli za Hivi Karibuni</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        Miadi: {new Date(activity.appointment_date).toLocaleDateString('sw-KE')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Hali: {activity.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Hakuna shughuli za hivi karibuni</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
