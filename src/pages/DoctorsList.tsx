
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useDoctorPosts } from '@/hooks/useDoctorPosts';
import { DoctorCard } from '@/components/DoctorCard';
import { CallInterface } from '@/components/CallInterface';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Heart, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useSavedDoctors } from '@/hooks/useSavedDoctors';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  email: string;
  phone?: string;
  country?: string;
}

export default function DoctorsList() {
  const { user } = useAuth();
  const { onlineDoctors } = useOnlineStatus();
  const { posts } = useDoctorPosts();
  const { savedDoctors } = useSavedDoctors();
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

  // Only allow patients to access this page
  if (userRole && userRole !== 'patient') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hairuhusiwi Kuingia
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Ukurasa huu unapatikana kwa wagonjwa tu. Jukumu lako: {userRole}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch ALL doctors from profiles table
  const { data: allDoctors = [], isLoading, error } = useQuery({
    queryKey: ['all-doctors-list'],
    queryFn: async () => {
      console.log('🔍 Fetching ALL doctors from profiles table...');
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role, email, phone, country', { count: 'exact' })
        .eq('role', 'doctor')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching doctors:', error);
        throw error;
      }
      
      console.log('✅ Total doctors in database:', count);
      console.log('✅ Doctors data fetched:', data?.length || 0);
      console.log('📊 Sample doctor data:', data?.[0]);
      
      return data as Doctor[] || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  // Filter doctors based on search term
  const filteredDoctors = allDoctors.filter(doctor =>
    `${doctor.first_name || ''} ${doctor.last_name || ''} ${doctor.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Get doctors with recent posts
  const doctorsWithPosts = new Set(posts.map(post => post.doctor_id));

  // Get online doctor IDs for easy lookup
  const onlineDoctorIds = new Set(onlineDoctors.map(online => online.doctor_id));

  // Filter online doctors that exist and have valid doctor data
  const validOnlineDoctors = onlineDoctors.filter(online => 
    online && online.doctor && online.doctor.id
  );

  // Filter saved doctors that exist and have valid doctor data
  const validSavedDoctors = savedDoctors.filter(saved => 
    saved && saved.doctor && saved.doctor.id
  );

  console.log('🔍 Debug Info:');
  console.log('- Total doctors in database:', allDoctors.length);
  console.log('- Filtered doctors:', filteredDoctors.length);
  console.log('- Online doctors:', validOnlineDoctors.length);
  console.log('- Saved doctors:', validSavedDoctors.length);
  console.log('- Search term:', searchTerm);
  console.log('- User role:', userRole);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia madaktari...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('🚨 Error in DoctorsList component:', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hitilafu katika Kupakia Madaktari
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Imeshindwa kupakia madaktari: {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 pb-20">
      <CallInterface />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Madaktari
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-2">
            Unganisha na wataalamu wa matibabu duniani kote
          </p>
          <div className="flex flex-col sm:flex-row gap-2 text-xs sm:text-sm">
            <p className="text-blue-600">Madaktari {allDoctors.length}</p>
            <p className="text-gray-500">Jukumu lako: {userRole}</p>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Debug: Jumla ya madaktari: {allDoctors.length} | Waliosafishwa: {filteredDoctors.length}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Tafuta madaktari kwa jina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="all" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">
                <span className="block sm:inline">Wote</span>
                <span className="block sm:inline sm:ml-1">({filteredDoctors.length})</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="online" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-center">
                <span className="block sm:inline">Mtandaoni</span>
                <span className="block sm:inline sm:ml-1">({validOnlineDoctors.length})</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 text-xs sm:text-sm">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-center">
                <span className="block sm:inline">Vilivyohifadhiwa</span>
                <span className="block sm:inline sm:ml-1">({validSavedDoctors.length})</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {filteredDoctors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredDoctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    isOnline={onlineDoctorIds.has(doctor.id)}
                    hasNewPosts={doctorsWithPosts.has(doctor.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? 'Hakuna madaktari waliopatikana' : 'Hakuna madaktari kwa sasa'}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
                  {searchTerm 
                    ? 'Jaribu kubadilisha masharti ya utafutaji'
                    : `Jumla ya madaktari kwenye hifadhidata: ${allDoctors.length}. Angalia console kwa ufuatiliaji...`
                  }
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="online">
            {validOnlineDoctors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {validOnlineDoctors
                  .filter(online => 
                    online.doctor && 
                    `${online.doctor.first_name || ''} ${online.doctor.last_name || ''}`
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((online) => (
                    <DoctorCard
                      key={online.doctor.id}
                      doctor={online.doctor}
                      isOnline={true}
                      hasNewPosts={doctorsWithPosts.has(online.doctor.id)}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-2 h-2 bg-gray-400 rounded-full mx-auto mb-4"></div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Hakuna madaktari mtandaoni
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
                  Hakuna madaktari waliopo mtandaoni kwa sasa. Tafadhali rudi baadaye.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved">
            {validSavedDoctors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {validSavedDoctors
                  .filter(saved => 
                    saved.doctor &&
                    `${saved.doctor.first_name || ''} ${saved.doctor.last_name || ''}`
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((saved) => (
                    <DoctorCard
                      key={saved.doctor.id}
                      doctor={saved.doctor}
                      isOnline={onlineDoctorIds.has(saved.doctor.id)}
                      hasNewPosts={doctorsWithPosts.has(saved.doctor.id)}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Hakuna madaktari waliohifadhiwa
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
                  Bado hujahifadhi madaktari yoyote. Hifadhi madaktari unaowapenda kuwaona hapa.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
