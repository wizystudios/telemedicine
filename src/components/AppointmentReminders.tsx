
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, Clock, Phone, Video } from 'lucide-react';
import { format, isToday, isTomorrow, addHours, isBefore } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function AppointmentReminders() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ['upcoming-appointments', user?.id],
    queryFn: async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:profiles!appointments_doctor_id_fkey(first_name, last_name),
          patient:profiles!appointments_patient_id_fkey(first_name, last_name)
        `)
        .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`)
        .eq('status', 'scheduled')
        .gte('appointment_date', new Date().toISOString())
        .lte('appointment_date', tomorrow.toISOString())
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000 // Refresh every minute
  });

  const sendReminder = async (appointmentId: string, type: 'sms' | 'email') => {
    try {
      // This would integrate with SMS/Email services
      toast({
        title: 'Kikumbusho Kimetumwa',
        description: `Kikumbusho cha ${type} kimetumwa kwa miadi yako`,
      });
    } catch (error) {
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma kikumbusho',
        variant: 'destructive'
      });
    }
  };

  if (upcomingAppointments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-orange-600" />
          <span>Vikumbusho vya Miadi</span>
          <Badge variant="secondary">{upcomingAppointments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingAppointments.map((appointment) => {
          const appointmentDate = new Date(appointment.appointment_date);
          const isUrgent = isBefore(appointmentDate, addHours(new Date(), 2));
          const otherUser = appointment.patient_id === user?.id 
            ? appointment.doctor 
            : appointment.patient;

          return (
            <div
              key={appointment.id}
              className={`p-3 rounded-lg border ${
                isUrgent 
                  ? 'border-orange-300 bg-orange-50 dark:bg-orange-950' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-sm">
                      {isToday(appointmentDate) ? 'Leo' : 
                       isTomorrow(appointmentDate) ? 'Kesho' :
                       format(appointmentDate, 'MMM dd')}
                    </span>
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {format(appointmentDate, 'HH:mm')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {appointment.consultation_type === 'video' ? (
                      <Video className="w-4 h-4 inline mr-1" />
                    ) : (
                      <Phone className="w-4 h-4 inline mr-1" />
                    )}
                    {appointment.patient_id === user?.id ? 'Dr.' : ''} 
                    {otherUser?.first_name} {otherUser?.last_name}
                  </p>

                  {isUrgent && (
                    <Badge variant="destructive" className="text-xs mt-2">
                      Miadi ya Haraka - Masaa 2 Zilizobaki
                    </Badge>
                  )}
                </div>

                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => sendReminder(appointment.id, 'sms')}
                    className="text-xs px-2"
                  >
                    SMS
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => sendReminder(appointment.id, 'email')}
                    className="text-xs px-2"
                  >
                    Email
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
