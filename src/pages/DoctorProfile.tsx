import { useParams, useNavigate } from 'react-router-dom';
import { useRecordVisit } from '@/hooks/useRecordVisit';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageCircle, Calendar, Star, Building, CheckCircle2, CalendarCheck } from 'lucide-react';
import { ReviewsSection } from '@/components/ReviewsSection';

const DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    {children}
  </section>
);

export default function DoctorProfile() {
  const { doctorId } = useParams();
  useRecordVisit('doctor', doctorId);
  const navigate = useNavigate();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor-profile', doctorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('public_doctors').select('*').eq('id', doctorId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!doctorId,
  });

  const { data: timetable = [] } = useQuery({
    queryKey: ['doctor-timetable', doctorId],
    queryFn: async () => {
      const { data } = await supabase.from('doctor_timetable').select('*').eq('doctor_id', doctorId!).order('day_of_week');
      return data || [];
    },
    enabled: !!doctorId,
  });

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
  );
  if (!doctor) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="font-medium">Daktari hajapatikana</p>
      <Button className="rounded-2xl" onClick={() => navigate('/doctors-list')}>Rudi kwenye orodha</Button>
    </div>
  );

  const name = `Dkt. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
  const orgName = doctor.hospital_name || doctor.polyclinic_name;
  const orgLink = doctor.hospital_id ? `/hospital-profile/${doctor.hospital_id}` : doctor.polyclinic_id ? `/polyclinic-profile/${doctor.polyclinic_id}` : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl space-y-6 px-4 pt-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Rudi
        </button>

        <header className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={doctor.avatar_url} alt={name} />
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{doctor.first_name?.[0]}{doctor.last_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">{doctor.doctor_type || 'Daktari wa Jumla'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {doctor.is_verified && <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Amethibitishwa</span>}
              {Number(doctor.rating) > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-primary" />{doctor.rating} ({doctor.total_reviews || 0})</span>}
              {doctor.experience_years && <span>Miaka {doctor.experience_years} ya uzoefu</span>}
            </div>
          </div>
        </header>

        {doctor.consultation_fee && (
          <p className="text-sm">Ada ya ushauri: <span className="font-semibold">TSh {Number(doctor.consultation_fee).toLocaleString()}</span></p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button className="rounded-2xl" onClick={() => navigate(`/book-appointment?doctor=${doctorId}`)}><Calendar className="mr-2 h-4 w-4" />Weka miadi</Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate(`/messages?doctor=${doctorId}`)}><MessageCircle className="mr-2 h-4 w-4" />Ujumbe</Button>
        </div>
        <button onClick={() => navigate('/my-bookings')} className="flex items-center gap-2 text-xs font-medium text-primary">
          <CalendarCheck className="h-4 w-4" /> Angalia miadi yangu
        </button>

        {orgName && (
          <Section title="Anafanya kazi">
            <button disabled={!orgLink} onClick={() => orgLink && navigate(orgLink)} className="flex items-center gap-2 text-sm font-medium text-primary">
              <Building className="h-4 w-4" />{orgName}
            </button>
          </Section>
        )}

        {doctor.bio && <Section title="Kuhusu"><p className="text-sm leading-relaxed text-muted-foreground">{doctor.bio}</p></Section>}

        <Section title="Ratiba ya wiki">
          {timetable.length === 0 ? <p className="text-sm text-muted-foreground">Ratiba haijawekwa.</p> : (
            <div className="divide-y divide-border">
              {DAYS.map((d, i) => {
                const s: any = timetable.find((t: any) => t.day_of_week === i);
                const on = !!s?.is_available;
                return (
                  <div key={d} className="flex items-center justify-between py-2 text-sm">
                    <span className={on ? '' : 'text-muted-foreground'}>{d}</span>
                    <span className={on ? 'font-medium' : 'text-muted-foreground'}>{on ? `${s.start_time?.slice(0, 5)} – ${s.end_time?.slice(0, 5)}` : 'Hapatikani'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {(doctor.languages?.length > 0) && <Section title="Lugha"><p className="text-sm">{doctor.languages.join(', ')}</p></Section>}
        {(doctor.education?.length > 0) && <Section title="Elimu"><ul className="list-disc space-y-1 pl-5 text-sm">{doctor.education.map((e: string) => <li key={e}>{e}</li>)}</ul></Section>}

        <ReviewsSection entityType="doctor" entityId={doctorId || ''} entityName={name} />
      </div>
    </div>
  );
}
