import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import { 
  ArrowLeft, Phone, MapPin, Mail, Star, Hospital,
  Clock, Users, Stethoscope, Shield, CheckCircle2, HeartPulse
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
            profiles!doctor_profiles_user_id_fkey (first_name, last_name, avatar_url),
            doctor_timetable (day_of_week, start_time, end_time, is_available, location)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!polyclinic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
  const days = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="max-w-4xl mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Rudi Nyuma
          </Button>
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-4 border-white/20">
              <AvatarImage src={polyclinic.logo_url} />
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                <Hospital className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{polyclinic.name}</h1>
              <p className="text-white/80 text-sm mt-1">{polyclinic.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {polyclinic.is_verified && (
                  <Badge className="bg-white/20 text-white border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Imethibitishwa
                  </Badge>
                )}
              </div>
              {polyclinic.rating > 0 && (
                <div className="flex items-center gap-1 mt-2 text-yellow-300">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold">{polyclinic.rating}</span>
                  <span className="text-white/60 text-sm">({polyclinic.total_reviews || 0} mapitio)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <Users className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{doctors.length}</p>
            <p className="text-xs text-muted-foreground">Madaktari</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <HeartPulse className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{services.length}</p>
            <p className="text-xs text-muted-foreground">Huduma</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border shadow-sm">
            <Star className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-lg font-bold">{polyclinic.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" /> Mawasiliano
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> <span>{polyclinic.address}</span>
            </div>
            {polyclinic.phone && (
              <a href={`tel:${polyclinic.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-4 h-4" /> <span>{polyclinic.phone}</span>
              </a>
            )}
            {polyclinic.email && (
              <a href={`mailto:${polyclinic.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="w-4 h-4" /> <span>{polyclinic.email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Insurance */}
        <ExpandableSection
          title="Bima Zinazokubaliwa"
          count={insuranceIds.length}
          icon={<Shield className="w-4 h-4 text-blue-500" />}
        >
          <InsuranceDisplay insuranceIds={insuranceIds} />
        </ExpandableSection>

        {/* Doctors */}
        <ExpandableSection
          title={`Madaktari (${availableDoctors.length} wanapatikana)`}
          count={doctors.length}
          icon={<Stethoscope className="w-4 h-4" />}
        >
          <div className="space-y-3">
            {doctors.map((doc: any) => (
              <div key={doc.user_id} className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={doc.profiles?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {doc.profiles?.first_name?.[0]}{doc.profiles?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">Dkt. {doc.profiles?.first_name} {doc.profiles?.last_name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{doc.bio || doc.doctor_type || 'Daktari wa Jumla'}</p>
                      </div>
                      <Badge variant={doc.is_available ? "default" : "secondary"} className="shrink-0 text-xs">
                        {doc.is_available ? 'Anapatikana' : 'Hapatikani'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      {doc.experience_years && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {doc.experience_years} miaka</span>
                      )}
                      {doc.consultation_fee && (
                        <span className="font-semibold text-primary">TSh {doc.consultation_fee.toLocaleString()}</span>
                      )}
                    </div>
                    {doc.doctor_timetable?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex flex-wrap gap-1">
                          {doc.doctor_timetable
                            .filter((t: any) => t.is_available)
                            .slice(0, 3)
                            .map((t: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs py-0">
                                {days[t.day_of_week]?.slice(0, 3)} {t.start_time?.slice(0,5)}-{t.end_time?.slice(0,5)}
                              </Badge>
                            ))}
                          {doc.doctor_timetable.filter((t: any) => t.is_available).length > 3 && (
                            <Badge variant="outline" className="text-xs py-0">
                              +{doc.doctor_timetable.filter((t: any) => t.is_available).length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => navigate(`/doctor-profile/${doc.user_id}`)} className="w-full mt-3" variant="outline" size="sm">
                  Ona Wasifu Kamili
                </Button>
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Services */}
        <ExpandableSection
          title="Huduma Zinazopatikana"
          count={services.length}
          icon={<HeartPulse className="w-4 h-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((service: any) => (
              <div key={service.id} className="p-3 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm truncate">{service.name}</h4>
                    {service.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>}
                    {service.category && <Badge variant="outline" className="mt-2 text-xs">{service.category}</Badge>}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <Badge variant={service.is_available ? "default" : "secondary"} className="text-xs">
                      {service.is_available ? 'Inapatikana' : 'Haipo'}
                    </Badge>
                    {service.price && <p className="text-sm font-semibold text-primary mt-1">TSh {service.price.toLocaleString()}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* General Services from array */}
        <ExpandableSection
          title="Huduma za Jumla"
          count={polyclinic.services?.length || 0}
          icon={<HeartPulse className="w-4 h-4" />}
        >
          <div className="flex flex-wrap gap-2">
            {polyclinic.services?.map((service: string, index: number) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">{service}</Badge>
            ))}
          </div>
        </ExpandableSection>
      </div>
    </div>
  );
}
