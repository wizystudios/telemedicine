
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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.user_metadata?.role || 'patient';

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
    { label: 'Wagonjwa wa Leo', value: '12', icon: Users, color: 'text-blue-600' },
    { label: 'Miadi Iliyopangwa', value: '8', icon: Calendar, color: 'text-emerald-600' },
    { label: 'Mazungumzo', value: '5', icon: MessageCircle, color: 'text-purple-600' },
    { label: 'Video Calls', value: '3', icon: Video, color: 'text-orange-600' }
  ] : [
    { label: 'Miadi Ijayo', value: '2', icon: Calendar, color: 'text-emerald-600' },
    { label: 'Madaktari Niliyohifadhi', value: '4', icon: Stethoscope, color: 'text-blue-600' },
    { label: 'Mazungumzo', value: '3', icon: MessageCircle, color: 'text-purple-600' },
    { label: 'Rekodi za Matibabu', value: '7', icon: TrendingUp, color: 'text-orange-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vitendo vya Haraka</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    onClick={() => navigate(action.path)}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-shadow"
                  >
                    <div className={`p-3 rounded-full ${action.color} text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-gray-600">{action.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            <AppointmentReminders />
            
            {userRole === 'patient' && (
              <MedicationReminders />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <NotificationsList />
            
            {userRole === 'patient' && (
              <HealthRecordsManager />
            )}
          </div>
        </div>

        {/* TeleMed Features Banner */}
        <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950 dark:to-blue-950 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                  TeleMed Tanzania - Huduma za Kiteknolojia
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-3">
                  Unganisha na madaktari popote ulipo. Mazungumzo ya video, rekodi za matibabu, na vikumbusho vya dawa.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-white/70">
                    <Video className="w-3 h-3 mr-1" />
                    Video Calls
                  </Badge>
                  <Badge variant="secondary" className="bg-white/70">
                    <Phone className="w-3 h-3 mr-1" />
                    Simu za Sauti
                  </Badge>
                  <Badge variant="secondary" className="bg-white/70">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Chat za Papo
                  </Badge>
                  <Badge variant="secondary" className="bg-white/70">
                    <Clock className="w-3 h-3 mr-1" />
                    Vikumbusho
                  </Badge>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
                  <Stethoscope className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
