import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import {
  ArrowLeft, Phone, MapPin, Mail, Star, Globe, Clock,
  Users, Stethoscope, Shield, CheckCircle2, Ambulance, HeartPulse, Hospital
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';
import { ReviewsSection } from '@/components/ReviewsSection';

export default function HospitalProfile() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const { data: hospital, isLoading } = useQuery({
    queryKey: ['hospital-profile', hospitalId],
    queryFn: async () => {
      // Fetch hospital + related data separately to avoid brittle nested embeds
      const { data: h, error: hErr } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', hospitalId)
        .maybeSingle();
      if (hErr) throw hErr;
      if (!h) return null;

      const [servicesRes, insRes, docsRes] = await Promise.all([
        supabase.from('hospital_services').select('*').eq('hospital_id', hospitalId),
        supabase.from('hospital_insurance').select('insurance_id').eq('hospital_id', hospitalId),
        supabase.from('doctor_profiles')
          .select('user_id, bio, experience_years, consultation_fee, doctor_type, is_available')
          .eq('hospital_id', hospitalId),
      ]);

      const doctorIds = (docsRes.data || []).map((d: any) => d.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      if (doctorIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', doctorIds);
        profilesMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      }
      const doctor_profiles = (docsRes.data || []).map((d: any) => ({
        ...d,
        profiles: profilesMap[d.user_id] || null,
      }));

      return {
        ...h,
        hospital_services: servicesRes.data || [],
        hospital_insurance: insRes.data || [],
        doctor_profiles,
      };
    },
    enabled: !!hospitalId
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium">Hospitali haijapatikana</h3>
          <Button onClick={() => navigate('/')} className="mt-4">Rudi Nyumbani</Button>
        </div>
      </div>
    );
  }

  const doctors = hospital.doctor_profiles || [];
  const services = hospital.hospital_services || [];
  const insuranceIds = hospital.hospital_insurance?.map((hi: any) => hi.insurance_id).filter(Boolean) || [];
  const availableDoctors = doctors.filter((d: any) => d.is_available);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
        </Button>

        {/* Main Card */}
        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={hospital.logo_url} alt={hospital.name} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                <Hospital className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{hospital.name}</h1>
              {hospital.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{hospital.description}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {hospital.is_verified && (
                  <Badge variant="secondary" className="h-6 px-2 text-[11px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Imethibitishwa
                  </Badge>
                )}
                {hospital.has_ambulance && (
                  <Badge variant="destructive" className="h-6 px-2 text-[11px]">
                    <Ambulance className="mr-1 h-3 w-3" /> Ambulance
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {hospital.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                    <span className="font-semibold text-foreground">{hospital.rating}</span>
                    <span>({hospital.total_reviews || 0})</span>
                  </div>
                )}
                <span>{doctors.length} madaktari</span>
                <span>{services.length} huduma</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-primary" /> Mawasiliano
          </h2>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{hospital.address}</span>
            </div>
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="h-4 w-4" />
                <span>{hospital.phone}</span>
              </a>
            )}
            {hospital.email && (
              <a href={`mailto:${hospital.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="h-4 w-4" />
                <span>{hospital.email}</span>
              </a>
            )}
            {hospital.website && (
              <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="h-4 w-4" />
                <span>Website</span>
              </a>
            )}
            {hospital.ambulance_phone && (
              <a href={`tel:${hospital.ambulance_phone}`} className="flex items-center gap-2 text-destructive font-medium">
                <Ambulance className="h-4 w-4" />
                <span>Ambulance: {hospital.ambulance_phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Insurance */}
        <ExpandableSection title="Bima Zinazokubaliwa" count={insuranceIds.length} icon={<Shield className="h-4 w-4" />} className="shadow-none">
          <InsuranceDisplay insuranceIds={insuranceIds} />
        </ExpandableSection>

        {/* Doctors */}
        <ExpandableSection title={`Madaktari (${availableDoctors.length} wanapatikana)`} count={doctors.length} icon={<Stethoscope className="h-4 w-4" />} className="shadow-none">
          <div className="space-y-2">
            {doctors.map((doc: any) => (
              <div key={doc.user_id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={doc.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {doc.profiles?.first_name?.[0]}{doc.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Dkt. {doc.profiles?.first_name} {doc.profiles?.last_name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{doc.doctor_type || 'Daktari wa Jumla'}</span>
                    {doc.consultation_fee && <span className="text-primary font-medium">TSh {doc.consultation_fee.toLocaleString()}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => navigate(`/doctor-profile/${doc.user_id}`)}>
                  Tazama
                </Button>
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Services */}
        <ExpandableSection title="Huduma Zinazopatikana" count={services.length} icon={<HeartPulse className="h-4 w-4" />} className="shadow-none">
          <div className="space-y-2">
            {services.map((service: any) => (
              <div key={service.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{service.name}</p>
                  {service.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{service.description}</p>}
                  {service.category && <Badge variant="outline" className="mt-1 text-[10px]">{service.category}</Badge>}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <Badge variant={service.is_available ? "default" : "secondary"} className="text-[10px]">
                    {service.is_available ? 'Inapatikana' : 'Haipo'}
                  </Badge>
                  {service.price && <p className="text-xs font-semibold text-primary mt-1">TSh {service.price.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>

        <ReviewsSection entityType="hospital" entityId={hospitalId || ''} entityName={hospital.name} showForm={false} />
      </div>
    </div>
  );
}