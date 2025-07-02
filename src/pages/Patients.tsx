
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
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Hairuhusiwi Kuingia
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Ukurasa huu unapatikana kwa madaktari tu.
          </p>
        </div>
      </div>
    );
  }

  // Fetch ALL patients from profiles table where role = 'patient'
  const { data: allPatients = [], isLoading, error } = useQuery({
    queryKey: ['all-patients-list'],
    queryFn: async () => {
      console.log('🔍 Fetching patients with role=patient from profiles table...');
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role, email, phone, country, created_at', { count: 'exact' })
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching patients:', error);
        throw error;
      }
      
      console.log('✅ Total patients found:', count);
      console.log('✅ Patients data:', data?.length || 0);
      
      return data as Patient[] || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  const filteredPatients = allPatients.filter(patient =>
    `${patient.first_name || ''} ${patient.last_name || ''} ${patient.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia wagonjwa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('🚨 Error in Patients component:', error);
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Hitilafu katika Kupakia Wagonjwa
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Imeshindwa kupakia wagonjwa: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Wagonjwa ({allPatients.length})
          </h1>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Tafuta wagonjwa kwa jina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto">
          {filteredPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((patient) => (
                <Card key={patient.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center space-y-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={patient.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {patient.first_name?.[0] || 'M'}{patient.last_name?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="text-center w-full">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {patient.first_name || 'Hajaajulikani'} {patient.last_name || ''}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                          {patient.email}
                        </p>
                        <div className="flex justify-center mt-1">
                          <Badge variant="secondary" className="text-xs">Mgonjwa</Badge>
                        </div>
                        {patient.country && (
                          <p className="text-xs text-gray-500 mt-1 truncate">{patient.country}</p>
                        )}
                      </div>

                      <div className="flex flex-col space-y-1 w-full">
                        <div className="flex space-x-1">
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Ujumbe
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                            <Phone className="w-3 h-3 mr-1" />
                            Simu
                          </Button>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                            <Video className="w-3 h-3 mr-1" />
                            Video
                          </Button>
                          <Button variant="default" size="sm" className="flex-1 text-xs h-8">
                            <Calendar className="w-3 h-3 mr-1" />
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
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Hakuna wagonjwa waliopatikana' : 'Hakuna wagonjwa'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm 
                  ? 'Jaribu kubadilisha masharti ya utafutaji'
                  : 'Hakuna wagonjwa waliosajiliwa bado.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
