import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, MessageCircle, Phone, Video, Calendar, Star, 
  Clock, Building, MapPin, Mail, GraduationCap, Languages,
  Shield, CheckCircle2, Stethoscope
} from 'lucide-react';
import { useCallSession } from '@/hooks/useCallSession';
import { useToast } from '@/hooks/use-toast';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { ReviewsSection } from '@/components/ReviewsSection';

export default function DoctorProfile() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { initiateCall } = useCallSession();
  const { toast } = useToast();

  // Fetch doctor profile
  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor-profile', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          doctor_profiles (
            bio,
            experience_years,
            consultation_fee,
            rating,
            total_reviews,
            education,
            languages,
            is_verified,
            license_number,
            hospital_name,
            doctor_type,
            specialty_id
          )
        `)
        .eq('id', doctorId)
        .eq('role', 'doctor')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!doctorId
  });

  // Fetch timetable separately
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
    enabled: !!doctorId
  });

  const handleCall = async (type: 'audio' | 'video') => {
    if (!doctorId) return;
    try {
      const session = await initiateCall(doctorId, type);
      if (session) {
        toast({
          title: 'Ombi la Simu Limetumwa',
          description: `Ombi lako la ${type === 'audio' ? 'simu' : 'video'} limetumwa kwa daktari`,
        });
      }
    } catch (error) {
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma ombi la simu',
        variant: 'destructive'
      });
    }
  };

  const handleMessage = () => navigate(`/messages?doctor=${doctorId}`);
  const handleBookAppointment = () => navigate(`/book-appointment?doctor=${doctorId}`);

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

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">Daktari hajapatikana</h3>
          <Button onClick={() => navigate('/doctors-list')} className="mt-4">
            Rudi kwenye Orodha ya Madaktari
          </Button>
        </div>
      </div>
    );
  }

  const displayName = `Dkt. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Daktari';
  const doctorProfile = doctor.doctor_profiles?.[0];
  const timetable = timetableData || [];
  const days = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

  // Group timetable by availability
  const availableDays = timetable.filter((t: any) => t.is_available);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Professional Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
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
            <Avatar className="w-24 h-24 border-4 border-white/20 shadow-xl">
              <AvatarImage src={doctor?.avatar_url} alt={displayName} />
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                {doctor?.first_name?.[0]}{doctor?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-white/80 text-sm mt-1">
                {doctorProfile?.doctor_type || 'Daktari wa Jumla'}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {doctorProfile?.is_verified && (
                  <Badge className="bg-white/20 text-white border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Amethibitishwa
                  </Badge>
                )}
                {doctorProfile?.hospital_name && (
                  <Badge className="bg-white/10 text-white border-0">
                    <Building className="w-3 h-3 mr-1" /> {doctorProfile.hospital_name}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 mt-3">
                {doctorProfile?.rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-300">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-semibold">{doctorProfile.rating}</span>
                    <span className="text-white/60 text-sm">({doctorProfile.total_reviews || 0})</span>
                  </div>
                )}
                {doctorProfile?.consultation_fee && (
                  <div className="text-white/90 text-sm font-medium">
                    TSh {doctorProfile.consultation_fee.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <Button onClick={handleMessage} variant="outline" className="flex-col h-auto py-3">
            <MessageCircle className="w-5 h-5 mb-1 text-primary" />
            <span className="text-xs">Ujumbe</span>
          </Button>
          <Button onClick={handleBookAppointment} variant="outline" className="flex-col h-auto py-3">
            <Calendar className="w-5 h-5 mb-1 text-primary" />
            <span className="text-xs">Miadi</span>
          </Button>
          <Button onClick={() => handleCall('audio')} variant="outline" className="flex-col h-auto py-3">
            <Phone className="w-5 h-5 mb-1 text-primary" />
            <span className="text-xs">Simu</span>
          </Button>
          <Button onClick={() => handleCall('video')} variant="outline" className="flex-col h-auto py-3">
            <Video className="w-5 h-5 mb-1 text-primary" />
            <span className="text-xs">Video</span>
          </Button>
        </div>

        {/* Contact & Experience Info */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary" />
            Maelezo ya Daktari
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="truncate">{doctor?.email}</span>
            </div>
            {doctor?.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{doctor.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{doctor?.country || 'Tanzania'}</span>
            </div>
            {doctorProfile?.experience_years && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{doctorProfile.experience_years} miaka uzoefu</span>
              </div>
            )}
            {doctorProfile?.license_number && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <Shield className="w-4 h-4" />
                <span>Leseni: {doctorProfile.license_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Timetable - Collapsible */}
        {timetable.length > 0 && (
          <CollapsibleSection
            title="Ratiba ya Kazi"
            icon={<Clock className="w-5 h-5" />}
            badge={`${availableDays.length} siku`}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {days.map((dayName, dayIndex) => {
                const schedule = timetable.find((t: any) => t.day_of_week === dayIndex);
                return (
                  <div 
                    key={dayIndex} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      schedule?.is_available 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <span className="font-medium text-sm">{dayName}</span>
                    <span className={`text-sm ${schedule?.is_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {schedule?.is_available 
                        ? `${schedule.start_time?.slice(0,5)} - ${schedule.end_time?.slice(0,5)}`
                        : 'Hapatikani'
                      }
                    </span>
                  </div>
                );
              })}
            </div>
            {timetable[0]?.location && (
              <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {timetable[0].location}
              </p>
            )}
          </CollapsibleSection>
        )}

        {/* Education */}
        {doctorProfile?.education?.length > 0 && (
          <CollapsibleSection
            title="Elimu na Mafunzo"
            icon={<GraduationCap className="w-5 h-5" />}
            badge={doctorProfile.education.length}
          >
            <ul className="space-y-2">
              {doctorProfile.education.map((edu: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></span>
                  <span>{edu}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Languages */}
        {doctorProfile?.languages?.length > 0 && (
          <CollapsibleSection
            title="Lugha Anazozungumza"
            icon={<Languages className="w-5 h-5" />}
            badge={doctorProfile.languages.length}
          >
            <div className="flex flex-wrap gap-2">
              {doctorProfile.languages.map((lang: string, index: number) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {lang}
                </Badge>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Bio */}
        {doctorProfile?.bio && (
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <h3 className="font-semibold mb-2">Kuhusu Daktari</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {doctorProfile.bio}
            </p>
          </div>
        )}

        {/* Reviews Section */}
        <ReviewsSection 
          entityType="doctor"
          entityId={doctorId || ''}
          entityName={displayName}
        />
      </div>
    </div>
  );
}
