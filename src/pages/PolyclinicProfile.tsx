import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  ArrowLeft, Phone, MapPin, Mail, Star, Hospital,
  Clock, Users, Stethoscope, Shield, CheckCircle2, HeartPulse, ChevronDown
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
            user_id,
            bio,
            experience_years,
            consultation_fee,
            doctor_type,
            is_available,
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Inapakia...</p>
        </div>
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

  const days = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
  const doctors = polyclinic.doctor_profiles || [];
  const services = polyclinic.polyclinic_services || [];
  const insuranceIds = polyclinic.polyclinic_insurance?.map((pi: any) => pi.insurance_id).filter(Boolean) || [];
  const availableDoctors = doctors.filter((d: any) => d.is_available);

  // Render doctor card
  const renderDoctorCard = (doc: any) => (
    <div 
      key={doc.user_id} 
      className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
    >
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
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {doc.experience_years} miaka
              </span>
            )}
            {doc.consultation_fee && (
              <span className="font-semibold text-primary">
                TSh {doc.consultation_fee.toLocaleString()}
              </span>
            )}
          </div>

          {/* Doctor's Timetable - Compact */}
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
                  ))
                }
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
      
      <Button 
        onClick={() => navigate(`/doctor-profile/${doc.user_id}`)}
        className="w-full mt-3"
        variant="outline"
        size="sm"
      >
        Ona Wasifu Kamili
      </Button>
    </div>
  );

  // Render service card
  const renderServiceCard = (service: any) => (
    <div 
      key={service.id} 
      className="p-3 bg-muted/30 rounded-lg border border-border/50"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm truncate">{service.name}</h4>
          {service.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
          )}
          {service.category && (
            <Badge variant="outline" className="mt-2 text-xs">{service.category}</Badge>
          )}
        </div>
        <div className="text-right shrink-0 ml-2">
          <Badge variant={service.is_available ? "default" : "secondary"} className="text-xs">
            {service.is_available ? 'Inapatikana' : 'Haipo'}
          </Badge>
          {service.price && (
            <p className="text-sm font-semibold text-primary mt-1">
              TSh {service.price.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Professional Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="max-w-4xl mx-auto p-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Rudi Nyuma
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
                {polyclinic.is_promoted && (
                  <Badge className="bg-yellow-500/80 text-white border-0">
                    ⭐ Inapendekezwa
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

      <div className="max-w-4xl mx-auto p-4 space-y-4">
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
            <p className="text-lg font-bold">{polyclinic.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Mawasiliano
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{polyclinic.address}</span>
            </div>
            {polyclinic.phone && (
              <a href={`tel:${polyclinic.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="w-4 h-4" />
                <span>{polyclinic.phone}</span>
              </a>
            )}
            {polyclinic.email && (
              <a href={`mailto:${polyclinic.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="w-4 h-4" />
                <span>{polyclinic.email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Insurance Providers - Show 3 with View All */}
        {insuranceIds.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Bima Zinazokubaliwa ({insuranceIds.length})
            </h3>
            <InsuranceDisplay insuranceIds={insuranceIds.slice(0, 3)} />
            {insuranceIds.length > 3 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 text-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Ona Bima Zote ({insuranceIds.length})
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      Bima Zinazokubaliwa ({insuranceIds.length})
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100%-60px)]">
                    <InsuranceDisplay insuranceIds={insuranceIds} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}

        {/* Doctors - Show 3 with View All Bottom Sheet */}
        {doctors.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              Madaktari Wetu ({availableDoctors.length}/{doctors.length})
            </h3>
            <div className="space-y-3">
              {doctors.slice(0, 3).map(renderDoctorCard)}
            </div>
            {doctors.length > 3 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 text-sm">
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Ona Madaktari Wote ({doctors.length})
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-primary" />
                      Madaktari Wote ({doctors.length})
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100%-60px)] space-y-3 pr-2">
                    {doctors.map(renderDoctorCard)}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}

        {/* Services - Show 3 with View All Bottom Sheet */}
        {services.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-primary" />
              Huduma Zinazopatikana ({services.filter((s: any) => s.is_available).length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.slice(0, 3).map(renderServiceCard)}
            </div>
            {services.length > 3 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 text-sm">
                    <HeartPulse className="w-4 h-4 mr-2" />
                    Ona Huduma Zote ({services.length})
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-primary" />
                      Huduma Zote ({services.length})
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100%-60px)] pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {services.map(renderServiceCard)}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}

        {/* General Services from array */}
        {polyclinic.services?.length > 0 && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-primary" />
              Huduma za Jumla ({polyclinic.services.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {polyclinic.services.slice(0, 5).map((service: string, index: number) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {service}
                </Badge>
              ))}
            </div>
            {polyclinic.services.length > 5 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full mt-3 text-sm">
                    <HeartPulse className="w-4 h-4 mr-2" />
                    Ona Huduma Zote ({polyclinic.services.length})
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-primary" />
                      Huduma za Jumla ({polyclinic.services.length})
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100%-60px)]">
                    <div className="flex flex-wrap gap-2">
                      {polyclinic.services.map((service: string, index: number) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
