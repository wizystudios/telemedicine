import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DoctorCard } from '@/components/DoctorCard';
import { AdvancedDoctorSearch, SearchFilters } from '@/components/AdvancedDoctorSearch';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function DoctorsList() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '', specialty: '', location: '', minPrice: 0, maxPrice: 200000, isAvailable: undefined
  });

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`*, doctor_profiles(specialization:specialties(name), specialty_id, bio, experience_years, consultation_fee, education, languages), doctor_online_status(is_online, last_seen)`)
        .eq('role', 'doctor');
      if (filters.searchTerm) {
        query = query.or(`first_name.ilike.%${filters.searchTerm}%,last_name.ilike.%${filters.searchTerm}%`);
      }
      const { data } = await query;
      let filtered = data?.map(d => ({
        ...d,
        specialization: d.doctor_profiles?.[0]?.specialization?.name || 'Daktari',
        specialty_id: d.doctor_profiles?.[0]?.specialty_id,
        consultation_fee: d.doctor_profiles?.[0]?.consultation_fee,
        isOnline: d.doctor_online_status?.[0]?.is_online || false
      })) || [];

      if (filters.specialty) filtered = filtered.filter(d => d.specialty_id === filters.specialty);
      if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
        filtered = filtered.filter(d => d.consultation_fee >= filters.minPrice! && d.consultation_fee <= filters.maxPrice!);
      }
      if (filters.isAvailable) filtered = filtered.filter(d => d.isOnline);
      return filtered;
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20 space-y-4">
      <h1 className="text-lg font-bold">Madaktari</h1>
      <AdvancedDoctorSearch onSearch={setFilters} />

      <div className="flex flex-wrap gap-4">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} isOnline={doctor.isOnline} />
        ))}
      </div>

      {doctors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {filters.searchTerm ? 'Hakuna daktari aliyepatikana' : 'Hakuna madaktari kwa sasa'}
          </p>
        </div>
      )}
    </div>
  );
}
