import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, Mic, MicOff, Bot, Stethoscope, Building, Pill, TestTube, MapPin, Star, 
  Calendar as CalendarIcon, Clock, Phone, X, MessageCircle, ArrowLeft, Check, CheckCheck,
  User, Mail, FileText, Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNav } from '@/contexts/NavContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: {
    type: 'doctors' | 'hospitals' | 'pharmacies' | 'labs' | 'appointments';
    items: any[];
  };
}

export function PatientDashboard() {
  const { user } = useAuth();
  const { setHideNav } = useNav();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: `Habari ${user?.user_metadata?.first_name || 'wewe'}! 👋\nNitakusaidia kupata huduma za afya. Bofya kitufe au andika unachotaka.`,
      timestamp: new Date(),
      suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🔬 Maabara']
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
  
  // Booking state
  const [bookingDoctor, setBookingDoctor] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState<Date | undefined>();
  const [bookingTime, setBookingTime] = useState('');
  const [bookingSymptoms, setBookingSymptoms] = useState('');
  
  // Chat with doctor state
  const [chatMode, setChatMode] = useState<'bot' | 'doctor'>('bot');
  const [chatDoctor, setChatDoctor] = useState<any>(null);
  const [chatAppointmentId, setChatAppointmentId] = useState<string | null>(null);
  const [doctorMessages, setDoctorMessages] = useState<any[]>([]);
  const [doctorTyping, setDoctorTyping] = useState(false);

  // Hide nav when in doctor chat mode
  useEffect(() => {
    setHideNav(chatMode === 'doctor');
    return () => setHideNav(false);
  }, [chatMode, setHideNav]);

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

  // Subscribe to doctor messages
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

  const toggleListening = () => {
    if (recognition.current) {
      if (isListening) recognition.current.stop();
      else recognition.current.start();
      setIsListening(!isListening);
    }
  };

  const processMessage = async (message: string): Promise<Message> => {
    const lower = message.toLowerCase();
    
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
        content: data?.length ? `Madaktari ${data.length} wanapatikana. Bofya kuona maelezo:` : 'Hakuna daktari sasa.',
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

    // Appointments
    if (lower.includes('miadi') || lower.includes('appointment')) {
      const { data } = await supabase
        .from('appointments')
        .select('*, profiles!appointments_doctor_id_fkey(first_name, last_name)')
        .eq('patient_id', user?.id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(5);
      
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
        content: 'Huna miadi. Tafuta daktari kwanza.',
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
      toast({ title: 'Ingia kwanza', variant: 'destructive' });
      return;
    }
    if (!bookingDoctor || !bookingDate || !bookingTime) {
      toast({ title: 'Jaza taarifa zote', variant: 'destructive' });
      return;
    }

    const appointmentDate = new Date(bookingDate);
    const [hours, minutes] = bookingTime.split(':');
    appointmentDate.setHours(parseInt(hours), parseInt(minutes));

    const { error } = await supabase.from('appointments').insert({
      patient_id: user.id,
      doctor_id: bookingDoctor.profiles?.id || bookingDoctor.user_id,
      appointment_date: appointmentDate.toISOString(),
      symptoms: bookingSymptoms,
      status: 'scheduled',
      consultation_type: 'video'
    });

    if (error) {
      toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Miadi imewekwa!', description: `${format(appointmentDate, 'dd/MM/yyyy HH:mm')}` });
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'bot',
      content: `✅ Miadi na Dr. ${bookingDoctor.profiles?.first_name} ${bookingDoctor.profiles?.last_name} - ${format(appointmentDate, 'dd/MM/yyyy')} saa ${bookingTime}`,
      timestamp: new Date()
    }]);

    setBookingDoctor(null);
    setBookingDate(undefined);
    setBookingTime('');
    setBookingSymptoms('');
  };

  const startDoctorChat = async (doctor: any) => {
    if (!user) {
      toast({ title: 'Ingia kwanza', variant: 'destructive' });
      return;
    }

    const doctorId = doctor.profiles?.id || doctor.user_id;

    // Find existing appointment or create one
    let { data: existingAppt } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', user.id)
      .eq('doctor_id', doctorId)
      .in('status', ['scheduled', 'confirmed'])
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

  // Render clickable doctor card
  const renderDoctorCard = (doc: any) => (
    <Card 
      key={doc.id} 
      className="cursor-pointer hover:shadow-md transition-all border-0 bg-card/80"
      onClick={() => setSelectedDoctor(doc)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={doc.profiles?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Dr. {doc.profiles?.first_name} {doc.profiles?.last_name}</p>
          <p className="text-xs text-muted-foreground">{doc.specialties?.name || doc.hospital_name || 'Daktari'}</p>
          <div className="flex items-center gap-2 mt-1">
            {doc.rating > 0 && (
              <span className="text-xs flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {doc.rating.toFixed(1)}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {doc.consultation_fee ? `Tsh ${doc.consultation_fee.toLocaleString()}` : 'Bure'}
            </Badge>
            {doc.is_available && <Badge className="text-[10px] bg-green-500">Online</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render clickable hospital card
  const renderHospitalCard = (h: any) => (
    <Card 
      key={h.id} 
      className="cursor-pointer hover:shadow-md transition-all border-0 bg-card/80"
      onClick={() => setSelectedHospital(h)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <Building className="h-6 w-6 text-blue-600" />
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

  // Render clickable pharmacy card  
  const renderPharmacyCard = (p: any) => (
    <Card 
      key={p.id} 
      className="cursor-pointer hover:shadow-md transition-all border-0 bg-card/80"
      onClick={() => setSelectedPharmacy(p)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
          <Pill className="h-6 w-6 text-green-600" />
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

  // Render clickable lab card
  const renderLabCard = (l: any) => (
    <Card 
      key={l.id} 
      className="cursor-pointer hover:shadow-md transition-all border-0 bg-card/80"
      onClick={() => setSelectedLab(l)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
          <TestTube className="h-6 w-6 text-purple-600" />
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
            <Card key={apt.id} className="border-0 bg-card/80">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Dr. {apt.profiles?.first_name} {apt.profiles?.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(apt.appointment_date).toLocaleDateString('sw-TZ')}
                  </p>
                </div>
                <Badge>{apt.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    return null;
  };

  // Doctor chat mode UI
  if (chatMode === 'doctor' && chatDoctor) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background">
        {/* Chat header */}
        <div className="p-3 border-b flex items-center gap-3 bg-card">
          <Button variant="ghost" size="icon" onClick={exitDoctorChat}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={chatDoctor.profiles?.avatar_url} />
            <AvatarFallback><Stethoscope className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">Dr. {chatDoctor.profiles?.first_name} {chatDoctor.profiles?.last_name}</p>
            <p className="text-xs text-green-500">Online</p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {doctorMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.sender_id === user?.id 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-muted rounded-bl-md'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender_id === user?.id && (
                      msg.is_read ? <CheckCheck className="h-3 w-3 text-blue-400" /> : <Check className="h-3 w-3" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {doctorTyping && (
              <div className="flex gap-1 px-4 py-2 bg-muted rounded-2xl w-fit">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t bg-card">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Andika ujumbe..."
              className="flex-1 rounded-full"
            />
            <Button size="icon" className="rounded-full" onClick={handleSend} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] ${msg.type === 'bot' ? 'flex gap-2' : ''}`}>
                {msg.type === 'bot' && (
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card shadow-sm border rounded-bl-md'
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
                          className="rounded-full h-8 text-xs"
                          onClick={() => { setInput(s.replace(/[^\w\s]/gi, '')); setTimeout(() => handleSend(), 100); }}
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
              <div className="bg-card shadow-sm border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 rounded-full shrink-0 ${isListening ? 'bg-destructive text-destructive-foreground' : ''}`}
            onClick={toggleListening}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Andika ujumbe..."
            className="flex-1 h-11 rounded-full bg-muted border-0"
          />
          
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex justify-center gap-2 mt-3 max-w-2xl mx-auto">
          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => { setInput('Daktari'); setTimeout(() => handleSend(), 100); }}>
            <Stethoscope className="h-3 w-3 mr-1" /> Daktari
          </Button>
          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => { setInput('Hospitali'); setTimeout(() => handleSend(), 100); }}>
            <Building className="h-3 w-3 mr-1" /> Hospitali
          </Button>
          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => { setInput('Dawa'); setTimeout(() => handleSend(), 100); }}>
            <Pill className="h-3 w-3 mr-1" /> Dawa
          </Button>
          <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => { setInput('Maabara'); setTimeout(() => handleSend(), 100); }}>
            <TestTube className="h-3 w-3 mr-1" /> Maabara
          </Button>
        </div>
      </div>

      {/* Doctor Detail Modal */}
      <Dialog open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedDoctor?.profiles?.avatar_url} />
                <AvatarFallback className="bg-primary/10"><Stethoscope className="h-8 w-8 text-primary" /></AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>Dr. {selectedDoctor?.profiles?.first_name} {selectedDoctor?.profiles?.last_name}</DialogTitle>
                <DialogDescription>{selectedDoctor?.specialties?.name || selectedDoctor?.hospital_name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4">
              {selectedDoctor?.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{selectedDoctor?.rating.toFixed(1)}</span>
                </div>
              )}
              <Badge>{selectedDoctor?.experience_years || 0} miaka</Badge>
              <Badge variant="outline">
                {selectedDoctor?.consultation_fee ? `Tsh ${selectedDoctor.consultation_fee.toLocaleString()}` : 'Bure'}
              </Badge>
            </div>
            
            {selectedDoctor?.bio && <p className="text-sm text-muted-foreground">{selectedDoctor.bio}</p>}
            
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
            
            {selectedDoctor?.languages?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedDoctor.languages.map((lang: string) => (
                  <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={() => { setBookingDoctor(selectedDoctor); setSelectedDoctor(null); }}>
                <CalendarIcon className="h-4 w-4 mr-2" /> Weka Miadi
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => startDoctorChat(selectedDoctor)}>
                <MessageCircle className="h-4 w-4 mr-2" /> Ongea Naye
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hospital Detail Modal */}
      <Dialog open={!!selectedHospital} onOpenChange={() => setSelectedHospital(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <DialogTitle>{selectedHospital?.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selectedHospital?.address}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {selectedHospital?.description && (
              <p className="text-sm text-muted-foreground">{selectedHospital.description}</p>
            )}
            
            {selectedHospital?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${selectedHospital.phone}`} className="text-primary">{selectedHospital.phone}</a>
              </div>
            )}
            
            {selectedHospital?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {selectedHospital.email}
              </div>
            )}
            
            {selectedHospital?.services?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Huduma:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedHospital.services.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
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
              <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center">
                <Pill className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <DialogTitle>{selectedPharmacy?.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selectedPharmacy?.address}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {selectedPharmacy?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${selectedPharmacy.phone}`} className="text-primary">{selectedPharmacy.phone}</a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lab Detail Modal */}
      <Dialog open={!!selectedLab} onOpenChange={() => setSelectedLab(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-purple-100 flex items-center justify-center">
                <TestTube className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <DialogTitle>{selectedLab?.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selectedLab?.address}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {selectedLab?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${selectedLab.phone}`} className="text-primary">{selectedLab.phone}</a>
              </div>
            )}
            
            {selectedLab?.test_types?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Vipimo:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedLab.test_types.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <Dialog open={!!bookingDoctor} onOpenChange={() => setBookingDoctor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Weka Miadi</DialogTitle>
            <DialogDescription>
              Dr. {bookingDoctor?.profiles?.first_name} {bookingDoctor?.profiles?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Tarehe</label>
              <Calendar
                mode="single"
                selected={bookingDate}
                onSelect={setBookingDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border mt-2"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Saa</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                  <Button
                    key={time}
                    variant={bookingTime === time ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBookingTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Dalili (si lazima)</label>
              <Textarea
                value={bookingSymptoms}
                onChange={(e) => setBookingSymptoms(e.target.value)}
                placeholder="Eleza dalili zako..."
                className="mt-2"
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
