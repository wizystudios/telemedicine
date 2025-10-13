import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, MapPin, Mail, Star, Hospital, Globe, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
            user_id,
            bio,
            experience_years,
            consultation_fee,
            doctor_type,
            profiles!doctor_profiles_user_id_fkey (first_name, last_name, avatar_url),
            doctor_timetable (day_of_week, start_time, end_time, is_available, location)
          )
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Inapakia...</p>
        </div>
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

  const days = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Rudi Nyuma
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Hospital className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{hospital.name}</h1>
                <p className="text-muted-foreground mb-2">{hospital.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {hospital.is_verified && <Badge className="bg-blue-500">Imethibitishwa</Badge>}
                  {hospital.is_promoted && <Badge className="bg-yellow-500">Tangazwa</Badge>}
                </div>
                {hospital.rating && (
                  <div className="flex items-center text-yellow-500 mb-2">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    <span className="text-sm">{hospital.rating} ({hospital.total_reviews || 0} mapitio)</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Maelezo ya Mawasiliano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <span>{hospital.address}</span>
            </div>
            {hospital.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a href={`tel:${hospital.phone}`} className="text-blue-600 hover:underline">
                  {hospital.phone}
                </a>
              </div>
            )}
            {hospital.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <a href={`mailto:${hospital.email}`} className="text-blue-600 hover:underline">
                  {hospital.email}
                </a>
              </div>
            )}
            {hospital.website && (
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {hospital.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctors & Timetables */}
        {hospital.doctor_profiles && hospital.doctor_profiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Madaktari na Ratiba Zao</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {hospital.doctor_profiles.map((doctorProfile: any) => (
                  <div key={doctorProfile.user_id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={doctorProfile.profiles?.avatar_url} />
                        <AvatarFallback>
                          {doctorProfile.profiles?.first_name?.[0]}{doctorProfile.profiles?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold">
                          Dkt. {doctorProfile.profiles?.first_name} {doctorProfile.profiles?.last_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{doctorProfile.bio || doctorProfile.doctor_type}</p>
                        {doctorProfile.experience_years && (
                          <p className="text-xs text-muted-foreground">{doctorProfile.experience_years} miaka ya uzoefu</p>
                        )}
                      </div>
                      {doctorProfile.consultation_fee && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            TSh {doctorProfile.consultation_fee.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Doctor's Timetable */}
                    {doctorProfile.doctor_timetable && doctorProfile.doctor_timetable.length > 0 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Ratiba ya Kazi
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {doctorProfile.doctor_timetable.map((schedule: any, idx: number) => (
                            <div key={idx} className="text-sm flex items-center justify-between p-2 bg-muted/50 rounded">
                              <span className="font-medium">{days[schedule.day_of_week]}</span>
                              <span className={schedule.is_available ? 'text-green-600' : 'text-red-600'}>
                                {schedule.is_available 
                                  ? `${schedule.start_time.slice(0,5)} - ${schedule.end_time.slice(0,5)}`
                                  : 'Haipo'}
                              </span>
                            </div>
                          ))}
                        </div>
                        {doctorProfile.doctor_timetable[0]?.location && (
                          <p className="text-xs text-muted-foreground mt-2">
                            📍 Mahali: {doctorProfile.doctor_timetable[0].location}
                          </p>
                        )}
                      </div>
                    )}

                    <Button 
                      onClick={() => navigate(`/doctor-profile/${doctorProfile.user_id}`)}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      Ona Wasifu Kamili
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {hospital.services && hospital.services.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Huduma Zinazopatikana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hospital.services.map((service: string, index: number) => (
                  <Badge key={index} variant="secondary">{service}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
