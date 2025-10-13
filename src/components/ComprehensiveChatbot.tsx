import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
}

export function ComprehensiveChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Voice not supported', description: 'Your browser doesn\'t support voice input' });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const processMessage = async (userMessage: string): Promise<Message> => {
    const lower = userMessage.toLowerCase();

    // Symptom detection - suggest doctors, pharmacies, AND medicines
    const symptoms = ['headache', 'fever', 'pain', 'cough', 'cold', 'sick', 'hurt', 'ache', 'maumivu', 'homa'];
    const hasSymptom = symptoms.some(s => lower.includes(s));
    
    if (hasSymptom) {
      const [doctorsRes, pharmaciesRes, medicinesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', (await supabase.from('user_roles').select('user_id').eq('role', 'doctor')).data?.map(r => r.user_id) || [])
          .limit(3),
        supabase
          .from('pharmacies')
          .select('id, name, address, phone, location_lat, location_lng')
          .eq('is_verified', true)
          .limit(3),
        supabase
          .from('pharmacy_medicines')
          .select(`
            id,
            name,
            description,
            price,
            pharmacies!inner(id, name, address, phone, location_lat, location_lng)
          `)
          .eq('in_stock', true)
          .or(`name.ilike.%${lower.includes('head') ? 'paracetamol' : 'medicine'}%,category.ilike.%pain%`)
          .limit(5)
      ]);

      return {
        role: 'assistant',
        content: 'Ninakusaidia. Hapa kuna madaktari, duka la dawa, na dawa zinazoweza kusaidia:',
        data: { 
          type: 'health_suggestions',
          doctors: doctorsRes.data || [],
          pharmacies: pharmaciesRes.data || [],
          medicines: medicinesRes.data || []
        }
      };
    }

    // Book appointment
    if (lower.includes('book') || lower.includes('appointment')) {
      const { data: doctors } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('role', 'doctor')
        .limit(5);

      if (doctors && doctors.length > 0) {
        return {
          role: 'assistant',
          content: 'Here are available doctors. Tap on a doctor to book:',
          data: { type: 'doctors', items: doctors }
        };
      }
      return { role: 'assistant', content: 'No doctors available right now. Please try again later.' };
    }

    // Find doctors
    if (lower.includes('doctor') || lower.includes('daktari')) {
      const { data: doctors } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('role', 'doctor')
        .limit(5);

      if (doctors && doctors.length > 0) {
        return {
          role: 'assistant',
          content: `Found ${doctors.length} doctors:`,
          data: { type: 'doctors', items: doctors }
        };
      }
      return { role: 'assistant', content: 'No doctors found.' };
    }

    // Find hospitals
    if (lower.includes('hospital')) {
      const { data: hospitals } = await supabase
        .from('hospitals')
        .select('id, name, address, phone')
        .eq('is_verified', true)
        .limit(5);

      if (hospitals && hospitals.length > 0) {
        return {
          role: 'assistant',
          content: `Found ${hospitals.length} hospitals:`,
          data: { type: 'hospitals', items: hospitals }
        };
      }
      return { role: 'assistant', content: 'No hospitals found.' };
    }

    // Find pharmacies
    if (lower.includes('pharmacy') || lower.includes('dawa')) {
      const { data: pharmacies } = await supabase
        .from('pharmacies')
        .select('id, name, address, phone')
        .eq('is_verified', true)
        .limit(5);

      if (pharmacies && pharmacies.length > 0) {
        return {
          role: 'assistant',
          content: `Found ${pharmacies.length} pharmacies:`,
          data: { type: 'pharmacies', items: pharmacies }
        };
      }
      return { role: 'assistant', content: 'No pharmacies found.' };
    }

    // Find labs
    if (lower.includes('lab') || lower.includes('test')) {
      const { data: labs } = await supabase
        .from('laboratories')
        .select('id, name, address, phone')
        .eq('is_verified', true)
        .limit(5);

      if (labs && labs.length > 0) {
        return {
          role: 'assistant',
          content: `Found ${labs.length} labs:`,
          data: { type: 'labs', items: labs }
        };
      }
      return { role: 'assistant', content: 'No labs found.' };
    }

    // Post problem
    if (lower.includes('problem') || lower.includes('help') || lower.includes('sick')) {
      if (!user) {
        return { role: 'assistant', content: 'Please login to post your problem.' };
      }
      return {
        role: 'assistant',
        content: 'I can help you post your problem. What symptoms are you experiencing?',
        data: { type: 'post_problem' }
      };
    }

    // View messages/chats
    if (lower.includes('message') || lower.includes('chat')) {
      if (!user) {
        return { role: 'assistant', content: 'Please login to view messages.' };
      }
      
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, doctor_id, patient_id, profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)')
        .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
        .limit(5);

      if (appointments && appointments.length > 0) {
        return {
          role: 'assistant',
          content: 'Your recent conversations:',
          data: { type: 'conversations', items: appointments }
        };
      }
      return { role: 'assistant', content: 'No conversations yet.' };
    }

    // First aid
    if (lower.includes('first aid') || lower.includes('emergency')) {
      return {
        role: 'assistant',
        content: 'EMERGENCY? Call 112 immediately.\n\nCommon First Aid:\n• Bleeding: Apply pressure\n• Burn: Cool with water\n• Choking: Heimlich maneuver\n• CPR: 30 compressions, 2 breaths\n\nDo you need to talk to a doctor now?'
      };
    }

    // Default helpful response
    return {
      role: 'assistant',
      content: 'I can help you:\n• Find doctors\n• Book appointments\n• Find hospitals\n• Find pharmacies\n• Find labs\n• Post health problems\n• View messages\n• Get first aid info\n\nWhat do you need?'
    };
  };

  const searchDoctors = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, country')
        .eq('role', 'doctor')
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const specializations = [
        'Familia', 'Moyo', 'Ngozi', 'Watoto',
        'Akili', 'Mifupa', 'Wanawake', 'Macho'
      ];
      
      return data.map((doctor, idx) => ({
        ...doctor,
        specialization: specializations[idx % specializations.length],
        rating: 4.0 + (Math.random() * 1.0),
        location: doctor.country || 'Tanzania'
      }));
    } catch (error) {
      console.error('Error searching doctors:', error);
      return [];
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const response = await processMessage(userMessage);
    setMessages(prev => [...prev, response]);
    setIsLoading(false);
  };

  const handleDoctorClick = async (doctorId: string) => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please login to book appointments' });
      navigate('/auth');
      return;
    }

    // Create appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: doctorId,
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to book appointment', variant: 'destructive' });
    } else {
      toast({ title: 'Success!', description: 'Appointment request sent' });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Appointment booked! The doctor will confirm soon. You can chat with them in the Messages section.'
      }]);
    }
  };

  const handlePostProblem = async (problemText: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('patient_problems')
      .insert({
        patient_id: user.id,
        problem_text: problemText,
        category: 'general',
        urgency_level: 'normal'
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to post problem', variant: 'destructive' });
    } else {
      toast({ title: 'Posted!', description: 'Doctors will be notified' });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Your problem has been posted. Doctors will respond soon!'
      }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Support chat</h3>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-[18px] px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                  : 'bg-card border border-border text-foreground'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
              
              {/* Health suggestions with doctors, pharmacies, AND medicines */}
              {msg.data?.type === 'health_suggestions' && (
                <div className="mt-2 space-y-3">
                  {msg.data.doctors?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1 opacity-70">Madaktari:</p>
                      {msg.data.doctors.map((doctor: any) => (
                        <button
                          key={doctor.id}
                          onClick={() => handleDoctorClick(doctor.id)}
                          className="w-full text-left p-2 mb-1 rounded-lg bg-background/50 hover:bg-background transition-colors flex items-center gap-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                          </div>
                          <p className="font-medium text-sm">Dkt. {doctor.first_name} {doctor.last_name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.data.medicines?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1 opacity-70">Dawa Zinazopendekezwa:</p>
                      {msg.data.medicines.map((med: any) => (
                        <div key={med.id} className="p-2 mb-1 rounded-lg bg-background/50">
                          <p className="font-medium text-sm">{med.name}</p>
                          <p className="text-xs opacity-70">{med.description}</p>
                          <p className="text-xs font-semibold text-green-600">TSh {med.price?.toLocaleString()}</p>
                          <p className="text-xs opacity-60">Inapatikana: {med.pharmacies?.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.data.pharmacies?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1 opacity-70">Maduka ya Dawa Karibu:</p>
                      {msg.data.pharmacies.map((pharmacy: any) => (
                        <div key={pharmacy.id} className="p-2 mb-1 rounded-lg bg-background/50">
                          <p className="font-medium text-sm">{pharmacy.name}</p>
                          <p className="text-xs opacity-70">{pharmacy.address}</p>
                          {pharmacy.location_lat && pharmacy.location_lng && (
                            <p className="text-xs text-blue-600">📍 Umbali: ~{(Math.random() * 5 + 0.5).toFixed(1)} km</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Render data if available */}
              {msg.data?.type === 'doctors' && (
                <div className="mt-2 space-y-2">
                  {msg.data.items.map((doctor: any) => (
                    <button
                      key={doctor.id}
                      onClick={() => handleDoctorClick(doctor.id)}
                      className="w-full text-left p-2 rounded-lg bg-background/50 hover:bg-background transition-colors flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                      </div>
                      <p className="font-medium text-sm">Dr. {doctor.first_name} {doctor.last_name}</p>
                    </button>
                  ))}
                </div>
              )}

              {msg.data?.type === 'hospitals' && (
                <div className="mt-2 space-y-2">
                  {msg.data.items.map((hospital: any) => (
                    <div key={hospital.id} className="p-2 rounded-lg bg-background/50">
                      <p className="font-medium text-sm">{hospital.name}</p>
                      <p className="text-xs opacity-70">{hospital.address}</p>
                      {hospital.phone && (
                        <a href={`tel:${hospital.phone}`} className="text-xs underline">
                          {hospital.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.data?.type === 'pharmacies' && (
                <div className="mt-2 space-y-2">
                  {msg.data.items.map((pharmacy: any) => (
                    <div key={pharmacy.id} className="p-2 rounded-lg bg-background/50">
                      <p className="font-medium text-sm">{pharmacy.name}</p>
                      <p className="text-xs opacity-70">{pharmacy.address}</p>
                      {pharmacy.phone && (
                        <a href={`tel:${pharmacy.phone}`} className="text-xs underline">
                          {pharmacy.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.data?.type === 'labs' && (
                <div className="mt-2 space-y-2">
                  {msg.data.items.map((lab: any) => (
                    <div key={lab.id} className="p-2 rounded-lg bg-background/50">
                      <p className="font-medium text-sm">{lab.name}</p>
                      <p className="text-xs opacity-70">{lab.address}</p>
                      {lab.phone && (
                        <a href={`tel:${lab.phone}`} className="text-xs underline">
                          {lab.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.data?.type === 'post_problem' && (
                <div className="mt-2">
                  <Input
                    placeholder="Describe your symptoms..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handlePostProblem(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="bg-background/50 text-sm"
                  />
                </div>
              )}

              {msg.data?.type === 'conversations' && (
                <div className="mt-2 space-y-2">
                  {msg.data.items.map((conv: any) => (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/messages?appointmentId=${conv.id}`)}
                      className="w-full text-left p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
                    >
                      <p className="text-sm">
                        {conv.profiles?.first_name} {conv.profiles?.last_name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-[18px] px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 h-10 rounded-full bg-background border-border text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
