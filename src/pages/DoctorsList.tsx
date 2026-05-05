import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DoctorCard } from '@/components/DoctorCard';
import { AdvancedDoctorSearch, SearchFilters } from '@/components/AdvancedDoctorSearch';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function DoctorsList() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: initialQ, specialty: '', location: '', minPrice: 0, maxPrice: 200000, isAvailable: undefined
  });

  const { data: doctors = [], isLoading, isFetching } = useQuery({
    queryKey: ['doctors', filters],
    queryFn: async () => {
      let query = supabase
        .from('doctor_profiles')
        .select(`user_id, specialty_id, doctor_type, consultation_fee, specialization:specialties(name), profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url)`)
        .eq('is_verified', true);
      if (filters.searchTerm) {
        query = query.or(`doctor_type.ilike.%${filters.searchTerm}%,bio.ilike.%${filters.searchTerm}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = rows.map(d => d.user_id).filter(Boolean);
      const { data: onlineRows } = user && ids.length
        ? await supabase.from('doctor_online_status').select('user_id, is_online').in('user_id', ids)
        : { data: [] as any[] };
      const onlineMap = new Map((onlineRows || []).map((r: any) => [r.user_id, !!r.is_online]));
      let filtered = rows.map(d => ({
        id: d.user_id,
        first_name: d.profiles?.first_name || '',
        last_name: d.profiles?.last_name || '',
        avatar_url: d.profiles?.avatar_url,
        specialization: d.specialization?.name || d.doctor_type || 'Daktari',
        specialty_id: d.specialty_id,
        consultation_fee: d.consultation_fee || 0,
        isOnline: onlineMap.get(d.user_id) || false
      })) || [];

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(d =>
          `${d.first_name} ${d.last_name} ${d.specialization}`.toLowerCase().includes(term)
        );
      }
      if (filters.specialty) filtered = filtered.filter(d => d.specialty_id === filters.specialty);
      if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
        filtered = filtered.filter(d => d.consultation_fee >= filters.minPrice! && d.consultation_fee <= filters.maxPrice!);
      }
      if (filters.isAvailable) filtered = filtered.filter(d => d.isOnline);
      return filtered;
    },
    placeholderData: (prev) => prev,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3 pb-20">
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Madaktari</h1>
        <p className="text-xs text-muted-foreground">Wasifu mfupi, hatua chache, ujumbe mmoja.</p>
      </div>

      <AdvancedDoctorSearch onSearch={setFilters} initialSearchTerm={initialQ} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 transition-opacity" style={{ opacity: isFetching ? 0.6 : 1 }}>
            {doctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} isOnline={doctor.isOnline} />
            ))}
          </div>
          {doctors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {filters.searchTerm ? 'Hakuna daktari aliyepatikana' : 'Hakuna madaktari kwa sasa'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
