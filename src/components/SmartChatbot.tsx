import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { 
  Bot, Send, Mic, MapPin, Phone, Clock, Stethoscope, Calendar as CalendarIcon,
  Pill, AlertCircle, Check, CheckCheck, X, Star, Building2, TestTube,
  MessageCircle, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  data?: {
    type: 'doctors' | 'hospitals' | 'pharmacies' | 'labs' | 'quick-replies' | 'booking-form' | 'doctor-chat';
    items?: any[];
    doctor?: any;
    appointmentId?: string;
  };
}

interface SmartChatbotProps {
  onBookAppointment?: (doctorId: string) => void;
  onViewHospital?: (hospitalId: string) => void;
  onViewPharmacy?: (pharmacyId: string) => void;
}

export function SmartChatbot({ onBookAppointment, onViewHospital, onViewPharmacy }: SmartChatbotProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Habari! Ninaweza kukusaidia nini leo?",
      type: 'bot',
      timestamp: new Date(),
      data: {
        type: 'quick-replies',
        items: [
          { id: 'find-doctor', label: 'Tafuta Daktari', icon: 'stethoscope' },
          { id: 'find-specialty', label: 'Tafuta kwa Utaalamu', icon: 'star' },
          { id: 'book-appointment', label: 'Weka Miadi', icon: 'calendar' },
          { id: 'find-pharmacy', label: 'Maduka ya Dawa', icon: 'pill' },
          { id: 'emergency', label: 'Dharura', icon: 'alert' }
        ]
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Detail modals
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [selectedLab, setSelectedLab] = useState<any>(null);
  
  // Booking state
  const [bookingDoctor, setBookingDoctor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState('');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  
  // Chat mode with doctor
  const [chatMode, setChatMode] = useState<'bot' | 'doctor'>('bot');
  const [chatDoctor, setChatDoctor] = useState<any>(null);
  const [chatAppointmentId, setChatAppointmentId] = useState<string | null>(null);
  const [doctorMessages, setDoctorMessages] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, doctorMessages]);

  // Subscribe to doctor chat messages
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
        setDoctorMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatAppointmentId]);

  const handleQuickReply = async (action: string) => {
    const actionMessages: Record<string, string> = {
      'find-doctor': 'Nataka kutafuta daktari',
      'find-specialty': 'Nionyeshe utaalamu wa madaktari',
      'book-appointment': 'Nataka kuweka miadi',
      'find-pharmacy': 'Nionyeshe maduka ya dawa',
      'emergency': 'Nina dharura ya afya'
    };
    setInput(actionMessages[action] || '');
    setTimeout(() => handleSendMessage(), 100);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.start();
      setIsRecording(true);
      
      mediaRecorder.current.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };
    } catch (error) {
      toast({ title: "Hitilafu", description: "Haikuweza kupata microphone", variant: "destructive" });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const searchDoctors = async (query: string, specialtyId?: string) => {
    let queryBuilder = supabase
      .from('doctor_profiles')
      .select(`
        *,
        profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url, phone, email),
        specialties(id, name)
      `)
      .eq('is_available', true);
    
    if (specialtyId) {
      queryBuilder = queryBuilder.eq('specialty_id', specialtyId);
    }
    
    const { data } = await queryBuilder.limit(10);
    return data || [];
  };

  const searchSpecialties = async () => {
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .order('name');
    return data || [];
  };

  const searchDoctorsBySpecialtyName = async (specialtyName: string) => {
    // First find matching specialties
    const { data: specialties } = await supabase
      .from('specialties')
      .select('id, name')
      .ilike('name', `%${specialtyName}%`);
    
    if (specialties && specialties.length > 0) {
      const specialtyIds = specialties.map(s => s.id);
      const { data } = await supabase
        .from('doctor_profiles')
        .select(`
          *,
          profiles!doctor_profiles_user_id_fkey(id, first_name, last_name, avatar_url, phone, email),
          specialties(id, name)
        `)
        .in('specialty_id', specialtyIds)
        .eq('is_available', true)
        .limit(10);
      return { doctors: data || [], specialtyName: specialties[0]?.name };
    }
    return { doctors: [], specialtyName: null };
  };

  const searchHospitals = async () => {
    const { data } = await supabase
      .from('hospitals')
      .select('*')
      .eq('is_verified', true)
      .limit(5);
    return data || [];
  };

  const searchPharmacies = async () => {
    const { data } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_verified', true)
      .limit(5);
    return data || [];
  };

  const searchLabs = async () => {
    const { data } = await supabase
      .from('laboratories')
      .select('*')
      .eq('is_verified', true)
      .limit(5);
    return data || [];
  };

  const processMessage = async (message: string): Promise<Message> => {
    const lower = message.toLowerCase();

    // Specialty search - check for specialty keywords
    const specialtyKeywords = [
      'moyo', 'heart', 'cardio', // Cardiology
      'watoto', 'mtoto', 'pediatric', 'child', // Pediatrics
      'ngozi', 'skin', 'derma', // Dermatology
      'mifupa', 'bone', 'ortho', // Orthopedics
      'macho', 'eye', 'ophthal', // Ophthalmology
      'masikio', 'ear', 'ent', // ENT
      'akili', 'mental', 'psych', // Psychiatry
      'ujauzito', 'mimba', 'gynec', 'obstet', // OB/GYN
      'meno', 'teeth', 'dental', // Dentistry
      'utaalamu', 'specialty', 'specializ' // General specialty query
    ];
    
    const hasSpecialtyQuery = specialtyKeywords.some(kw => lower.includes(kw));
    
    // If user asks about specialties
    if (lower.includes('utaalamu') || lower.includes('specialty') || lower.includes('nionyeshe utaalamu')) {
      const specialties = await searchSpecialties();
      if (specialties.length > 0) {
        return {
          id: Date.now().toString(),
          content: `Tunawao madaktari wa utaalamu mbalimbali. Chagua utaalamu unaouhitaji:`,
          type: 'bot',
          timestamp: new Date(),
          data: { 
            type: 'quick-replies', 
            items: specialties.slice(0, 8).map(s => ({
              id: `specialty-${s.id}`,
              label: s.name,
              icon: 'stethoscope'
            }))
          }
        };
      }
    }

    // Check if user selected a specialty from quick replies
    if (lower.startsWith('specialty-')) {
      const specialtyId = lower.replace('specialty-', '');
      const doctors = await searchDoctors('', specialtyId);
      if (doctors.length > 0) {
        const specialtyName = doctors[0]?.specialties?.name || 'Utaalamu';
        return {
          id: Date.now().toString(),
          content: `Madaktari wa ${specialtyName} wanaopatikana (${doctors.length}):`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'doctors', items: doctors }
        };
      }
      return { id: Date.now().toString(), content: 'Hakuna madaktari wa utaalamu huu wanaopatikana sasa.', type: 'bot', timestamp: new Date() };
    }

    // Search by specialty name in message
    if (hasSpecialtyQuery && !lower.includes('daktari wa jumla')) {
      // Try to find doctors by specialty keywords
      for (const keyword of specialtyKeywords.slice(0, -3)) { // exclude generic keywords
        if (lower.includes(keyword)) {
          const result = await searchDoctorsBySpecialtyName(keyword);
          if (result.doctors.length > 0) {
            return {
              id: Date.now().toString(),
              content: `Madaktari wa ${result.specialtyName || 'utaalamu huu'} (${result.doctors.length}):`,
              type: 'bot',
              timestamp: new Date(),
              data: { type: 'doctors', items: result.doctors }
            };
          }
        }
      }
    }

    // Doctor search
    if (lower.includes('daktari') || lower.includes('doctor') || lower.includes('tafuta')) {
      const doctors = await searchDoctors(message);
      if (doctors.length > 0) {
        return {
          id: Date.now().toString(),
          content: `Nimepata madaktari ${doctors.length}. Bofya kuona maelezo zaidi:`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'doctors', items: doctors }
        };
      }
      return { id: Date.now().toString(), content: 'Hakuna madaktari wanaopatikana sasa.', type: 'bot', timestamp: new Date() };
    }

    // Hospital search
    if (lower.includes('hospitali') || lower.includes('hospital')) {
      const hospitals = await searchHospitals();
      if (hospitals.length > 0) {
        return {
          id: Date.now().toString(),
          content: `Nimepata hospitali ${hospitals.length}:`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'hospitals', items: hospitals }
        };
      }
    }

    // Pharmacy search
    if (lower.includes('dawa') || lower.includes('pharmacy') || lower.includes('duka')) {
      const pharmacies = await searchPharmacies();
      if (pharmacies.length > 0) {
        return {
          id: Date.now().toString(),
          content: `Maduka ya dawa ${pharmacies.length}:`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'pharmacies', items: pharmacies }
        };
      }
    }

    // Lab search
    if (lower.includes('maabara') || lower.includes('lab') || lower.includes('test')) {
      const labs = await searchLabs();
      if (labs.length > 0) {
        return {
          id: Date.now().toString(),
          content: `Maabara ${labs.length}:`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'labs', items: labs }
        };
      }
    }

    // Booking request
    if (lower.includes('miadi') || lower.includes('appointment') || lower.includes('book')) {
      const doctors = await searchDoctors('');
      return {
        id: Date.now().toString(),
        content: 'Chagua daktari unayemtaka kuweka miadi:',
        type: 'bot',
        timestamp: new Date(),
        data: { type: 'doctors', items: doctors }
      };
    }

    // Emergency
    if (lower.includes('dharura') || lower.includes('emergency')) {
      return {
        id: Date.now().toString(),
        content: '🚨 DHARURA! Piga simu 114 au nenda hospitali ya karibu mara moja!',
        type: 'bot',
        timestamp: new Date()
      };
    }

    return {
      id: Date.now().toString(),
      content: 'Samahani, sikuelewa. Unaweza kuuliza kuhusu madaktari, hospitali, maduka ya dawa, au maabara.',
      type: 'bot',
      timestamp: new Date()
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const botResponse = await processMessage(input);
    setMessages(prev => [...prev, botResponse]);
    setIsLoading(false);
  };

  const handleBookAppointment = async () => {
    if (!user) {
      toast({ title: 'Tafadhali ingia kwanza', variant: 'destructive' });
      return;
    }
    if (!bookingDoctor || !bookingDate || !bookingTime) {
      toast({ title: 'Jaza taarifa zote', variant: 'destructive' });
      return;
    }

    const appointmentDate = new Date(bookingDate);
    const [hours, minutes] = bookingTime.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes));

    const { data, error } = await supabase.from('appointments').insert({
      patient_id: user.id,
      doctor_id: bookingDoctor.user_id,
      appointment_date: appointmentDate.toISOString(),
      symptoms: bookingSymptoms,
      status: 'scheduled',
      consultation_type: 'video'
    }).select().single();

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Miadi imewekwa!', description: `Tarehe: ${format(appointmentDate, 'dd/MM/yyyy HH:mm')}` });
    setBookingDoctor(null);
    setBookingDate(undefined);
    setBookingTime('');
    setBookingSymptoms('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: `✅ Miadi imewekwa na Dr. ${bookingDoctor.profiles?.first_name} ${bookingDoctor.profiles?.last_name} tarehe ${format(appointmentDate, 'dd/MM/yyyy')} saa ${bookingTime}`,
      type: 'bot',
      timestamp: new Date()
    }]);
  };

  const startDoctorChat = async (doctor: any, appointmentId?: string) => {
    if (!user) {
      toast({ title: 'Tafadhali ingia kwanza', variant: 'destructive' });
      return;
    }

    // Find or create appointment for chat
    let apptId = appointmentId;
    if (!apptId) {
      const { data: existingAppt } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', user.id)
        .eq('doctor_id', doctor.user_id)
        .eq('status', 'scheduled')
        .single();

      if (existingAppt) {
        apptId = existingAppt.id;
      } else {
        const { data: newAppt, error } = await supabase.from('appointments').insert({
          patient_id: user.id,
          doctor_id: doctor.user_id,
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
  };

  const sendDoctorMessage = async () => {
    if (!input.trim() || !chatAppointmentId || !user) return;

    await supabase.from('chat_messages').insert({
      appointment_id: chatAppointmentId,
      sender_id: user.id,
      message: input,
      message_type: 'text'
    });

    setInput('');
  };

  const exitDoctorChat = () => {
    setChatMode('bot');
    setChatDoctor(null);
    setChatAppointmentId(null);
    setDoctorMessages([]);
  };

  const renderDoctorCard = (doctor: any, showActions = true) => (
    <Card 
      key={doctor.id} 
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => setSelectedDoctor(doctor)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={doctor.profiles?.avatar_url} />
            <AvatarFallback className="bg-primary/10">
              <Stethoscope className="h-5 w-5 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}</h4>
            <p className="text-xs text-muted-foreground">{doctor.specialties?.name || doctor.bio?.slice(0, 30)}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">
                {doctor.consultation_fee ? `Tsh ${doctor.consultation_fee.toLocaleString()}` : 'Bure'}
              </Badge>
              {doctor.is_available && <Badge className="text-[10px] bg-green-500">Online</Badge>}
              {doctor.rating > 0 && (
                <span className="text-[10px] flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {doctor.rating.toFixed(1)}
                </span>
              )}
            </div>
            {showActions && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); setBookingDoctor(doctor); }}>
                  <CalendarIcon className="h-3 w-3 mr-1" /> Miadi
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); startDoctorChat(doctor); }}>
                  <MessageCircle className="h-3 w-3 mr-1" /> Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderHospitalCard = (hospital: any) => (
    <Card 
      key={hospital.id}
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => setSelectedHospital(hospital)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{hospital.name}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {hospital.address}
            </p>
            {hospital.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {hospital.phone}
              </p>
            )}
            {hospital.rating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{hospital.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPharmacyCard = (pharmacy: any) => (
    <Card 
      key={pharmacy.id}
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => setSelectedPharmacy(pharmacy)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
            <Pill className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{pharmacy.name}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {pharmacy.address}
            </p>
            {pharmacy.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {pharmacy.phone}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLabCard = (lab: any) => (
    <Card 
      key={lab.id}
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => setSelectedLab(lab)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <TestTube className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{lab.name}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {lab.address}
            </p>
            {lab.test_types && lab.test_types.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {lab.test_types.slice(0, 3).map((t: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMessageData = (data: Message['data']) => {
    if (!data) return null;

    if (data.type === 'quick-replies' && data.items) {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {data.items.map((item: any) => (
            <Button
              key={item.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickReply(item.id)}
              className="rounded-full text-xs"
            >
              {item.icon === 'stethoscope' && <Stethoscope className="h-3 w-3 mr-1" />}
              {item.icon === 'calendar' && <CalendarIcon className="h-3 w-3 mr-1" />}
              {item.icon === 'pill' && <Pill className="h-3 w-3 mr-1" />}
              {item.icon === 'alert' && <AlertCircle className="h-3 w-3 mr-1" />}
              {item.label}
            </Button>
          ))}
        </div>
      );
    }

    if (data.type === 'doctors' && data.items) {
      return <div className="space-y-2 mt-2">{data.items.map(d => renderDoctorCard(d))}</div>;
    }

    if (data.type === 'hospitals' && data.items) {
      return <div className="space-y-2 mt-2">{data.items.map(h => renderHospitalCard(h))}</div>;
    }

    if (data.type === 'pharmacies' && data.items) {
      return <div className="space-y-2 mt-2">{data.items.map(p => renderPharmacyCard(p))}</div>;
    }

    if (data.type === 'labs' && data.items) {
      return <div className="space-y-2 mt-2">{data.items.map(l => renderLabCard(l))}</div>;
    }

    return null;
  };

  // Doctor Chat Mode
  if (chatMode === 'doctor' && chatDoctor) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-3 border-b bg-card">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exitDoctorChat}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={chatDoctor.profiles?.avatar_url} />
            <AvatarFallback><Stethoscope className="h-4 w-4" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Dr. {chatDoctor.profiles?.first_name}</h3>
            <p className="text-[10px] text-muted-foreground">
              {chatDoctor.is_available ? '🟢 Online' : '⚫ Offline'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {doctorMessages.map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                msg.sender_id === user?.id 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-muted rounded-bl-sm'
              }`}>
                {msg.message}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] opacity-70">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                  {msg.sender_id === user?.id && (
                    msg.is_read ? <CheckCheck className="h-3 w-3 text-blue-400" /> : <Check className="h-3 w-3 opacity-70" />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-card">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Andika ujumbe..."
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && sendDoctorMessage()}
            />
            <Button size="icon" onClick={sendDoctorMessage} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Chatbot UI
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'bot' && (
              <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className={`max-w-[85%]`}>
              <div className={`px-3 py-2 rounded-2xl text-sm ${
                msg.type === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {renderMessageData(msg.data)}
              <div className="flex items-center gap-1 mt-0.5 px-1">
                <span className="text-[10px] text-muted-foreground">
                  {format(msg.timestamp, 'HH:mm')}
                </span>
                {msg.type === 'user' && msg.status && (
                  msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-blue-500" /> : <Check className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600">
                <Bot className="h-4 w-4 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted px-4 py-2 rounded-2xl">
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

      {/* Input */}
      <div className="p-3 border-t bg-card">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Andika ujumbe..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          />
          <Button 
            size="icon" 
            variant="ghost"
            className={isRecording ? 'text-red-500' : ''}
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={handleSendMessage} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Doctor Detail Modal */}
      <Dialog open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedDoctor?.profiles?.avatar_url} />
                <AvatarFallback><Stethoscope className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <p>Dr. {selectedDoctor?.profiles?.first_name} {selectedDoctor?.profiles?.last_name}</p>
                <p className="text-xs font-normal text-muted-foreground">{selectedDoctor?.specialties?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Ada</p>
                <p className="font-semibold">Tsh {selectedDoctor?.consultation_fee?.toLocaleString() || '0'}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Uzoefu</p>
                <p className="font-semibold">{selectedDoctor?.experience_years || 0} miaka</p>
              </div>
            </div>
            {selectedDoctor?.bio && <p className="text-sm text-muted-foreground">{selectedDoctor.bio}</p>}
            {selectedDoctor?.hospital_name && (
              <p className="text-sm flex items-center gap-1">
                <Building2 className="h-4 w-4" /> {selectedDoctor.hospital_name}
              </p>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => { setSelectedDoctor(null); setBookingDoctor(selectedDoctor); }}>
                <CalendarIcon className="h-4 w-4 mr-1" /> Weka Miadi
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setSelectedDoctor(null); startDoctorChat(selectedDoctor); }}>
                <MessageCircle className="h-4 w-4 mr-1" /> Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hospital Detail Modal */}
      <Dialog open={!!selectedHospital} onOpenChange={() => setSelectedHospital(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              {selectedHospital?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {selectedHospital?.address}
            </p>
            {selectedHospital?.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {selectedHospital.phone}
              </p>
            )}
            {selectedHospital?.description && <p className="text-muted-foreground">{selectedHospital.description}</p>}
            {selectedHospital?.services && selectedHospital.services.length > 0 && (
              <div>
                <p className="font-medium mb-1">Huduma:</p>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Pill className="h-5 w-5 text-green-600" />
              </div>
              {selectedPharmacy?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {selectedPharmacy?.address}
            </p>
            {selectedPharmacy?.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {selectedPharmacy.phone}
              </p>
            )}
            {selectedPharmacy?.description && <p className="text-muted-foreground">{selectedPharmacy.description}</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lab Detail Modal */}
      <Dialog open={!!selectedLab} onOpenChange={() => setSelectedLab(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TestTube className="h-5 w-5 text-purple-600" />
              </div>
              {selectedLab?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {selectedLab?.address}
            </p>
            {selectedLab?.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {selectedLab.phone}
              </p>
            )}
            {selectedLab?.test_types && selectedLab.test_types.length > 0 && (
              <div>
                <p className="font-medium mb-1">Vipimo:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedLab.test_types.map((t: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={!!bookingDoctor} onOpenChange={() => setBookingDoctor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Weka Miadi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={bookingDoctor?.profiles?.avatar_url} />
                <AvatarFallback><Stethoscope className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">Dr. {bookingDoctor?.profiles?.first_name} {bookingDoctor?.profiles?.last_name}</p>
                <p className="text-xs text-muted-foreground">Ada: Tsh {bookingDoctor?.consultation_fee?.toLocaleString() || '0'}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Chagua Tarehe</label>
              <Calendar
                mode="single"
                selected={bookingDate}
                onSelect={setBookingDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Chagua Saa</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                  <Button
                    key={time}
                    variant={bookingTime === time ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setBookingTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Dalili (Hiari)</label>
              <Textarea
                value={bookingSymptoms}
                onChange={(e) => setBookingSymptoms(e.target.value)}
                placeholder="Elezea dalili zako..."
                className="mt-1"
              />
            </div>

            <Button className="w-full" onClick={handleBookAppointment} disabled={!bookingDate || !bookingTime}>
              Thibitisha Miadi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
