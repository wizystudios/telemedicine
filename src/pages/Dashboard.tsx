
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Stethoscope, MessageCircle, TrendingUp, Clock, Video, Phone } from 'lucide-react';
import { NotificationsList } from '@/components/NotificationsList';
import { AppointmentReminders } from '@/components/AppointmentReminders';
import { HealthRecordsManager } from '@/components/HealthRecordsManager';
import { MedicationReminders } from '@/components/MedicationReminders';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.user_metadata?.role || 'patient';

  // Fetch real data for dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats', user?.id, userRole],
    queryFn: async () => {
      if (!user?.id) return null;

      if (userRole === 'doctor') {
        // Doctor dashboard stats
        const [appointmentsResult, patientsResult, messagesResult] = await Promise.all([
          supabase
            .from('appointments')
            .select('id')
            .eq('doctor_id', user.id)
            .eq('status', 'scheduled')
            .gte('appointment_date', new Date().toISOString().split('T')[0]),
          
          supabase
            .from('appointments')
            .select('patient_id')
            .eq('doctor_id', user.id)
            .gte('appointment_date', new Date().toISOString().split('T')[0]),
          
          supabase
            .from('chat_messages')
            .select('id')
            .eq('sender_id', user.id)
            .gte('created_at', new Date().toISOString().split('T')[0])
        ]);

        const uniquePatients = new Set(patientsResult.data?.map(p => p.patient_id) || []).size;

        return {
          todayPatients: uniquePatients,
          scheduledAppointments: appointmentsResult.data?.length || 0,
          messages: messagesResult.data?.length || 0,
          videoCalls: 0 // This would need call_sessions data
        };
      } else {
        // Patient dashboard stats
        const [appointmentsResult, doctorsResult, messagesResult, recordsResult] = await Promise.all([
          supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', user.id)
            .gte('appointment_date', new Date().toISOString()),
          
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

        return {
          upcomingAppointments: appointmentsResult.data?.length || 0,
          savedDoctors: doctorsResult.data?.length || 0,
          messages: messagesResult.data?.length || 0,
          medicalRecords: recordsResult.data?.length || 0
        };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const quickActions = userRole === 'doctor' ? [
    { 
      icon: Users, 
      label: 'Wagonjwa', 
      path: '/patients',
      color: 'bg-blue-500',
      description: 'Angalia wagonjwa wako'
    },
    { 
      icon: Calendar, 
      label: 'Miadi', 
      path: '/appointments',
      color: 'bg-emerald-500',
      description: 'Miadi yako ya leo'
    },
    { 
      icon: MessageCircle, 
      label: 'Ujumbe', 
      path: '/messages',
      color: 'bg-purple-500',
      description: 'Mawasiliano na wagonjwa'
    }
  ] : [
    { 
      icon: Stethoscope, 
      label: 'Madaktari', 
      path: '/doctors',
      color: 'bg-emerald-500',
      description: 'Tafuta madaktari'
    },
    { 
      icon: Calendar, 
      label: 'Miadi', 
      path: '/appointments',
      color: 'bg-blue-500',
      description: 'Miadi yako'
    },
    { 
      icon: MessageCircle, 
      label: 'Ujumbe', 
      path: '/messages',
      color: 'bg-purple-500',
      description: 'Mawasiliano na madaktari'
    }
  ];

  const stats = userRole === 'doctor' ? [
    { 
      label: 'Wagonjwa wa Leo', 
      value: dashboardStats?.todayPatients?.toString() || '0', 
      icon: Users, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Miadi Iliyopangwa', 
      value: dashboardStats?.scheduledAppointments?.toString() || '0', 
      icon: Calendar, 
      color: 'text-emerald-600' 
    },
    { 
      label: 'Mazungumzo', 
      value: dashboardStats?.messages?.toString() || '0', 
      icon: MessageCircle, 
      color: 'text-purple-600' 
    },
    { 
      label: 'Video Calls', 
      value: dashboardStats?.videoCalls?.toString() || '0', 
      icon: Video, 
      color: 'text-orange-600' 
    }
  ] : [
    { 
      label: 'Miadi Ijayo', 
      value: dashboardStats?.upcomingAppointments?.toString() || '0', 
      icon: Calendar, 
      color: 'text-emerald-600' 
    },
    { 
      label: 'Madaktari Niliyohifadhi', 
      value: dashboardStats?.savedDoctors?.toString() || '0', 
      icon: Stethoscope, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Mazungumzo', 
      value: dashboardStats?.messages?.toString() || '0', 
      icon: MessageCircle, 
      color: 'text-purple-600' 
    },
    { 
      label: 'Rekodi za Matibabu', 
      value: dashboardStats?.medicalRecords?.toString() || '0', 
      icon: TrendingUp, 
      color: 'text-orange-600' 
    }
  ];

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 pb-20">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Quick Stats - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="p-2">
                  <CardContent className="p-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800`}>
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {stat.value}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions - Single vertical line */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vitendo vya Haraka</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex space-x-2">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      onClick={() => navigate(action.path)}
                      variant="outline"
                      className="flex-1 h-16 flex flex-col items-center justify-center space-y-1 hover:shadow-md transition-shadow"
                    >
                      <div className={`p-2 rounded-full ${action.color} text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Main Content - Compact Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Column */}
            <div className="space-y-4">
              <div className="max-h-60 overflow-hidden">
                <AppointmentReminders />
              </div>
              
              {userRole === 'patient' && (
                <div className="max-h-48 overflow-hidden">
                  <MedicationReminders />
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="max-h-60 overflow-hidden">
                <NotificationsList />
              </div>
              
              {userRole === 'patient' && (
                <div className="max-h-48 overflow-hidden">
                  <HealthRecordsManager />
                </div>
              )}
            </div>
          </div>

          {/* TeleMed Features Banner - Compact */}
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950 dark:to-blue-950 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                    TeleMed Tanzania
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-2">
                    Huduma za kiteknolojia kwa afya yako
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="bg-white/70 text-xs">
                      <Video className="w-2 h-2 mr-1" />
                      Video
                    </Badge>
                    <Badge variant="secondary" className="bg-white/70 text-xs">
                      <Phone className="w-2 h-2 mr-1" />
                      Simu
                    </Badge>
                    <Badge variant="secondary" className="bg-white/70 text-xs">
                      <MessageCircle className="w-2 h-2 mr-1" />
                      Chat
                    </Badge>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
