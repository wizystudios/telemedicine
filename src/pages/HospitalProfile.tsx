import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpandableSection } from '@/components/ExpandableSection';
import { 
  ArrowLeft, Phone, MapPin, Mail, Star, Hospital, Globe, 
  Clock, Users, Stethoscope, Shield, CheckCircle2, Ambulance,
  HeartPulse
} from 'lucide-react';
import { InsuranceDisplay } from '@/components/InsuranceSelector';
import { ReviewsSection } from '@/components/ReviewsSection';

export default function HospitalProfile() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const { data: hospital, isLoading } = useQuery({
    queryKey: ['hospital-profile', hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hospitals')
        .select(`
          *,
          doctor_profiles!doctor_profiles_hospital_id_fkey (
            user_id, bio, experience_years, consultation_fee, doctor_type, is_available,
            profiles!doctor_profiles_user_id_fkey (first_name, last_name, avatar_url),
            doctor_timetable (day_of_week, start_time, end_time, is_available, location)
          ),
          hospital_services (id, name, description, price, category, is_available),
          hospital_insurance (insurance_id)
        `)
        .eq('id', hospitalId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!hospitalId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white">
        <div className="max-w-4xl mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Rudi Nyuma
          </Button>
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-4 border-white/20">
              <AvatarImage src={hospital.logo_url} />
              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                <Hospital className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{hospital.name}</h1>
              <p className="text-white/80 text-sm mt-1">{hospital.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {hospital.is_verified && (
                  <Badge className="bg-white/20 text-white border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Imethibitishwa
                  </Badge>
                )}
                {hospital.has_ambulance && (
                  <Badge className="bg-red-500/80 text-white border-0">
                    <Ambulance className="w-3 h-3 mr-1" /> Ambulance
                  </Badge>
                )}
              </div>
              {hospital.rating > 0 && (
                <div className="flex items-center gap-1 mt-2 text-yellow-300">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold">{hospital.rating}</span>
                  <span className="text-white/60 text-sm">({hospital.total_reviews || 0} mapitio)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {/* Quick Stats */}
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
            <p className="text-lg font-bold">{hospital.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" /> Mawasiliano
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> <span>{hospital.address}</span>
            </div>
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-4 h-4" /> <span>{hospital.phone}</span>
              </a>
            )}
            {hospital.email && (
              <a href={`mailto:${hospital.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="w-4 h-4" /> <span>{hospital.email}</span>
              </a>
            )}
            {hospital.website && (
              <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="w-4 h-4" /> <span>Website</span>
              </a>
            )}
            {hospital.ambulance_phone && (
              <a href={`tel:${hospital.ambulance_phone}`} className="flex items-center gap-2 text-red-600 font-medium">
                <Ambulance className="w-4 h-4" /> <span>Ambulance: {hospital.ambulance_phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Insurance - clickable header only, opens bottom sheet */}
        <ExpandableSection
          title="Bima Zinazokubaliwa"
          count={insuranceIds.length}
          icon={<Shield className="w-4 h-4 text-blue-500" />}
        >
          <InsuranceDisplay insuranceIds={insuranceIds} />
        </ExpandableSection>

        {/* Doctors - clickable header only */}
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
                        <h4 className="font-semibold text-sm truncate">
                          Dkt. {doc.profiles?.first_name} {doc.profiles?.last_name}
                        </h4>
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
                  </div>
                </div>
                <Button onClick={() => navigate(`/doctor-profile/${doc.user_id}`)} className="w-full mt-3" variant="outline" size="sm">
                  Ona Wasifu Kamili
                </Button>
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Services - clickable header only */}
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

        {/* Reviews */}
        <ReviewsSection entityType="hospital" entityId={hospitalId || ''} entityName={hospital.name} showForm={false} />
      </div>
    </div>
  );
}
