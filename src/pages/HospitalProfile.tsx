import { useParams, useNavigate } from 'react-router-dom';
import { useRecordVisit } from '@/hooks/useRecordVisit';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft, Phone, MapPin, Mail, Star, Globe, CheckCircle2, Ambulance, Hospital, ChevronRight, CalendarCheck,
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';
import { ReviewsSection } from '@/components/ReviewsSection';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    {children}
  </section>
);

export default function HospitalProfile() {
  const { hospitalId } = useParams();
  useRecordVisit('hospital', hospitalId);
  const navigate = useNavigate();

  const { data: hospital, isLoading } = useQuery({
    queryKey: ['hospital-profile', hospitalId],
    queryFn: async () => {
      const { data: h, error } = await supabase.from('hospitals').select('*').eq('id', hospitalId!).maybeSingle();
      if (error) throw error;
      if (!h) return null;
      const [servicesRes, insRes, docsRes] = await Promise.all([
        supabase.from('hospital_services').select('*').eq('hospital_id', hospitalId!),
        supabase.from('hospital_insurance').select('insurance_id').eq('hospital_id', hospitalId!),
        (supabase as any).from('public_doctors').select('*').eq('hospital_id', hospitalId),
      ]);
      return { ...h, services: servicesRes.data || [], insurance: insRes.data || [], doctors: docsRes.data || [] };
    },
    enabled: !!hospitalId,
  });

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
  );
  if (!hospital) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="font-medium">Hospitali haijapatikana</p>
      <Button className="rounded-2xl" onClick={() => navigate('/hospitals')}>Rudi kwenye hospitali</Button>
    </div>
  );

  const insuranceIds = hospital.insurance.map((i: any) => i.insurance_id).filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl space-y-6 px-4 pt-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Rudi
        </button>

        <header className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={hospital.logo_url} alt={hospital.name} />
            <AvatarFallback className="bg-primary/10 text-primary"><Hospital className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">{hospital.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {hospital.is_verified && <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Imethibitishwa</span>}
              {Number(hospital.rating) > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-primary" />{hospital.rating}</span>}
              <span>{hospital.doctors.length} madaktari</span>
            </div>
          </div>
        </header>

        {hospital.description && <p className="text-sm leading-relaxed text-muted-foreground">{hospital.description}</p>}

        <div className="flex gap-2">
          {hospital.phone && <Button asChild className="flex-1 rounded-2xl"><a href={`tel:${hospital.phone}`}><Phone className="mr-2 h-4 w-4" />Piga simu</a></Button>}
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => navigate('/my-bookings')}>
            <CalendarCheck className="mr-2 h-4 w-4" />Miadi yangu
          </Button>
        </div>

        <Section title="Mawasiliano">
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{hospital.address}</p>
            {hospital.email && <a href={`mailto:${hospital.email}`} className="flex items-center gap-2 text-primary"><Mail className="h-4 w-4" />{hospital.email}</a>}
            {hospital.website && <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary"><Globe className="h-4 w-4" />Tovuti</a>}
            {hospital.has_ambulance && hospital.ambulance_phone && (
              <a href={`tel:${hospital.ambulance_phone}`} className="flex items-center gap-2 font-medium text-destructive"><Ambulance className="h-4 w-4" />Ambulensi: {hospital.ambulance_phone}</a>
            )}
          </div>
        </Section>

        <Section title="Madaktari">
          {hospital.doctors.length === 0 ? <p className="text-sm text-muted-foreground">Hakuna madaktari bado.</p> : (
            <div className="divide-y divide-border">
              {hospital.doctors.map((d: any) => (
                <button key={d.id} onClick={() => navigate(`/doctor-profile/${d.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                  <Avatar className="h-10 w-10"><AvatarImage src={d.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">{d.first_name?.[0]}{d.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Dkt. {d.first_name} {d.last_name}</p>
                    <p className="text-xs text-muted-foreground">{d.doctor_type || 'Daktari wa Jumla'}{d.consultation_fee ? ` · TSh ${Number(d.consultation_fee).toLocaleString()}` : ''}</p>
                  </div>
                  <span className="text-xs font-medium text-primary">Weka miadi</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </Section>

        {hospital.services.length > 0 && (
          <Section title="Huduma na bei">
            <div className="divide-y divide-border">
              {hospital.services.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className={s.is_available === false ? 'text-muted-foreground line-through' : ''}>{s.name}</span>
                  <span className="font-medium">{s.price ? `TSh ${Number(s.price).toLocaleString()}` : '—'}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Bima zinazokubaliwa"><InsuranceDisplay insuranceIds={insuranceIds} /></Section>

        <ReviewsSection entityType="hospital" entityId={hospitalId || ''} entityName={hospital.name} showForm={false} />
      </div>
    </div>
  );
}
