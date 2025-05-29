
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, Star, Video, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, isAfter, isBefore, isSameDay } from 'date-fns';

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [consultationType, setConsultationType] = useState('video');
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState(30);

  // Fetch doctor details
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select(`
          *,
          profiles!inner(first_name, last_name, avatar_url),
          specialties(name, icon)
        `)
        .eq('user_id', doctorId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!doctorId
  });

  // Fetch doctor availability
  const { data: availability } = useQuery({
    queryKey: ['doctor-availability', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_available', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!doctorId
  });

  // Generate time slots for selected date
  const generateTimeSlots = (date: Date): TimeSlot[] => {
    if (!availability || !date) return [];
    
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find(av => av.day_of_week === dayOfWeek);
    
    if (!dayAvailability) return [];

    const slots: TimeSlot[] = [];
    const startTime = new Date(`2000-01-01T${dayAvailability.start_time}`);
    const endTime = new Date(`2000-01-01T${dayAvailability.end_time}`);
    
    const current = new Date(startTime);
    while (current < endTime) {
      const timeString = current.toTimeString().slice(0, 5);
      slots.push({
        time: timeString,
        available: true // In real app, check against existing appointments
      });
      current.setMinutes(current.getMinutes() + duration);
    }
    
    return slots;
  };

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];

  // Book appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Appointment Booked!',
        description: 'Your appointment has been successfully booked.',
      });
      navigate('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Booking Failed',
        description: 'Failed to book appointment. Please try again.',
        variant: 'destructive'
      });
      console.error('Booking error:', error);
    }
  });

  const handleBooking = () => {
    if (!selectedDate || !selectedTime || !user) {
      toast({
        title: 'Missing Information',
        description: 'Please select date and time for your appointment.',
        variant: 'destructive'
      });
      return;
    }

    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

    const appointmentData = {
      patient_id: user.id,
      doctor_id: doctorId,
      specialty_id: doctor?.specialty_id,
      appointment_date: appointmentDateTime.toISOString(),
      duration_minutes: duration,
      consultation_type: consultationType,
      symptoms: symptoms.trim() || null,
      fee: doctor?.consultation_fee || 0,
      status: 'scheduled'
    };

    bookAppointmentMutation.mutate(appointmentData);
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    const maxDate = addDays(today, 30); // Allow booking up to 30 days ahead
    
    return isBefore(date, today) || isAfter(date, maxDate);
  };

  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Doctor not found
          </h2>
          <Button onClick={() => navigate('/doctors')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/doctors')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Book Appointment
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                    <span className="text-emerald-600 font-semibold text-lg">
                      {doctor.profiles?.first_name?.[0]}{doctor.profiles?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {doctor.specialties?.name}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(doctor.rating) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-gray-600 text-sm">
                      {doctor.rating.toFixed(1)} ({doctor.total_reviews} reviews)
                    </span>
                  </div>
                </div>
                
                <div className="text-2xl font-bold text-emerald-600">
                  ${doctor.consultation_fee}
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {doctor.bio || 'Experienced healthcare professional.'}
                </p>

                <div className="flex items-center text-gray-600 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  {doctor.experience_years} years experience
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Your Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Consultation Type */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Consultation Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setConsultationType('video')}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        consultationType === 'video'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Video className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                      <div className="text-sm font-medium">Video Call</div>
                    </button>
                    <button
                      onClick={() => setConsultationType('chat')}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        consultationType === 'chat'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <MessageSquare className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                      <div className="text-sm font-medium">Chat Only</div>
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Duration
                  </label>
                  <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Select Date
                  </label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    className="rounded-md border"
                  />
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Available Times on {format(selectedDate, 'MMM dd, yyyy')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`p-2 rounded-lg border text-sm transition-colors ${
                            selectedTime === slot.time
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                              : slot.available
                              ? 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                              : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                    {timeSlots.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        No available time slots for this date.
                      </p>
                    )}
                  </div>
                )}

                {/* Symptoms */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Describe your symptoms (optional)
                  </label>
                  <Textarea
                    placeholder="Please describe your symptoms or reason for consultation..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Book Button */}
                <Button 
                  onClick={handleBooking}
                  disabled={!selectedDate || !selectedTime || bookAppointmentMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {bookAppointmentMutation.isPending ? 'Booking...' : 'Book Appointment'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
