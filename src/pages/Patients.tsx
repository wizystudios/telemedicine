
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

  console.log('🔍 Patients - Current user:', user?.id);
  console.log('🔍 Patients - User metadata role:', user?.user_metadata?.role);

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
      
      console.log('📊 User profile role from DB:', data?.role);
      return data;
    },
    enabled: !!user?.id
  });

  // Check role from either database profile or user metadata
  const userRole = userProfile?.role || user?.user_metadata?.role;
  console.log('✅ Final determined user role:', userRole);

  // Only allow doctors to access this page
  if (userRole && userRole !== 'doctor') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              This page is only accessible to doctors. Your role: {userRole}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data: allPatients = [], isLoading, error } = useQuery({
    queryKey: ['patients-list'],
    queryFn: async () => {
      console.log('🔍 Starting patients fetch...');
      
      try {
        // First, let's try a simple select all to see what we get
        const { data: allProfiles, error: allError } = await supabase
          .from('profiles')
          .select('*');
        
        console.log('📋 ALL profiles in database:', allProfiles?.length || 0);
        console.log('📋 All profiles data:', allProfiles);
        
        if (allError) {
          console.error('❌ Error fetching all profiles:', allError);
        }

        // Now try the specific patient query
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient');
        
        if (error) {
          console.error('❌ Database error fetching patients:', error);
          console.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('✅ Patients query successful');
        console.log('✅ Raw patients data:', data);
        console.log('✅ Number of patients found:', data?.length || 0);
        
        if (data && data.length > 0) {
          console.log('👤 First patient sample:', data[0]);
          data.forEach((patient, index) => {
            console.log(`👤 Patient ${index + 1}:`, {
              id: patient.id,
              name: `${patient.first_name} ${patient.last_name}`,
              role: patient.role,
              email: patient.email
            });
          });
        } else {
          console.log('❌ No patients found in query result');
        }
        
        return (data as Patient[]) || [];
      } catch (err) {
        console.error('❌ Exception while fetching patients:', err);
        throw err;
      }
    },
    retry: 1,
    retryDelay: 500
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

  console.log('👤 Current user role:', userRole);
  console.log('👥 Total patients found:', allPatients?.length || 0);
  console.log('📅 Recent appointments:', recentAppointments?.length || 0);

  const filteredPatients = allPatients.filter(patient =>
    `${patient.first_name || ''} ${patient.last_name || ''} ${patient.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Get patients with recent appointments
  const patientsWithAppointments = new Set(
    recentAppointments.map(apt => apt.patient_id).filter(Boolean)
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

  if (error) {
    console.error('🚨 Error in Patients component:', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error Loading Patients
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Failed to load patients: {error.message}
            </p>
            <p className="text-xs text-red-500 mt-2">Debug: Check console for details</p>
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
            <p className="text-sm text-blue-600 mt-1">Found {allPatients.length} registered patients</p>
            <p className="text-xs text-gray-500">Your role: {userRole}</p>
            <p className="text-xs text-purple-600">Debug: Raw patients count: {allPatients.length}</p>
            <p className="text-xs text-green-600">Debug: Filtered patients: {filteredPatients.length}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                {patientsWithAppointments.has(patient.id) && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                )}
                
                <CardContent className="p-4">
                  <div className="flex flex-col items-center space-y-3">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={patient.avatar_url} />
                      <AvatarFallback>
                        {patient.first_name?.[0] || 'P'}{patient.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {patient.first_name || 'Unknown'} {patient.last_name || ''}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{patient.email}</p>
                      <div className="flex items-center justify-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">Patient</Badge>
                        {patientsWithAppointments.has(patient.id) && (
                          <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                            Recent Appointment
                          </Badge>
                        )}
                      </div>
                      {patient.country && (
                        <p className="text-xs text-gray-500 mt-1">{patient.country}</p>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 w-full">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Video className="w-4 h-4 mr-1" />
                          Video
                        </Button>
                        <Button variant="default" size="sm" className="flex-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No patients found' : 'No patients yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : `Total patients in database: ${allPatients.length}. Check console for debugging.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
