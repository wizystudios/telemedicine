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
      
      // First, let's check if we have any doctors at all
      const { data: allDoctors, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor');
        
      console.log('All doctors in database:', allDoctors?.length || 0, allDoctors);
      
      if (allError) {
        console.error('Error fetching all doctors:', allError);
        throw allError;
      }

      // Now get the doctors for display
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
        <div className="mt-2 space-y-3">
          {items.map((doctor: any) => (
            <div key={doctor.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={doctor.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-blue-500 text-white text-sm font-medium">
                      {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {doctor.isAvailable && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{doctor.specialization}</p>
                  <div className="flex items-center mt-1 space-x-3">
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < Math.floor(doctor.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{doctor.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-gray-500">{doctor.experience}+ years exp</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Button 
                    size="sm"
                    onClick={() => onBookAppointment?.(doctor.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-xs rounded-lg"
                  >
                    Book
                  </Button>
                  {doctor.phone && (
                    <Button 
                      size="sm"
                      variant="outline"
                      className="px-3 py-1 text-xs rounded-lg"
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
    <div className="h-screen w-full flex flex-col bg-gray-50 dark:bg-black">
      {/* Apple Messages Style Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"></div>
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">AI Doctor</h1>
              <p className="text-xs text-green-500 font-medium">Active now</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modern Chat Container */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto flex flex-col">
          {/* Messages Area with beautiful scrollbar */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-3 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {message.type === 'user' ? (
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className="space-y-3">
                    <div className={`relative rounded-3xl px-6 py-4 shadow-lg ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white ml-4' 
                        : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 mr-4'
                    }`}>
                      {/* Message bubble tail */}
                      <div className={`absolute top-4 w-0 h-0 ${
                        message.type === 'user'
                          ? 'right-[-8px] border-l-[16px] border-l-blue-500 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                          : 'left-[-8px] border-r-[16px] border-r-white dark:border-r-gray-800 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
                      }`}></div>
                      
                      <p className="text-sm leading-relaxed font-medium">{message.content}</p>
                    </div>
                    
                    {renderMessageData(message)}
                    
                    {/* Suggestions with modern pill design */}
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 
                                       hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900 dark:hover:to-indigo-900
                                       text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300
                                       rounded-full text-sm font-medium border border-gray-200 dark:border-gray-600
                                       hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200
                                       shadow-sm hover:shadow-md transform hover:scale-105"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Modern typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl px-6 py-4 shadow-lg mr-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      
      {/* Apple Messages Style Input */}
      <div className="sticky bottom-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 px-4 py-2 safe-area-pb">
        <div className="flex items-end space-x-3">
          {/* Voice button */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isListening 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          
          {/* Input field */}
          <div className="flex-1 min-h-[36px] max-h-[120px] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center px-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message"
              className="w-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 
                       text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400
                       text-base p-0 h-auto resize-none"
              disabled={isLoading}
            />
          </div>
          
          {/* Send button */}
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              input.trim() && !isLoading
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}