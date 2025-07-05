
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Phone, 
  MessageCircle,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url),
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url)
        `)
        .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .order('appointment_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Phone className="w-4 h-4" />;
      case 'chat':
        return <MessageCircle className="w-4 h-4" />;
      case 'in-person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Inapakia miadi...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Miadi
            </h1>
          </div>
          <Button 
            onClick={() => navigate('/doctors-list')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Panga Miadi
          </Button>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const isPatient = appointment.patient_id === user?.id;
            const otherUser = isPatient ? appointment.doctor : appointment.patient;
            
            return (
              <Card key={appointment.id} className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {isPatient ? 'Dkt.' : ''} {otherUser?.first_name} {otherUser?.last_name}
                          </h3>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status === 'scheduled' ? 'Imepangwa' : 
                             appointment.status === 'completed' ? 'Imekamilika' : 
                             appointment.status === 'cancelled' ? 'Imeghairiwa' : appointment.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(appointment.appointment_date), 'dd/MM/yyyy')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{format(new Date(appointment.appointment_date), 'HH:mm')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getConsultationIcon(appointment.consultation_type)}
                            <span className="capitalize">{appointment.consultation_type}</span>
                          </div>
                        </div>
                        
                        {appointment.symptoms && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                            <strong>Matatizo:</strong> {appointment.symptoms}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {appointment.status === 'scheduled' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/messages?appointment=${appointment.id}`)}
                          >
                            Ujumbe
                          </Button>
                          {appointment.consultation_type === 'video' && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                              Jiunge
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {appointments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Hakuna miadi bado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Panga miadi yako ya kwanza na daktari
            </p>
            <Button 
              onClick={() => navigate('/doctors-list')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Tafuta Daktari
            </Button>
          </div>
        )}
        
      </div>
    </div>
  );
}
