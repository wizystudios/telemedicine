import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import {
  ArrowLeft, Phone, MapPin, Mail, Star, Hospital,
  Clock, Stethoscope, Shield, CheckCircle2, HeartPulse
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';

export default function PolyclinicProfile() {
  const { polyclinicId } = useParams();
  const navigate = useNavigate();

  const { data: polyclinic, isLoading } = useQuery({
    queryKey: ['polyclinic-profile', polyclinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polyclinics')
        .select(`
          *,
          doctor_profiles!doctor_profiles_polyclinic_id_fkey (
            user_id, bio, experience_years, consultation_fee, doctor_type, is_available,
            profiles!doctor_profiles_user_id_fkey (first_name, last_name, avatar_url)
          ),
          polyclinic_services (id, name, description, price, category, is_available),
          polyclinic_insurance (insurance_id)
        `)
        .eq('id', polyclinicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!polyclinicId
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!polyclinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium">Polyclinic haijapatikana</h3>
          <Button onClick={() => navigate('/')} className="mt-4">Rudi Nyumbani</Button>
        </div>
      </div>
    );
  }

  const doctors = polyclinic.doctor_profiles || [];
  const services = polyclinic.polyclinic_services || [];
  const insuranceIds = polyclinic.polyclinic_insurance?.map((pi: any) => pi.insurance_id).filter(Boolean) || [];
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
              <AvatarImage src={polyclinic.logo_url} alt={polyclinic.name} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                <Hospital className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{polyclinic.name}</h1>
              {polyclinic.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{polyclinic.description}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {polyclinic.is_verified && (
                  <Badge variant="secondary" className="h-6 px-2 text-[11px]">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Imethibitishwa
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {polyclinic.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-current text-primary" />
                    <span className="font-semibold text-foreground">{polyclinic.rating}</span>
                    <span>({polyclinic.total_reviews || 0})</span>
                  </div>
                )}
                <span>{doctors.length} madaktari</span>
                <span>{services.length} huduma</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-primary" /> Mawasiliano
          </h2>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{polyclinic.address}</span>
            </div>
            {polyclinic.phone && (
              <a href={`tel:${polyclinic.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="h-4 w-4" />
                <span>{polyclinic.phone}</span>
              </a>
            )}
            {polyclinic.email && (
              <a href={`mailto:${polyclinic.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="h-4 w-4" />
                <span>{polyclinic.email}</span>
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

        {/* General Services */}
        {polyclinic.services?.length > 0 && (
          <ExpandableSection title="Huduma za Jumla" count={polyclinic.services.length} icon={<HeartPulse className="h-4 w-4" />} className="shadow-none">
            <div className="flex flex-wrap gap-2">
              {polyclinic.services.map((service: string, index: number) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">{service}</Badge>
              ))}
            </div>
          </ExpandableSection>
        )}
      </div>
    </div>
  );
}