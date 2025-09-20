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
    if (lowerMessage.includes('daktari') || lowerMessage.includes('doctor') || lowerMessage.includes('find')) {
      console.log('🩺 Find Doctor request detected');
      const doctors = await searchDoctors(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: doctors.length > 0 
          ? `🩺 Found ${doctors.length} doctor${doctors.length > 1 ? 's' : ''} available:`
          : '🩺 Find Doctor\n\nSorry, no doctors are currently available.',
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
      console.log('🔍 Searching for doctors in profiles table...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          email,
          phone,
          country
        `)
        .eq('role', 'doctor')
        .limit(10);

      console.log('✅ Doctor search result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ No doctors found in profiles table');
        return [];
      }
      
      const doctors = data.map((doctor, idx) => ({
        ...doctor,
        specialization: ['Daktari wa Familia', 'Daktari wa Moyo', 'Daktari wa Ngozi', 'Daktari wa Watoto'][idx % 4],
        rating: 4.2 + (Math.random() * 0.8),
        isAvailable: Math.random() > 0.3,
        experience: Math.floor(Math.random() * 15) + 2
      }));
      
      console.log('🎯 Final mapped doctors:', doctors);
      return doctors;
    } catch (error) {
      console.error('💥 Error searching doctors:', error);
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
              <div className="mt-2 space-y-2">
                {items.map((doctor: any) => (
                  <div key={doctor.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={doctor.avatar_url} className="object-cover" />
                          <AvatarFallback className="bg-green-500 text-white text-sm font-medium">
                            {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {doctor.isAvailable && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </h4>
                        <p className="text-xs text-gray-600">{doctor.specialization}</p>
                        <div className="flex items-center mt-1 space-x-2">
                          <div className="flex items-center space-x-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < Math.floor(doctor.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">{doctor.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-xs text-gray-500">{doctor.experience}+ yrs</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button 
                          size="sm"
                          onClick={() => onBookAppointment?.(doctor.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-xs rounded-lg h-7"
                        >
                          Book
                        </Button>
                        {doctor.phone && (
                          <Button 
                            size="sm"
                            variant="outline"
                            className="px-2 py-1 text-xs rounded-lg h-7 border-gray-300"
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
      );
    }

    if (type === 'hospitals') {
      return (
        <div className="mt-4 space-y-4">
          {items.map((hospital: any) => (
            <div key={hospital.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl shadow-lg">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{hospital.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {hospital.address}
                  </p>
                  <div className="flex items-center mt-3 space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < Math.floor(hospital.rating || 4.5) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{hospital.rating || '4.5'}</span>
                    </div>
                    {hospital.is_promoted && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full font-medium">
                        ⭐ Featured
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onViewHospital?.(hospital.id)}
                    className="border-gray-300 hover:border-blue-500 hover:text-blue-600 rounded-xl px-4 py-2 font-medium"
                  >
                    View Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 
                             text-white rounded-xl px-4 py-2 font-medium shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-green-400 via-green-500 to-green-600">
      {/* WhatsApp Style Header */}
      <div className="bg-green-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white rounded-full border-2 border-green-600"></div>
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Doctor</h1>
            <p className="text-xs text-green-100">Online</p>
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.type === 'user' ? 'ml-12' : 'mr-12'}`}>
              {/* Message Bubble */}
              <div className={`relative rounded-2xl px-4 py-3 shadow-md ${
                message.type === 'user' 
                  ? 'bg-white text-gray-800 rounded-br-sm' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                
                {/* Timestamp */}
                <div className={`text-xs text-gray-500 mt-1 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              {/* Render doctor cards or other data */}
              {renderMessageData(message)}
              
              {/* Suggestions */}
              {message.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-2 bg-white/90 hover:bg-white text-gray-700 
                               rounded-full text-xs font-medium border border-gray-200
                               hover:border-green-400 transition-all duration-200
                               shadow-sm hover:shadow-md"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] mr-12">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
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
      
      {/* WhatsApp Style Input */}
      <div className="bg-white px-4 py-3 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          {/* Voice button */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isListening 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          {/* Input field */}
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 
                       text-gray-900 placeholder:text-gray-500 text-sm p-0 h-auto"
              disabled={isLoading}
            />
          </div>
          
          {/* Send button */}
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              input.trim() && !isLoading
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}