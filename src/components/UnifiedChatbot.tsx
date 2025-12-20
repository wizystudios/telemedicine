import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, Mic, MicOff, Bot, Stethoscope, Building, Pill, TestTube, MapPin, Star, 
  Calendar as CalendarIcon, Clock, Phone, X, MessageCircle, ArrowLeft, Check, CheckCheck,
  User, Mail, FileText, Globe, Video, PhoneCall, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: {
    type: 'doctors' | 'hospitals' | 'pharmacies' | 'labs' | 'appointments' | 'timetable' | 'alternative-times';
    items: any[];
    doctorId?: string;
  };
}

interface DoctorTimetable {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

export function UnifiedChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `Habari${user?.user_metadata?.first_name ? ` ${user.user_metadata.first_name}` : ''}! 👋\nNinaweza kukusaidia kupata daktari, hospitali, maduka ya dawa, au maabara. Bofya chaguo au andika swali.`,
      timestamp: new Date(),
      suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🔬 Maabara', '📅 Miadi Yangu']
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  // Modal states
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [selectedLab, setSelectedLab] = useState<any>(null);
  const [doctorTimetable, setDoctorTimetable] = useState<DoctorTimetable[]>([]);
  
  // Booking state
  const [bookingDoctor, setBookingDoctor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState('');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  
  // Doctor chat mode
  const [chatMode, setChatMode] = useState<'bot' | 'doctor'>('bot');
  const [chatDoctor, setChatDoctor] = useState<any>(null);
  const [chatAppointmentId, setChatAppointmentId] = useState<string | null>(null);
  const [doctorMessages, setDoctorMessages] = useState<any[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, doctorMessages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.lang = 'sw-TZ';
      recognition.current.onresult = (event: any) => {
        setInput(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  // Subscribe to doctor messages in real-time
  useEffect(() => {
    if (!chatAppointmentId) return;
    
    const channel = supabase
      .channel(`chat-${chatAppointmentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `appointment_id=eq.${chatAppointmentId}`
      }, (payload) => {
        if (payload.new.sender_id !== user?.id) {
          setDoctorMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatAppointmentId, user?.id]);

  const toggleListening = () => {
    if (recognition.current) {
      if (isListening) recognition.current.stop();
      else recognition.current.start();
      setIsListening(!isListening);
    }
  };

  // Fetch doctor's timetable
  const fetchDoctorTimetable = async (doctorId: string) => {
    const { data } = await supabase
      .from('doctor_timetable')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_available', true)
      .order('day_of_week');
    
    setDoctorTimetable(data || []);
    return data || [];
  };

  // Check booked times for a specific date
  const checkBookedTimes = async (doctorId: string, date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('appointments')
      .select('appointment_date')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', startOfDay.toISOString())
      .lte('appointment_date', endOfDay.toISOString())
      .in('status', ['scheduled', 'confirmed', 'pending']);

    const booked = data?.map(apt => format(new Date(apt.appointment_date), 'HH:mm')) || [];
    setBookedTimes(booked);
    return booked;
  };

  // Generate available time slots based on timetable
  const generateTimeSlots = (timetable: DoctorTimetable[], dayOfWeek: number, booked: string[]) => {
    const daySchedule = timetable.find(t => t.day_of_week === dayOfWeek);
    if (!daySchedule) return [];

    const slots: string[] = [];
    const [startHour] = daySchedule.start_time.split(':').map(Number);
    const [endHour] = daySchedule.end_time.split(':').map(Number);

    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      if (!booked.includes(time)) {
        slots.push(time);
      }
      const halfTime = `${hour.toString().padStart(2, '0')}:30`;
      if (!booked.includes(halfTime)) {
        slots.push(halfTime);
      }
    }

    return slots;
  };

  // Handle date selection for booking
  const handleDateSelect = async (date: Date | undefined) => {
    setBookingDate(date);
    if (!date || !bookingDoctor) return;

    const doctorId = bookingDoctor.user_id || bookingDoctor.profiles?.id;
    const dayOfWeek = date.getDay();
    
    const booked = await checkBookedTimes(doctorId, date);
    const slots = generateTimeSlots(doctorTimetable, dayOfWeek, booked);
    
    setAvailableTimes(slots);
    
    if (slots.length === 0) {
      toast({
        title: 'Hakuna nafasi',
        description: `Daktari hapatikani ${DAYS[dayOfWeek]}. Chagua siku nyingine.`,
        variant: 'destructive'
      });
    }
  };

  const processMessage = async (message: string): Promise<Message> => {
    const lower = message.toLowerCase();
    
    // Check for chat/wasiliana intent - enter doctor chat mode
    if (lower.includes('wasiliana') || lower.includes('ongea') || lower.includes('chat')) {
      const { data: doctors } = await supabase
        .from('doctor_profiles')
        .select(`*, profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url, phone, email), specialties(name)`)
        .eq('is_verified', true)
        .limit(10);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Chagua daktari unayetaka kuwasiliana naye:',
        timestamp: new Date(),
        data: doctors?.length ? { type: 'doctors', items: doctors } : undefined
      };
    }

    // Doctor search
    if (lower.includes('daktari') || lower.includes('doctor') || lower.includes('tafuta')) {
      const { data } = await supabase
        .from('doctor_profiles')
        .select(`*, profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url, phone, email), specialties(name)`)
        .eq('is_verified', true)
        .limit(10);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Madaktari ${data.length} wanapatikana. Bofya daktari kuona maelezo:` : 'Hakuna daktari walioidhinishwa sasa.',
        timestamp: new Date(),
        data: data?.length ? { type: 'doctors', items: data } : undefined
      };
    }

    // Hospital search
    if (lower.includes('hospitali') || lower.includes('hospital')) {
      const { data } = await supabase.from('hospitals').select('*').eq('is_verified', true).limit(10);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Hospitali ${data.length}. Bofya kuona maelezo:` : 'Hakuna hospitali.',
        timestamp: new Date(),
        data: data?.length ? { type: 'hospitals', items: data } : undefined
      };
    }

    // Pharmacy search
    if (lower.includes('dawa') || lower.includes('famasi') || lower.includes('pharmacy')) {
      const { data } = await supabase.from('pharmacies').select('*').eq('is_verified', true).limit(10);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Maduka ya dawa ${data.length}. Bofya kuona:` : 'Hakuna maduka.',
        timestamp: new Date(),
        data: data?.length ? { type: 'pharmacies', items: data } : undefined
      };
    }

    // Lab search
    if (lower.includes('maabara') || lower.includes('lab') || lower.includes('test')) {
      const { data } = await supabase.from('laboratories').select('*').eq('is_verified', true).limit(10);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Maabara ${data.length}. Bofya kuona:` : 'Hakuna maabara.',
        timestamp: new Date(),
        data: data?.length ? { type: 'labs', items: data } : undefined
      };
    }

    // My appointments
    if (lower.includes('miadi') || lower.includes('appointment')) {
      const { data } = await supabase
        .from('appointments')
        .select('*, doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)')
        .eq('patient_id', user?.id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(10);
      
      if (data?.length) {
        return {
          id: Date.now().toString(),
          type: 'bot',
          content: `Una miadi ${data.length}:`,
          timestamp: new Date(),
          data: { type: 'appointments', items: data }
        };
      }
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Huna miadi. Tafuta daktari kwanza ili kuweka miadi.',
        timestamp: new Date(),
        suggestions: ['🩺 Daktari']
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Nisaidie kupata daktari, hospitali, dawa, au maabara.',
      timestamp: new Date(),
      suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🔬 Maabara']
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // If in doctor chat mode, send to doctor
    if (chatMode === 'doctor') {
      await sendDoctorMessage();
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await processMessage(input);
      setMessages(prev => [...prev, response]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!user) {
      toast({ title: 'Ingia kwanza', description: 'Unahitaji kuingia ili kuweka miadi.', variant: 'destructive' });
      return;
    }
    if (!bookingDoctor || !bookingDate || !bookingTime) {
      toast({ title: 'Jaza taarifa zote', description: 'Chagua tarehe na saa.', variant: 'destructive' });
      return;
    }

    const doctorId = bookingDoctor.user_id || bookingDoctor.profiles?.id;
    const appointmentDate = new Date(bookingDate);
    const [hours, minutes] = bookingTime.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Double-check for conflicts
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', appointmentDate.toISOString())
      .in('status', ['scheduled', 'confirmed', 'pending']);

    if (conflicts && conflicts.length > 0) {
      // Find alternative times
      const booked = await checkBookedTimes(doctorId, bookingDate);
      const dayOfWeek = bookingDate.getDay();
      const alternatives = generateTimeSlots(doctorTimetable, dayOfWeek, booked).slice(0, 3);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: `⚠️ Saa ${bookingTime} tayari imechukuliwa. Chagua wakati mwingine:`,
        timestamp: new Date(),
        data: { type: 'alternative-times', items: alternatives.map(t => ({ time: t })), doctorId }
      }]);
      
      toast({ title: 'Wakati umechukuliwa', description: 'Chagua wakati mwingine.', variant: 'destructive' });
      return;
    }

    // Create appointment as pending (request)
    const { error } = await supabase.from('appointments').insert({
      patient_id: user.id,
      doctor_id: doctorId,
      appointment_date: appointmentDate.toISOString(),
      symptoms: bookingSymptoms,
      status: 'pending', // Request status - doctor must accept
      consultation_type: 'video'
    });

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
      return;
    }

    // Create notification for doctor
    await supabase.from('notifications').insert({
      user_id: doctorId,
      title: 'Ombi la Miadi',
      message: `Mgonjwa ${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''} anaomba miadi tarehe ${format(appointmentDate, 'dd/MM/yyyy')} saa ${bookingTime}`,
      type: 'appointment_request'
    });

    toast({ title: 'Ombi limetumwa!', description: 'Daktari atakubali au kukataa ombi lako.' });
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'bot',
      content: `✅ Ombi la miadi limetumwa kwa Dr. ${bookingDoctor.profiles?.first_name} ${bookingDoctor.profiles?.last_name}.\n📅 Tarehe: ${format(appointmentDate, 'dd/MM/yyyy')}\n🕐 Saa: ${bookingTime}\n\nUtapata arifa daktari akikubali au kukataa.`,
      timestamp: new Date()
    }]);

    setBookingDoctor(null);
    setBookingDate(undefined);
    setBookingTime('');
    setBookingSymptoms('');
    setSelectedDoctor(null);
  };

  const openDoctorDetail = async (doctor: any) => {
    setSelectedDoctor(doctor);
    await fetchDoctorTimetable(doctor.user_id || doctor.profiles?.id);
  };

  const startBooking = (doctor: any) => {
    setBookingDoctor(doctor);
    setSelectedDoctor(null);
  };

  const startDoctorChat = async (doctor: any) => {
    if (!user) {
      toast({ title: 'Ingia kwanza', variant: 'destructive' });
      return;
    }

    const doctorId = doctor.user_id || doctor.profiles?.id;

    // Find existing appointment or create one for chat
    let { data: existingAppt } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', user.id)
      .eq('doctor_id', doctorId)
      .in('status', ['scheduled', 'confirmed', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let apptId = existingAppt?.id;

    if (!apptId) {
      const { data: newAppt, error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: doctorId,
        appointment_date: new Date().toISOString(),
        status: 'scheduled',
        consultation_type: 'chat'
      }).select().single();

      if (error) {
        toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
        return;
      }
      apptId = newAppt?.id;
    }

    // Fetch existing messages
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('appointment_id', apptId)
      .order('created_at', { ascending: true });

    setDoctorMessages(msgs || []);
    setChatDoctor(doctor);
    setChatAppointmentId(apptId || null);
    setChatMode('doctor');
    setSelectedDoctor(null);
  };

  const sendDoctorMessage = async () => {
    if (!input.trim() || !chatAppointmentId || !user) return;

    const { error } = await supabase.from('chat_messages').insert({
      appointment_id: chatAppointmentId,
      sender_id: user.id,
      message: input,
      message_type: 'text'
    });

    if (!error) {
      setDoctorMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_id: user.id,
        message: input,
        created_at: new Date().toISOString()
      }]);
    }

    setInput('');
  };

  const exitDoctorChat = () => {
    setChatMode('bot');
    setChatDoctor(null);
    setChatAppointmentId(null);
    setDoctorMessages([]);
  };

  // Render doctor card
  const renderDoctorCard = (doc: any) => (
    <Card 
      key={doc.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => openDoctorDetail(doc)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={doc.profiles?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}</p>
          <p className="text-xs text-muted-foreground">{doc.specialties?.name || doc.hospital_name || 'Daktari Mkuu'}</p>
          <div className="flex items-center gap-2 mt-1">
            {doc.rating > 0 && (
              <span className="text-xs flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {doc.rating.toFixed(1)}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {doc.consultation_fee ? `Tsh ${Number(doc.consultation_fee).toLocaleString()}` : 'Bure'}
            </Badge>
            {doc.is_available && <Badge className="text-[10px] bg-green-500">Online</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render hospital card
  const renderHospitalCard = (h: any) => (
    <Card 
      key={h.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => setSelectedHospital(h)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{h.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{h.address}
          </p>
          {h.rating > 0 && (
            <span className="text-xs flex items-center gap-0.5 mt-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {h.rating.toFixed(1)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render pharmacy card
  const renderPharmacyCard = (p: any) => (
    <Card 
      key={p.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => setSelectedPharmacy(p)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Pill className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{p.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{p.address}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Render lab card
  const renderLabCard = (l: any) => (
    <Card 
      key={l.id} 
      className="cursor-pointer hover:shadow-md transition-all border-border/50 bg-card/80"
      onClick={() => setSelectedLab(l)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <TestTube className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{l.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{l.address}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Render data
  const renderData = (data: any) => {
    if (!data) return null;
    const { type, items } = data;

    if (type === 'doctors') {
      return <div className="space-y-2 mt-3">{items.map(renderDoctorCard)}</div>;
    }
    if (type === 'hospitals') {
      return <div className="space-y-2 mt-3">{items.map(renderHospitalCard)}</div>;
    }
    if (type === 'pharmacies') {
      return <div className="space-y-2 mt-3">{items.map(renderPharmacyCard)}</div>;
    }
    if (type === 'labs') {
      return <div className="space-y-2 mt-3">{items.map(renderLabCard)}</div>;
    }
    if (type === 'appointments') {
      return (
        <div className="space-y-2 mt-3">
          {items.map((apt: any) => (
            <Card key={apt.id} className="border-border/50 bg-card/80">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(apt.appointment_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <Badge variant={apt.status === 'confirmed' ? 'default' : apt.status === 'pending' ? 'secondary' : 'outline'}>
                  {apt.status === 'pending' ? 'Inasubiri' : apt.status === 'confirmed' ? 'Imekubaliwa' : apt.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (type === 'alternative-times') {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          {items.map((item: any) => (
            <Button
              key={item.time}
              variant="outline"
              size="sm"
              onClick={() => setBookingTime(item.time)}
            >
              {item.time}
            </Button>
          ))}
        </div>
      );
    }
    return null;
  };

  // Doctor chat mode UI
  if (chatMode === 'doctor' && chatDoctor) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Doctor chat header */}
        <div className="flex items-center gap-3 p-4 border-b bg-card/50">
          <Button variant="ghost" size="icon" onClick={exitDoctorChat}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={chatDoctor.profiles?.avatar_url} />
            <AvatarFallback><Stethoscope className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">Dr. {chatDoctor.profiles?.first_name} {chatDoctor.profiles?.last_name}</p>
            <p className="text-xs text-muted-foreground">{chatDoctor.specialties?.name || 'Daktari'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => toast({ title: 'Simu', description: 'Huduma ya simu inakuja...' })}>
              <PhoneCall className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => toast({ title: 'Video', description: 'Huduma ya video inakuja...' })}>
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {doctorMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.sender_id === user?.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-card/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Andika ujumbe..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main chatbot UI
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card/50">
        <Avatar className="h-10 w-10 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">TeleMed Assistant</p>
          <p className="text-xs text-muted-foreground">Huduma 24/7</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.type === 'bot' ? 'flex gap-2' : ''}`}>
                {msg.type === 'bot' && (
                  <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    msg.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                  
                  {renderData(msg.data)}
                  
                  {msg.suggestions && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.suggestions.map((s, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs"
                          onClick={() => {
                            setInput(s.replace(/[^\w\s]/gi, ''));
                            setTimeout(() => handleSend(), 100);
                          }}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card/50">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <Button
              variant={isListening ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleListening}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Andika ujumbe au bofya kitufe..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🔬 Maabara'].map((action) => (
              <Button
                key={action}
                variant="secondary"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  setInput(action.split(' ')[1]);
                  setTimeout(() => handleSend(), 100);
                }}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Doctor Detail Modal */}
      <Dialog open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={selectedDoctor?.profiles?.avatar_url} />
                <AvatarFallback className="bg-primary/10">
                  <Stethoscope className="h-8 w-8 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>Dr. {selectedDoctor?.profiles?.first_name} {selectedDoctor?.profiles?.last_name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedDoctor?.specialties?.name || 'Daktari Mkuu'}</p>
                {selectedDoctor?.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm">{selectedDoctor.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({selectedDoctor.total_reviews} reviews)</span>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Info */}
            <div className="space-y-2">
              {selectedDoctor?.profiles?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selectedDoctor.profiles.phone}
                </div>
              )}
              {selectedDoctor?.profiles?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {selectedDoctor.profiles.email}
                </div>
              )}
              {selectedDoctor?.hospital_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {selectedDoctor.hospital_name}
                </div>
              )}
              {selectedDoctor?.experience_years > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Uzoefu: Miaka {selectedDoctor.experience_years}
                </div>
              )}
              {selectedDoctor?.consultation_fee && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Ada: Tsh {Number(selectedDoctor.consultation_fee).toLocaleString()}
                </div>
              )}
            </div>

            {/* Bio */}
            {selectedDoctor?.bio && (
              <div>
                <h4 className="text-sm font-medium mb-1">Maelezo</h4>
                <p className="text-sm text-muted-foreground">{selectedDoctor.bio}</p>
              </div>
            )}

            {/* Timetable */}
            {doctorTimetable.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Ratiba</h4>
                <div className="space-y-1">
                  {doctorTimetable.map((t, i) => (
                    <div key={i} className="flex justify-between text-sm bg-muted/50 px-3 py-1.5 rounded">
                      <span>{DAYS[t.day_of_week]}</span>
                      <span className="text-muted-foreground">{t.start_time} - {t.end_time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => startBooking(selectedDoctor)}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Weka Miadi
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => startDoctorChat(selectedDoctor)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Wasiliana
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={!!bookingDoctor} onOpenChange={() => setBookingDoctor(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Weka Miadi</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar>
                <AvatarImage src={bookingDoctor?.profiles?.avatar_url} />
                <AvatarFallback><Stethoscope className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Dr. {bookingDoctor?.profiles?.first_name} {bookingDoctor?.profiles?.last_name}</p>
                <p className="text-xs text-muted-foreground">{bookingDoctor?.specialties?.name || 'Daktari'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Chagua Tarehe</label>
              <Calendar
                mode="single"
                selected={bookingDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            {bookingDate && availableTimes.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Chagua Saa</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableTimes.map((time) => (
                    <Button
                      key={time}
                      variant={bookingTime === time ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingTime(time)}
                      disabled={bookedTimes.includes(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {bookingDate && availableTimes.length === 0 && (
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-destructive">Daktari hapatikani siku hii. Chagua siku nyingine.</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Dalili / Maelezo (hiari)</label>
              <Textarea
                value={bookingSymptoms}
                onChange={(e) => setBookingSymptoms(e.target.value)}
                placeholder="Eleza dalili zako kwa ufupi..."
                rows={3}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleBookAppointment}
              disabled={!bookingDate || !bookingTime}
            >
              Tuma Ombi la Miadi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hospital Detail Modal */}
      <Dialog open={!!selectedHospital} onOpenChange={() => setSelectedHospital(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle>{selectedHospital?.name}</DialogTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedHospital?.address}
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedHospital?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {selectedHospital.phone}
              </div>
            )}
            {selectedHospital?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {selectedHospital.email}
              </div>
            )}
            {selectedHospital?.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {selectedHospital.website}
              </div>
            )}
            {selectedHospital?.description && (
              <p className="text-sm text-muted-foreground">{selectedHospital.description}</p>
            )}
            {selectedHospital?.services?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Huduma</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedHospital.services.map((s: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pharmacy Detail Modal */}
      <Dialog open={!!selectedPharmacy} onOpenChange={() => setSelectedPharmacy(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Pill className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle>{selectedPharmacy?.name}</DialogTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedPharmacy?.address}
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedPharmacy?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {selectedPharmacy.phone}
              </div>
            )}
            {selectedPharmacy?.description && (
              <p className="text-sm text-muted-foreground">{selectedPharmacy.description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lab Detail Modal */}
      <Dialog open={!!selectedLab} onOpenChange={() => setSelectedLab(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TestTube className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <DialogTitle>{selectedLab?.name}</DialogTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedLab?.address}
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedLab?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {selectedLab.phone}
              </div>
            )}
            {selectedLab?.description && (
              <p className="text-sm text-muted-foreground">{selectedLab.description}</p>
            )}
            {selectedLab?.test_types?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Vipimo</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedLab.test_types.map((t: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {typeof t === 'string' ? t : t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
