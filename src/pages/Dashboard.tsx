
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

  // Get new messages count
  const { data: newMessagesCount = 0 } = useQuery({
    queryKey: ['new-messages-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .neq('sender_id', user.id)
        .eq('is_read', false);
      
      if (error) return 0;
      return data?.length || 0;
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
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Patient Problem Posting - Only for Patients */}
        {userRole === 'patient' && (
          <PatientProblemPost />
        )}

        {/* Quick Stats - Compact Design */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2">
                <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold">{stats.appointments}</p>
                <p className="text-xs text-muted-foreground">Miadi</p>
              </div>
              
              <div className="text-center p-2">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold">
                  {userRole === 'doctor' ? stats.patients : stats.doctors}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userRole === 'doctor' ? 'Wagonjwa' : 'Madaktari'}
                </p>
              </div>
              
              <div className="text-center p-2">
                <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold">{stats.messages}</p>
                <p className="text-xs text-muted-foreground">Ujumbe</p>
              </div>
              
              <div className="text-center p-2 opacity-50">
                <Video className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-bold text-muted-foreground">-</p>
                <p className="text-xs text-muted-foreground">Video</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor-specific: Patient Problems Alert - Compact */}
        {userRole === 'doctor' && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">Msaada</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/patient-problems'}
                  className="text-xs"
                >
                  Angalia
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">2 wagonjwa wanahitaji msaada</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
