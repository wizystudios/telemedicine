
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Phone, Video, Calendar, Star, Clock, Building, MapPin, Mail } from 'lucide-react';
import { useCallSession } from '@/hooks/useCallSession';
import { useToast } from '@/hooks/use-toast';

export default function DoctorProfile() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { initiateCall } = useCallSession();
  const { toast } = useToast();

  // Fetch doctor profile with additional info
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
            license_number
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

  const handleMessage = () => {
    navigate(`/messages?doctor=${doctorId}`);
  };

  const handleBookAppointment = () => {
    navigate(`/book-appointment?doctor=${doctorId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Daktari hajapatikana</h3>
          <Button onClick={() => navigate('/doctors-list')} className="mt-4">
            Rudi kwenye Orodha ya Madaktari
          </Button>
        </div>
      </div>
    );
  }

  const displayName = `Dkt. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Daktari';
  const doctorProfile = doctor.doctor_profiles?.[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Rudi Nyuma
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <Avatar className="w-32 h-32 ring-4 ring-emerald-200 dark:ring-emerald-800">
                <AvatarImage src={doctor?.avatar_url} alt={displayName} />
                <AvatarFallback className="text-2xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {doctor?.first_name?.[0]}{doctor?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {displayName}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                  {doctorProfile?.bio || 'Daktari wa Jumla'}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <Badge variant="secondary">Daktari</Badge>
                  {doctorProfile?.is_verified && (
                    <Badge className="bg-blue-500">Amethibitishwa</Badge>
                  )}
                  <Badge className="bg-green-500">Online</Badge>
                </div>
                {doctorProfile?.rating && (
                  <div className="flex items-center text-yellow-500 mb-2">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    <span className="text-sm">{doctorProfile.rating} ({doctorProfile.total_reviews || 0} mapitio)</span>
                  </div>
                )}
                {doctorProfile?.consultation_fee && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Ada ya ushauri: TSh {doctorProfile.consultation_fee.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Maelezo ya Mawasiliano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <span>{doctor?.email}</span>
            </div>
            {doctor?.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <span>{doctor.phone}</span>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-500" />
              <span>{doctor?.country || 'Tanzania'}</span>
            </div>
            {doctorProfile?.experience_years && (
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>{doctorProfile.experience_years} miaka ya uzoefu</span>
              </div>
            )}
            {doctorProfile?.license_number && (
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-gray-500" />
                <span>Leseni: {doctorProfile.license_number}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Info */}
        {(doctorProfile?.bio || doctorProfile?.education) && (
          <Card>
            <CardHeader>
              <CardTitle>Maelezo ya Kitaalamu</CardTitle>
            </CardHeader>
            <CardContent>
              {doctorProfile?.bio && (
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {doctorProfile.bio}
                </p>
              )}
              {doctorProfile?.education && (
                <div>
                  <h4 className="font-semibold mb-2">Elimu:</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    {doctorProfile.education.map((edu: string, index: number) => (
                      <li key={index}>{edu}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={handleMessage}
            className="h-12"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Tuma Ujumbe
          </Button>
          <Button 
            onClick={handleBookAppointment}
            variant="outline"
            className="h-12"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Panga Miadi
          </Button>
          <Button 
            onClick={() => handleCall('audio')}
            variant="outline"
            className="h-12"
          >
            <Phone className="w-5 h-5 mr-2" />
            Simu
          </Button>
          <Button 
            onClick={() => handleCall('video')}
            variant="outline"
            className="h-12"
          >
            <Video className="w-5 h-5 mr-2" />
            Video Call
          </Button>
        </div>
      </div>
    </div>
  );
}
