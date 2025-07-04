
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { DoctorCard } from '@/components/DoctorCard';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useDoctorPosts } from '@/hooks/useDoctorPosts';

interface Doctor {
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

export default function DoctorsList() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { onlineDoctors } = useOnlineStatus();
  const { posts } = useDoctorPosts();

  console.log('🔍 Current user:', user?.id, 'Role:', user?.user_metadata?.role);

  // Fetch doctors from profiles table with proper RLS
  const { data: allDoctors = [], isLoading, error } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      console.log('🔍 Fetching doctors from profiles table...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role, email, phone, country, created_at')
        .eq('role', 'doctor')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching doctors:', error);
        throw error;
      }
      
      console.log('✅ Doctors fetched successfully:', data?.length || 0);
      return data as Doctor[] || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  console.log('📊 Doctors state:', { allDoctors: allDoctors.length, isLoading, error: error?.message });

  const filteredDoctors = allDoctors.filter(doctor =>
    `${doctor.first_name || ''} ${doctor.last_name || ''} ${doctor.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia madaktari...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('🚨 Error in DoctorsList component:', error);
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Hitilafu katika Kupakia Madaktari
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Imeshindwa kupakia madaktari: {error.message}
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Madaktari ({allDoctors.length})
            </h1>
            <Badge variant="secondary">
              {onlineDoctors.length} Online
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Tafuta madaktari kwa jina..."
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
          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doctor) => {
                const isOnline = onlineDoctors.some(onlineDoc => onlineDoc.doctor_id === doctor.id);
                const hasPatientProblem = posts.some(post => 
                  post.doctor_id === doctor.id && 
                  new Date(post.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                );

                return (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    isOnline={isOnline}
                    hasPatientProblem={hasPatientProblem}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Hakuna madaktari waliopatikana' : 'Hakuna madaktari'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm 
                  ? 'Jaribu kubadilisha masharti ya utafutaji'
                  : 'Hakuna madaktari waliosajiliwa bado.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
