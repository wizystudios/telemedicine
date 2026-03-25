import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import {
  ArrowLeft,
  MessageCircle,
  Calendar,
  Star,
  Clock,
  Building,
  MapPin,
  Mail,
  GraduationCap,
  Languages,
  Shield,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';
import { ReviewsSection } from '@/components/ReviewsSection';

export default function DoctorProfile() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor-profile', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          doctor_profiles (
            bio, experience_years, consultation_fee, rating, total_reviews,
            education, languages, is_verified, license_number, hospital_name, doctor_type, specialty_id
          )
        `)
        .eq('id', doctorId)
        .eq('role', 'doctor')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!doctorId,
  });

  const { data: timetableData } = useQuery({
    queryKey: ['doctor-timetable', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_timetable')
        .select('*')
        .eq('doctor_id', doctorId!)
        .order('day_of_week');

      if (error) throw error;
      return data || [];
    },
    enabled: !!doctorId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium">Daktari hajapatikana</h3>
          <Button onClick={() => navigate('/doctors-list')} className="mt-4">Rudi kwenye Orodha</Button>
        </div>
      </div>
    );
  }

  const displayName = `Dkt. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Daktari';
  const doctorProfile = doctor.doctor_profiles?.[0];
  const timetable = timetableData || [];
  const days = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
        </Button>

        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={doctor.avatar_url} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {doctor.first_name?.[0]}{doctor.last_name?.[0]}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{displayName}</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">{doctorProfile?.doctor_type || 'Daktari wa Jumla'}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {doctorProfile?.is_verified && (
                  <Badge variant="secondary" className="h-6 px-2 text-[11px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Amethibitishwa
                  </Badge>
                )}
                {doctorProfile?.hospital_name && (
                  <Badge variant="outline" className="h-6 px-2 text-[11px]">
                    <Building className="mr-1 h-3 w-3" /> {doctorProfile.hospital_name}
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {doctorProfile?.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                    <span className="font-semibold text-foreground">{doctorProfile.rating}</span>
                    <span>({doctorProfile.total_reviews || 0})</span>
                  </div>
                )}
                {doctorProfile?.consultation_fee && (
                  <div className="font-medium text-foreground">TSh {doctorProfile.consultation_fee.toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button className="h-9 text-xs" onClick={() => navigate(`/messages?doctor=${doctorId}`)}>
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Ujumbe
            </Button>
            <Button variant="outline" className="h-9 text-xs" onClick={() => navigate(`/book-appointment?doctor=${doctorId}`)}>
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Weka miadi
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Stethoscope className="h-4 w-4 text-primary" /> Taarifa
          </h2>

          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{doctor.email}</span>
            </div>

            {doctor.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-flex h-4 w-4 items-center justify-center text-primary">•</span>
                <span>{doctor.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{doctor.country || 'Tanzania'}</span>
            </div>

            {doctorProfile?.experience_years && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{doctorProfile.experience_years} miaka uzoefu</span>
              </div>
            )}

            {doctorProfile?.license_number && (
              <div className="col-span-full flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Leseni: {doctorProfile.license_number}</span>
              </div>
            )}
          </div>
        </div>

        <ExpandableSection title="Ratiba" count={timetable.length} icon={<Clock className="h-4 w-4" />} className="shadow-none">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {days.map((dayName, dayIndex) => {
              const schedule = timetable.find((t: any) => t.day_of_week === dayIndex);
              const isAvailable = !!schedule?.is_available;

              return (
                <div key={dayIndex} className={`flex items-center justify-between rounded-xl border p-3 ${isAvailable ? 'border-border bg-background' : 'border-transparent bg-muted/50'}`}>
                  <span className="text-sm font-medium">{dayName}</span>
                  <span className="text-sm text-muted-foreground">
                    {isAvailable ? `${schedule.start_time?.slice(0, 5)} - ${schedule.end_time?.slice(0, 5)}` : 'Hapatikani'}
                  </span>
                </div>
              );
            })}
          </div>

          {timetable[0]?.location && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {timetable[0].location}
            </p>
          )}
        </ExpandableSection>

        <ExpandableSection title="Elimu na Mafunzo" count={doctorProfile?.education?.length || 0} icon={<GraduationCap className="h-4 w-4" />} className="shadow-none">
          <ul className="space-y-2">
            {doctorProfile?.education?.map((edu: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span>{edu}</span>
              </li>
            ))}
          </ul>
        </ExpandableSection>

        <ExpandableSection title="Lugha" count={doctorProfile?.languages?.length || 0} icon={<Languages className="h-4 w-4" />} className="shadow-none">
          <div className="flex flex-wrap gap-2">
            {doctorProfile?.languages?.map((lang: string, index: number) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">{lang}</Badge>
            ))}
          </div>
        </ExpandableSection>

        {doctorProfile?.bio && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <h3 className="mb-1 text-sm font-medium">Kuhusu</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{doctorProfile.bio}</p>
          </div>
        )}

        <ReviewsSection entityType="doctor" entityId={doctorId || ''} entityName={displayName} />
      </div>
    </div>
  );
}
