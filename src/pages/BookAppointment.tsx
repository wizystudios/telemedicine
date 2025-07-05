
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get('doctor');
  const { user } = useAuth();
  const { toast } = useToast();

  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
    symptoms: '',
    consultation_type: 'video',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch doctor info
  const { data: doctor } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      if (!doctorId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          doctor_profiles (consultation_fee)
        `)
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!doctorId
  });

  // Check for appointment conflicts
  const checkAppointmentConflict = async (dateTime: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', dateTime)
      .neq('status', 'cancelled');

    if (error) throw error;
    return data && data.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !user) return;

    setIsSubmitting(true);

    try {
      // Combine date and time
      const appointmentDateTime = new Date(`${appointmentData.date}T${appointmentData.time}`);
      const appointmentDateTimeISO = appointmentDateTime.toISOString();

      // Check for conflicts
      const hasConflict = await checkAppointmentConflict(appointmentDateTimeISO);
      if (hasConflict) {
        toast({
          title: 'Muda Umechukuliwa',
          description: 'Muda huu umeshachukuliwa. Tafadhali chagua muda mwingine.',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('appointments')
        .insert({
          doctor_id: doctorId,
          patient_id: user.id,
          appointment_date: appointmentDateTimeISO,
          consultation_type: appointmentData.consultation_type,
          symptoms: appointmentData.symptoms,
          notes: appointmentData.notes,
          status: 'pending',
          fee: doctor?.doctor_profiles?.[0]?.consultation_fee || 0
        });

      if (error) {
        console.error('Appointment creation error:', error);
        throw error;
      }

      toast({
        title: 'Miadi Imepangwa',
        description: 'Ombi lako la miadi limepokelewa. Utapokea ujumbe wa uthibitisho.',
      });

      navigate('/appointments');
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: 'Hitilafu',
        description: error.message || 'Imeshindwa kupanga miadi',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!doctorId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Daktari hajakuwa</h3>
          <Button onClick={() => navigate('/doctors-list')} className="mt-4">
            Chagua Daktari
          </Button>
        </div>
      </div>
    );
  }

  const displayName = doctor ? `Dkt. ${doctor.first_name} ${doctor.last_name}` : 'Daktari';

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Panga Miadi
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Doctor Info */}
        {doctor && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <User className="w-12 h-12 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {displayName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {doctor.email}
                  </p>
                  {doctor.doctor_profiles?.[0]?.consultation_fee && (
                    <p className="text-sm text-emerald-600">
                      Ada: TSh {doctor.doctor_profiles[0].consultation_fee.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Maelezo ya Miadi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Tarehe</Label>
                  <Input
                    id="date"
                    type="date"
                    value={appointmentData.date}
                    onChange={(e) => setAppointmentData({...appointmentData, date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="time">Muda</Label>
                  <Input
                    id="time"
                    type="time"
                    value={appointmentData.time}
                    onChange={(e) => setAppointmentData({...appointmentData, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Consultation Type */}
              <div>
                <Label htmlFor="consultation_type">Aina ya Ushauri</Label>
                <select
                  id="consultation_type"
                  value={appointmentData.consultation_type}
                  onChange={(e) => setAppointmentData({...appointmentData, consultation_type: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="video">Video Call</option>
                  <option value="audio">Simu</option>
                  <option value="chat">Mazungumzo</option>
                  <option value="in-person">Kukutana</option>
                </select>
              </div>

              {/* Symptoms */}
              <div>
                <Label htmlFor="symptoms">Dalili/Tatizo</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Eleza dalili au tatizo lako kwa ufupi..."
                  value={appointmentData.symptoms}
                  onChange={(e) => setAppointmentData({...appointmentData, symptoms: e.target.value})}
                  required
                />
              </div>

              {/* Additional Notes */}
              <div>
                <Label htmlFor="notes">Maelezo ya Ziada (si lazima)</Label>
                <Textarea
                  id="notes"
                  placeholder="Maelezo mengine yoyote..."
                  value={appointmentData.notes}
                  onChange={(e) => setAppointmentData({...appointmentData, notes: e.target.value})}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Inapanga...' : 'Panga Miadi'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
