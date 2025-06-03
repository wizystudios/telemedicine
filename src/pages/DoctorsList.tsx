
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useDoctorPosts } from '@/hooks/useDoctorPosts';
import { DoctorCard } from '@/components/DoctorCard';
import { CallInterface } from '@/components/CallInterface';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Heart } from 'lucide-react';
import { useState } from 'react';
import { useSavedDoctors } from '@/hooks/useSavedDoctors';

export default function DoctorsList() {
  const { user } = useAuth();
  const { onlineDoctors } = useOnlineStatus();
  const { posts } = useDoctorPosts();
  const { savedDoctors } = useSavedDoctors();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allDoctors, isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor');
      
      if (error) throw error;
      return data || [];
    }
  });

  const filteredDoctors = allDoctors?.filter(doctor =>
    `${doctor.first_name} ${doctor.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) || [];

  // Get doctors with recent posts
  const doctorsWithPosts = new Set(posts.map(post => post.doctor_id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading doctors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <CallInterface />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Doctors</h1>
            <p className="text-gray-600 dark:text-gray-300">Connect with medical experts worldwide</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search doctors by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>All Doctors</span>
            </TabsTrigger>
            <TabsTrigger value="online" className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Online Now</span>
            </TabsTrigger>
            {user?.role === 'patient' && (
              <TabsTrigger value="saved" className="flex items-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>Saved</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  isOnline={onlineDoctors.some(online => online.doctor_id === doctor.id)}
                  hasNewPosts={doctorsWithPosts.has(doctor.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="online">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {onlineDoctors
                .filter(online => 
                  `${online.doctor.first_name} ${online.doctor.last_name}`
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
          </TabsContent>

          {user?.role === 'patient' && (
            <TabsContent value="saved">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {savedDoctors
                  .filter(saved => 
                    `${saved.doctor.first_name} ${saved.doctor.last_name}`
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((saved) => (
                    <DoctorCard
                      key={saved.doctor.id}
                      doctor={saved.doctor}
                      isOnline={onlineDoctors.some(online => online.doctor_id === saved.doctor.id)}
                      hasNewPosts={doctorsWithPosts.has(saved.doctor.id)}
                    />
                  ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {filteredDoctors.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No doctors found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Try adjusting your search terms
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
