
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, MessageCircle, Video, Phone, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: patients, isLoading } = useQuery({
    queryKey: ['doctor-patients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          patient:profiles!appointments_patient_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            phone,
            country,
            email
          ),
          created_at,
          status
        `)
        .eq('doctor_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get unique patients with their latest appointment info
      const uniquePatients = data?.reduce((acc, appointment) => {
        const patientId = appointment.patient_id;
        if (!acc[patientId] || new Date(appointment.created_at) > new Date(acc[patientId].created_at)) {
          acc[patientId] = appointment;
        }
        return acc;
      }, {} as Record<string, any>);

      return Object.values(uniquePatients || {});
    },
    enabled: !!user?.id
  });

  const { data: onlinePatients } = useQuery({
    queryKey: ['online-patients'],
    queryFn: async () => {
      // This would require a patient_online_status table similar to doctor_online_status
      // For now, we'll return empty array
      return [];
    }
  });

  const filteredPatients = patients?.filter(appointment =>
    `${appointment.patient?.first_name} ${appointment.patient?.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) || [];

  const handleStartConsultation = (patientId: string, type: 'video' | 'audio' | 'chat') => {
    // This would initiate a consultation session
    console.log(`Starting ${type} consultation with patient ${patientId}`);
  };

  const handleSendMessage = (patientId: string) => {
    navigate(`/messages?patient=${patientId}`);
  };

  const handleBookAppointment = (patientId: string) => {
    navigate(`/appointments/book?patient=${patientId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading patients...</p>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Patients</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage your patient relationships</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search patients by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredPatients.length > 0 ? (
          <div className="grid gap-4 sm:gap-6">
            {filteredPatients.map((appointment) => (
              <Card key={appointment.patient_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={appointment.patient?.avatar_url} />
                        <AvatarFallback>
                          {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg">
                          {appointment.patient?.first_name} {appointment.patient?.last_name}
                        </h3>
                        <div className="flex flex-col text-sm text-gray-600 dark:text-gray-300 mt-1 gap-1">
                          <p>{appointment.patient?.email}</p>
                          {appointment.patient?.phone && (
                            <p>{appointment.patient.phone}</p>
                          )}
                          {appointment.patient?.country && (
                            <p>{appointment.patient.country}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="w-fit mt-2">
                          Last appointment: {appointment.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendMessage(appointment.patient_id)}
                        className="w-full sm:w-auto"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartConsultation(appointment.patient_id, 'video')}
                        className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8 sm:py-12">
              <Users className="w-12 sm:w-16 h-12 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Patients Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 px-4">
                You haven't seen any patients yet. Once you start accepting appointments, your patients will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
