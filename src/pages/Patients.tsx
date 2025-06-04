
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, MessageCircle, Calendar, Phone, Video } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  country?: string;
  created_at: string;
}

export default function Patients() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Patient[] || [];
    }
  });

  const { data: patientStats } = useQuery({
    queryKey: ['patient-stats', user?.id],
    queryFn: async () => {
      const { data: totalAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', user?.id);
      
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', user?.id)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .lt('appointment_date', new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]);

      return {
        totalPatients: patients.length,
        totalAppointments: totalAppointments?.length || 0,
        todayAppointments: todayAppointments?.length || 0
      };
    },
    enabled: !!user?.id && patients.length > 0
  });

  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name} ${patient.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {patientStats?.totalPatients || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Appointments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {patientStats?.totalAppointments || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Today's Appointments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {patientStats?.todayAppointments || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search patients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Patients List */}
        {filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={patient.avatar_url} />
                      <AvatarFallback>
                        {patient.first_name?.[0]}{patient.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {patient.email}
                      </p>
                      {patient.phone && (
                        <p className="text-sm text-gray-500 truncate">
                          {patient.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      Patient
                    </Badge>
                    {patient.country && (
                      <span className="text-xs text-gray-500">
                        {patient.country}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    Registered: {format(new Date(patient.created_at), 'MMM dd, yyyy')}
                  </p>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No patients found' : 'No patients yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Patients will appear here once they register and book appointments with you'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
