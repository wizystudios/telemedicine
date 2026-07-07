import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DoctorCard } from '@/components/DoctorCard';
import { UniversalSearch } from '@/components/UniversalSearch';
import { AvailabilityCalendarSidebar } from '@/components/AvailabilityCalendarSidebar';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function DoctorsList() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors-all'],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from('doctor_profiles')
        .select(`user_id, specialty_id, doctor_type, consultation_fee, is_verified, org_approval_status, specialization:specialties(name), profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url)`);
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = rows.map(d => d.user_id).filter(Boolean);
      const { data: onlineRows } = user && ids.length
        ? await db.from('doctor_online_status').select('user_id, is_online').in('user_id', ids)
        : { data: [] as any[] };
      const onlineMap = new Map((onlineRows || []).map((r: any) => [r.user_id, !!r.is_online]));
      return rows.map(d => ({
        id: d.user_id,
        first_name: d.profiles?.first_name || '',
        last_name: d.profiles?.last_name || '',
        avatar_url: d.profiles?.avatar_url,
        specialization: d.specialization?.name || d.doctor_type || 'Daktari',
        consultation_fee: d.consultation_fee || 0,
        isOnline: Boolean(onlineMap.get(d.user_id)),
        isVerified: Boolean(d.is_verified) && d.org_approval_status === 'approved',
      }));
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(d =>
      `${d.first_name} ${d.last_name} ${d.specialization}`.toLowerCase().includes(q)
    );
  }, [doctors, query]);

  return (
    <div className="mx-auto max-w-6xl px-3 pt-3 pb-20">
      <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left column: date + availability */}
        <div className="md:sticky md:top-3 md:self-start">
          <AvailabilityCalendarSidebar />
        </div>

        {/* Right column: doctors */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-base font-semibold">Madaktari</h1>
            <p className="text-xs text-muted-foreground">Wasifu mfupi, hatua chache, ujumbe mmoja.</p>
          </div>

          <UniversalSearch
            placeholder="Tafuta daktari, utaalamu..."
            initial={initialQ}
            onLocalFilter={setQuery}
            global
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                {filtered.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} isOnline={doctor.isOnline} isVerified={doctor.isVerified} />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {query ? 'Hakuna daktari aliyepatikana' : 'Hakuna madaktari kwa sasa'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
