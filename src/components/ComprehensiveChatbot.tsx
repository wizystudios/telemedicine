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
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white shadow-sm border border-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{msg.content}</p>
              
              {/* Render data if available */}
              {msg.data?.type === 'doctors' && (
                <div className="mt-3 space-y-2">
                  {msg.data.items.map((doctor: any) => (
                    <button
                      key={doctor.id}
                      onClick={() => handleDoctorClick(doctor.id)}
                      className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                        {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm text-gray-900">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {msg.data?.type === 'hospitals' && (
                <div className="mt-3 space-y-2">
                  {msg.data.items.map((hospital: any) => (
                    <div key={hospital.id} className="p-3 bg-gray-50 rounded-xl">
                      <p className="font-medium text-sm text-gray-900">{hospital.name}</p>
                      <p className="text-xs text-gray-600">{hospital.address}</p>
                      {hospital.phone && (
                        <a href={`tel:${hospital.phone}`} className="text-xs text-blue-600 hover:underline">
                          {hospital.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.data?.type === 'pharmacies' && (
                <div className="mt-3 space-y-2">
                  {msg.data.items.map((pharmacy: any) => (
                    <div key={pharmacy.id} className="p-3 bg-gray-50 rounded-xl">
                      <p className="font-medium text-sm text-gray-900">{pharmacy.name}</p>
                      <p className="text-xs text-gray-600">{pharmacy.address}</p>
                      {pharmacy.phone && (
                        <a href={`tel:${pharmacy.phone}`} className="text-xs text-blue-600 hover:underline">
                          {pharmacy.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.data?.type === 'labs' && (
                <div className="mt-3 space-y-2">
                  {msg.data.items.map((lab: any) => (
                    <div key={lab.id} className="p-3 bg-gray-50 rounded-xl">
                      <p className="font-medium text-sm text-gray-900">{lab.name}</p>
                      <p className="text-xs text-gray-600">{lab.address}</p>
                      {lab.phone && (
                        <a href={`tel:${lab.phone}`} className="text-xs text-blue-600 hover:underline">
                          {lab.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.data?.type === 'post_problem' && (
                <div className="mt-3">
                  <Input
                    placeholder="Describe your symptoms..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        handlePostProblem(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="bg-white"
                  />
                </div>
              )}

              {msg.data?.type === 'conversations' && (
                <div className="mt-3 space-y-2">
                  {msg.data.items.map((conv: any) => (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/messages?appointmentId=${conv.id}`)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <p className="text-sm text-gray-900">
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
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 h-12 rounded-full border-gray-300"
            disabled={isLoading}
          />
          <Button
            onClick={toggleListening}
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full ${isListening ? 'bg-red-100 text-red-600' : ''}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
