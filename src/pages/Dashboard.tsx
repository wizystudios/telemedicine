
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
  UserPlus,
  Stethoscope,
  Activity,
  AlertCircle
} from 'lucide-react';
import { PatientProblemPost } from '@/components/PatientProblemPost';

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

  const quickActions = userRole === 'doctor' ? [
    { icon: UserPlus, label: 'Wagonjwa', href: '/patients', color: 'text-blue-600' },
    { icon: Calendar, label: 'Miadi', href: '/appointments', color: 'text-emerald-600' },
    { icon: MessageCircle, label: 'Mazungumzo', href: '/messages', color: 'text-purple-600' },
    { icon: Video, label: 'Video Call', href: '/appointments', color: 'text-red-600' }
  ] : [
    { icon: Stethoscope, label: 'Madaktari', href: '/doctors-list', color: 'text-blue-600' },
    { icon: Calendar, label: 'Miadi', href: '/appointments', color: 'text-emerald-600' },
    { icon: MessageCircle, label: 'Mazungumzo', href: '/messages', color: 'text-purple-600' },
    { icon: Activity, label: 'Profile', href: '/profile', color: 'text-red-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Patient Problem Posting - Only for Patients */}
        {userRole === 'patient' && (
          <PatientProblemPost />
        )}

        {/* Quick Stats */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3">
                <Calendar className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.appointments}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Miadi</p>
              </div>
              
              <div className="text-center p-3">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {userRole === 'doctor' ? stats.patients : stats.doctors}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {userRole === 'doctor' ? 'Wagonjwa' : 'Madaktari'}
                </p>
              </div>
              
              <div className="text-center p-3">
                <MessageCircle className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.messages}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Ujumbe</p>
              </div>
              
              <div className="text-center p-3">
                <Video className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Video</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor-specific: Patient Problems Alert */}
        {userRole === 'doctor' && (
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                Wagonjwa Wanahitaji Msaada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">Hakuna matatizo ya wagonjwa kwa sasa</p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/patient-problems'}>
                  Ona Matatizo Yote
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
