import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Phone, Video, Calendar, MapPin, Mail, User, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch patient profile
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-profile', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          patient_profiles (
            date_of_birth,
            gender,
            blood_type,
            emergency_contact_name,
            emergency_contact_phone,
            medical_history,
            allergies,
            current_medications
          )
        `)
        .eq('id', patientId)
        .eq('role', 'patient')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });

  const handleMessage = () => {
    navigate(`/messages?patient=${patientId}`);
  };

  const handleBookAppointment = () => {
    navigate(`/book-appointment?patient=${patientId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mgonjwa hajapatikana</h3>
          <Button onClick={() => navigate('/patients')} className="mt-4">
            Rudi kwenye Orodha ya Wagonjwa
          </Button>
        </div>
      </div>
    );
  }

  const displayName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Mgonjwa';
  const patientProfile = patient.patient_profiles?.[0];

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
              <Avatar className="w-32 h-32 ring-4 ring-blue-200 dark:ring-blue-800">
                <AvatarImage src={patient.avatar_url} alt={displayName} />
                <AvatarFallback className="text-2xl bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {patient.first_name?.[0] || 'M'}{patient.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {displayName}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                  Mgonjwa
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <Badge variant="secondary">Mgonjwa</Badge>
                  {patientProfile?.blood_type && (
                    <Badge className="bg-red-500">Aina ya Damu: {patientProfile.blood_type}</Badge>
                  )}
                </div>
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
              <span>{patient.email}</span>
            </div>
            {patient.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <span>{patient.phone}</span>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-500" />
              <span>{patient.country || 'Tanzania'}</span>
            </div>
            {patientProfile?.gender && (
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-500" />
                <span>Jinsia: {patientProfile.gender === 'male' ? 'Mume' : 'Mke'}</span>
              </div>
            )}
            {patientProfile?.date_of_birth && (
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span>Umri: {new Date().getFullYear() - new Date(patientProfile.date_of_birth).getFullYear()} miaka</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medical Information */}
        {(patientProfile?.allergies || patientProfile?.current_medications || patientProfile?.medical_history) && (
          <Card>
            <CardHeader>
              <CardTitle>Maelezo ya Kiafya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patientProfile?.allergies && patientProfile.allergies.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Heart className="w-4 h-4 mr-1 text-red-500" />
                    Mzio:
                  </h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    {patientProfile.allergies.map((allergy: string, index: number) => (
                      <li key={index}>{allergy}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {patientProfile?.current_medications && patientProfile.current_medications.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Dawa za Sasa:</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    {patientProfile.current_medications.map((med: string, index: number) => (
                      <li key={index}>{med}</li>
                    ))}
                  </ul>
                </div>
              )}

              {patientProfile?.medical_history && patientProfile.medical_history.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Historia ya Magonjwa:</h4>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                    {patientProfile.medical_history.map((history: string, index: number) => (
                      <li key={index}>{history}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {(patientProfile?.emergency_contact_name || patientProfile?.emergency_contact_phone) && (
          <Card>
            <CardHeader>
              <CardTitle>Mawasiliano ya Dharura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {patientProfile?.emergency_contact_name && (
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <span>{patientProfile.emergency_contact_name}</span>
                </div>
              )}
              {patientProfile?.emergency_contact_phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <span>{patientProfile.emergency_contact_phone}</span>
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
        </div>
      </div>
    </div>
  );
}