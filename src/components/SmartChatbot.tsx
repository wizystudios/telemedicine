import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Calendar,
  MapPin,
  Phone,
  Stethoscope,
  Pill,
  TestTube,
  Clock,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: any;
}

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SmartChatbotProps {
  onBookAppointment?: (doctorId: string) => void;
  onViewHospital?: (hospitalId: string) => void;
  onViewPharmacy?: (pharmacyId: string) => void;
}

export function SmartChatbot({ onBookAppointment, onViewHospital, onViewPharmacy }: SmartChatbotProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Karibu TeleMed! 👋 Mimi ni msaidizi wako wa kidigitali. Ninaweza kukusaidia:',
      timestamp: new Date(),
      suggestions: [
        'Tafuta daktari',
        'Ratiba miadi',
        'Tafuta hospitali',
        'Tafuta dawa',
        'Msaada wa kwanza',
        'Maswali ya afya'
      ]
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'sw-KE';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Kosa",
          description: "Imeshindwa kusikia. Jaribu tena.",
          variant: "destructive"
        });
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognition.current) {
      setIsListening(true);
      recognition.current.start();
    }
  };

  const stopListening = () => {
    if (recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  const processMessage = async (message: string): Promise<Message> => {
    const lowerMessage = message.toLowerCase();
    
    // Doctor search
    if (lowerMessage.includes('daktari') || lowerMessage.includes('doctor')) {
      const doctors = await searchDoctors(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: doctors.length > 0 
          ? `Nimepata madaktari ${doctors.length}. Hapa ni orodha:`
          : 'Samahani, hakuna daktari wa aina hiyo kwa sasa.',
        timestamp: new Date(),
        data: { type: 'doctors', items: doctors }
      };
    }

    // Hospital search
    if (lowerMessage.includes('hospitali') || lowerMessage.includes('hospital')) {
      const hospitals = await searchHospitals(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: hospitals.length > 0 
          ? `Nimepata hospitali ${hospitals.length}. Chagua moja:`
          : 'Samahani, hakuna hospitali zilizopo kwa sasa.',
        timestamp: new Date(),
        data: { type: 'hospitals', items: hospitals }
      };
    }

    // Pharmacy search
    if (lowerMessage.includes('dawa') || lowerMessage.includes('pharmacy') || lowerMessage.includes('pharmasi')) {
      const pharmacies = await searchPharmacies(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: pharmacies.length > 0 
          ? `Nimepata maduka ya dawa ${pharmacies.length}:`
          : 'Samahani, hakuna maduka ya dawa yaliyopo kwa sasa.',
        timestamp: new Date(),
        data: { type: 'pharmacies', items: pharmacies }
      };
    }

    // Lab search
    if (lowerMessage.includes('lab') || lowerMessage.includes('upimaji') || lowerMessage.includes('laboratory')) {
      const labs = await searchLabs(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: labs.length > 0 
          ? `Nimepata maabara ${labs.length}:`
          : 'Samahani, hakuna maabara yaliyopo kwa sasa.',
        timestamp: new Date(),
        data: { type: 'labs', items: labs }
      };
    }

    // Appointment booking
    if (lowerMessage.includes('miadi') || lowerMessage.includes('appointment') || lowerMessage.includes('ratiba')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Ili kuratibu miadi, chagua daktari kutoka orodha au taja jina la daktari unayemtaka.',
        timestamp: new Date(),
        suggestions: ['Tafuta daktari', 'Daktari wa moyo', 'Daktari wa ngozi', 'Daktari wa akili']
      };
    }

    // First aid
    if (lowerMessage.includes('msaada') || lowerMessage.includes('first aid') || lowerMessage.includes('dharura')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '🚨 Kwa hali ya dharura, piga simu 999 mara moja!\n\nKwa msaada wa kwanza:\n• Jeraha - Safisha na funika\n• Homa - Kunywa maji mengi\n• Maumivu - Pumzika na chukua dawa za maumivu\n\nUnataka msaada gani?',
        timestamp: new Date(),
        suggestions: ['Jeraha', 'Homa', 'Maumivu ya kichwa', 'Tumbo kuuma']
      };
    }

    // General greeting response
    if (lowerMessage.includes('hujambo') || lowerMessage.includes('hello') || lowerMessage.includes('mambo')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Hujambo! Nimefurahi kukuona. Ninaweza kukusaidia aje leo?',
        timestamp: new Date(),
        suggestions: ['Tafuta daktari', 'Ratiba miadi', 'Tafuta hospitali', 'Msaada wa kwanza']
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Samahani, sijaelewa vizuri. Je, unaweza kueleza zaidi? Ninaweza kukusaidia kutafuta madaktari, hospitali, maduka ya dawa, au kutoa msaada wa kwanza.',
      timestamp: new Date(),
      suggestions: ['Tafuta daktari', 'Tafuta hospitali', 'Tafuta dawa', 'Msaada wa kwanza']
    };
  };

  const searchDoctors = async (query: string) => {
    try {
      console.log('Searching for doctors...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          email
        `)
        .eq('role', 'doctor')
        .limit(5);

      console.log('Doctor search result:', { data, error });
      if (error) throw error;
      
      const doctors = data?.map(doctor => ({
        ...doctor,
        specialization: 'Mfanyakazi wa Afya',
        rating: 4.5,
        isAvailable: true
      })) || [];
      
      console.log('Mapped doctors:', doctors);
      return doctors;
    } catch (error) {
      console.error('Error searching doctors:', error);
      return [];
    }
  };

  const searchHospitals = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('is_verified', true)
        .order('is_promoted', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching hospitals:', error);
      return [];
    }
  };

  const searchPharmacies = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('is_verified', true)
        .order('is_promoted', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching pharmacies:', error);
      return [];
    }
  };

  const searchLabs = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('laboratories')
        .select('*')
        .eq('is_verified', true)
        .order('is_promoted', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching labs:', error);
      return [];
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save conversation if user is logged in
      if (user) {
        await supabase
          .from('chatbot_conversations')
          .upsert({
            user_id: user.id,
            session_id: `session_${user.id}_${Date.now()}`,
            messages: JSON.stringify([...messages, userMessage])
          });
      }

      const botResponse = await processMessage(input);
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Samahani, nimepata shida. Jaribu tena baadaye.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageData = (message: Message) => {
    if (!message.data) return null;

    const { type, items } = message.data;

    if (type === 'doctors') {
      return (
        <div className="mt-3 space-y-3">
          {items.map((doctor: any) => (
            <Card key={doctor.id} className="border border-blue-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={doctor.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      <Stethoscope className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      Dr. {doctor.first_name} {doctor.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">{doctor.specialization}</p>
                    <div className="flex items-center mt-1 space-x-4">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">{doctor.rating}</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Available
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => onBookAppointment?.(doctor.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Book
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (type === 'hospitals') {
      return (
        <div className="mt-3 space-y-3">
          {items.map((hospital: any) => (
            <Card key={hospital.id} className="border border-green-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{hospital.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">{hospital.rating}</span>
                      </div>
                      {hospital.is_promoted && (
                        <Badge className="bg-yellow-100 text-yellow-700">Promoted</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button size="sm" variant="outline" onClick={() => onViewHospital?.(hospital.id)}>
                      View
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-screen flex flex-col bg-white dark:bg-gray-900 shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Messages Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 w-4" />}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      {renderMessageData(message)}
                      
                      {message.suggestions && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs rounded-full border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 h-8"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mt-1">
                      <Bot className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        
        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-end space-x-3 bg-gray-50 dark:bg-gray-900 rounded-3xl p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={isListening ? stopListening : startListening}
                className={`rounded-full p-2 ${isListening ? 'text-red-600 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                disabled={isLoading}
              />
              
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="rounded-full p-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}