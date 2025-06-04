
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, Plus, Users, Phone, MessageCircle, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const userRole = user?.user_metadata?.role || 'patient';

  const { data: appointments, isLoading, refetch } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient_profile:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
          doctor_profile:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url),
          specialty:specialties(name)
        `)
        .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`)
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const handleStatusUpdate = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Appointment ${status} successfully`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Appointments</h1>
            <p className="text-gray-600 dark:text-gray-300">
              {userRole === 'doctor' ? 'Manage your patient appointments' : 'Manage your medical consultations'}
            </p>
          </div>
          {userRole === 'patient' && (
            <Button 
              onClick={() => navigate('/doctors')}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          )}
        </div>

        {appointments && appointments.length > 0 ? (
          <div className="grid gap-4 sm:gap-6">
            {appointments.map((appointment) => {
              const otherUser = userRole === 'doctor' ? appointment.patient_profile : appointment.doctor_profile;
              
              return (
                <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg truncate">
                            {userRole === 'doctor' ? 'Patient: ' : 'Doctor: '}
                            {otherUser?.first_name} {otherUser?.last_name}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 dark:text-gray-300 mt-1 gap-1 sm:gap-4">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(appointment.appointment_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {format(new Date(appointment.appointment_date), 'h:mm a')}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 capitalize">
                            {appointment.consultation_type} consultation
                          </p>
                          {appointment.symptoms && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                              <strong>Symptoms:</strong> {appointment.symptoms}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                        <Badge className={`${getStatusColor(appointment.status)} w-fit`}>
                          {appointment.status}
                        </Badge>
                        
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          {userRole === 'doctor' && appointment.status === 'scheduled' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                                className="bg-green-50 hover:bg-green-100"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                className="bg-red-50 hover:bg-red-100"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Decline
                              </Button>
                            </div>
                          )}
                          
                          {(appointment.status === 'confirmed' || appointment.status === 'scheduled') && (
                            <>
                              {appointment.consultation_type === 'video' && (
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                                  <Video className="w-4 h-4 mr-2" />
                                  Join Video
                                </Button>
                              )}
                              {appointment.consultation_type === 'audio' && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                                  <Phone className="w-4 h-4 mr-2" />
                                  Join Audio
                                </Button>
                              )}
                              {appointment.consultation_type === 'chat' && (
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Open Chat
                                </Button>
                              )}
                            </>
                          )}
                          
                          {userRole === 'doctor' && appointment.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                              className="w-full sm:w-auto"
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                        
                        {appointment.fee && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Fee: ${appointment.fee}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8 sm:py-12">
              <Calendar className="w-12 sm:w-16 h-12 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Appointments Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 px-4">
                {userRole === 'doctor' 
                  ? "You haven't received any appointment requests yet. Once patients book with you, they'll appear here."
                  : "You haven't booked any appointments yet. Find a doctor and schedule your first consultation."
                }
              </p>
              {userRole === 'patient' && (
                <Button 
                  onClick={() => navigate('/doctors')}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Book Your First Appointment
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
