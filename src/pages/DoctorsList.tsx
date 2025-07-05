
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DoctorCard } from '@/components/DoctorCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';

export default function DoctorsList() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch doctors with their profiles
  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          doctor_profiles(
            specialization:specialties(name),
            bio,
            experience_years,
            consultation_fee,
            education,
            languages
          ),
          doctor_online_status(is_online, last_seen)
        `)
        .eq('role', 'doctor');

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching doctors:', error);
        return [];
      }

      return data?.map(doctor => ({
        ...doctor,
        specialization: doctor.doctor_profiles?.[0]?.specialization?.name || 'Mfanyakazi wa Afya',
        bio: doctor.doctor_profiles?.[0]?.bio,
        experience_years: doctor.doctor_profiles?.[0]?.experience_years,
        consultation_fee: doctor.doctor_profiles?.[0]?.consultation_fee,
        education: doctor.doctor_profiles?.[0]?.education,
        languages: doctor.doctor_profiles?.[0]?.languages,
        isOnline: doctor.doctor_online_status?.[0]?.is_online || false
      })) || [];
    },
    enabled: !!user
  });

  // Fetch patients with problems for doctors
  const { data: patientsWithProblems = [] } = useQuery({
    queryKey: ['patients-with-problems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_problems')
        .select('patient_id')
        .eq('status', 'open');
      
      if (error) {
        console.error('Error fetching patient problems:', error);
        return [];
      }
      
      return data?.map(p => p.patient_id) || [];
    },
    enabled: !!user
  });

  // Group doctors into rows of 20
  const groupedDoctors = [];
  for (let i = 0; i < doctors.length; i += 20) {
    groupedDoctors.push(doctors.slice(i, i + 20));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Inapakia madaktari...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Madaktari
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Chagua daktari unayemtaka
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tafuta daktari..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Doctors Grid */}
        <div className="space-y-4">
          {groupedDoctors.map((doctorRow, rowIndex) => (
            <div key={rowIndex} className="overflow-x-auto">
              <div className="flex space-x-4 min-w-max pb-2">
                {doctorRow.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    isOnline={doctor.isOnline}
                    hasPatientProblem={patientsWithProblems.includes(doctor.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {doctors.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Hakuna daktari aliyepatikana' : 'Hakuna madaktari kwa sasa'}
            </p>
          </div>
        )}
        
      </div>
    </div>
  );
}
