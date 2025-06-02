
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`patient_id.eq.${user?.id},doctor_id.eq.${user?.id}`)
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Appointments</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage your medical consultations</p>
          </div>
          <Button 
            onClick={() => navigate('/doctors')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Book Appointment
          </Button>
        </div>

        {appointments && appointments.length > 0 ? (
          <div className="grid gap-6">
            {appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {appointment.consultation_type === 'video' ? 'Video Consultation' : 'In-Person Visit'}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          {format(new Date(appointment.appointment_date), 'MMM dd, yyyy')}
                          <Clock className="w-4 h-4 ml-4 mr-1" />
                          {format(new Date(appointment.appointment_date), 'h:mm a')}
                        </div>
                        {appointment.symptoms && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            <strong>Symptoms:</strong> {appointment.symptoms}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                      {appointment.consultation_type === 'video' && appointment.status === 'scheduled' && (
                        <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-700">
                          <Video className="w-4 h-4 mr-2" />
                          Join Call
                        </Button>
                      )}
                      {appointment.fee && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Fee: ${appointment.fee}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Appointments Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You haven't booked any appointments yet. Find a doctor and schedule your first consultation.
              </p>
              <Button 
                onClick={() => navigate('/doctors')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Book Your First Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
