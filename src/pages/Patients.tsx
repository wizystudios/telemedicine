
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, MessageCircle, Phone, Video, AlertCircle, Calendar } from 'lucide-react';
import { useState } from 'react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  email: string;
  phone?: string;
  country?: string;
  created_at: string;
}

export default function Patients() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

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

  // Only allow doctors to access this page
  if (userRole && userRole !== 'doctor') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hairuhusiwi Kuingia
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Ukurasa huu unapatikana kwa madaktari tu. Jukumu lako: {userRole}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch ALL patients from profiles table
  const { data: allPatients = [], isLoading, error } = useQuery({
    queryKey: ['all-patients-list'],
    queryFn: async () => {
      console.log('🔍 Fetching ALL patients from profiles table...');
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role, email, phone, country, created_at', { count: 'exact' })
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching patients:', error);
        throw error;
      }
      
      console.log('✅ Total patients in database:', count);
      console.log('✅ Patients data fetched:', data?.length || 0);
      console.log('📊 Sample patient data:', data?.[0]);
      
      return data as Patient[] || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  // Get recent appointments for this doctor
  const { data: recentAppointments = [] } = useQuery({
    queryKey: ['doctor-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id && userRole === 'doctor'
  });

  const filteredPatients = allPatients.filter(patient =>
    `${patient.first_name || ''} ${patient.last_name || ''} ${patient.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Get patients with recent appointments
  const patientsWithAppointments = new Set(
    recentAppointments.map(apt => apt.patient_id).filter(Boolean)
  );

  console.log('🔍 Debug Info:');
  console.log('- Total patients in database:', allPatients.length);
  console.log('- Filtered patients:', filteredPatients.length);
  console.log('- Search term:', searchTerm);
  console.log('- User role:', userRole);
  console.log('- Patients with appointments:', patientsWithAppointments.size);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia wagonjwa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('🚨 Error in Patients component:', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hitilafu katika Kupakia Wagonjwa
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Imeshindwa kupakia wagonjwa: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Wagonjwa Wangu
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-2">
            Simamia mahusiano yako na wagonjwa
          </p>
          <div className="flex flex-col sm:flex-row gap-2 text-xs sm:text-sm">
            <p className="text-blue-600">Wagonjwa {allPatients.length} waliojisajili</p>
            <p className="text-gray-500">Jukumu lako: {userRole}</p>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Debug: Jumla ya wagonjwa: {allPatients.length} | Waliosafishwa: {filteredPatients.length}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Tafuta wagonjwa kwa jina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>

        {filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                {patientsWithAppointments.has(patient.id) && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                )}
                
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                    <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                      <AvatarImage src={patient.avatar_url} />
                      <AvatarFallback className="text-xs sm:text-sm">
                        {patient.first_name?.[0] || 'M'}{patient.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                        {patient.first_name || 'Hajaajulikani'} {patient.last_name || ''}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-all">
                        {patient.email}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">Mgonjwa</Badge>
                        {patientsWithAppointments.has(patient.id) && (
                          <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                            Miadi ya Karibuni
                          </Badge>
                        )}
                      </div>
                      {patient.country && (
                        <p className="text-xs text-gray-500 mt-1">{patient.country}</p>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 w-full">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm">
                          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Ujumbe
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm">
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Simu
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm">
                          <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Video
                        </Button>
                        <Button variant="default" size="sm" className="flex-1 text-xs sm:text-sm">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Miadi
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'Hakuna wagonjwa waliopatikana' : 'Bado hakuna wagonjwa'}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
              {searchTerm 
                ? 'Jaribu kubadilisha masharti ya utafutaji'
                : `Jumla ya wagonjwa kwenye hifadhidata: ${allPatients.length}. Angalia console kwa ufuatiliaji...`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
