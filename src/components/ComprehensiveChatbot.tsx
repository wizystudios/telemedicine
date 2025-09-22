import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Star,
  Hospital,
  MessageCircle,
  Settings,
  Menu,
  Search,
  Heart,
  Activity,
  FileText,
  Bookmark,
  Bell,
  LogOut,
  Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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

export function ComprehensiveChatbot() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: '👋 Karibu TeleMed! Mimi ni msaidizi wako wa kila kitu. Ninaweza kukusaidia na:',
      timestamp: new Date(),
      suggestions: [
        '🩺 Tafuta Daktari',
        '🏥 Tafuta Hospitali', 
        '💊 Tafuta Dawa',
        '📅 Ratiba Miadi',
        '🔬 Maabara',
        '🆘 Msaada wa Kwanza',
        '📱 Maongezi na Daktari',
        '📋 Medical Records',
        '⚙️ Settings'
      ]
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
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
    if (lowerMessage.includes('daktari') || lowerMessage.includes('doctor') || lowerMessage.includes('find') || lowerMessage.includes('🩺')) {
      console.log('🩺 Find Doctor request detected');
      const doctors = await searchDoctors(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: doctors.length > 0 
          ? `🩺 **Nimepata Madaktari ${doctors.length}**\n\nHapa kuna madaktari waliopo:`
          : '🩺 **Tafuta Daktari**\n\nSamahani, hakuna madaktari waliopo kwa sasa. Jaribu tena baadaye.',
        timestamp: new Date(),
        data: { type: 'doctors', items: doctors },
        suggestions: doctors.length > 0 ? ['Ratiba Miadi', 'Tafuta zaidi', 'Tafuta hospitali'] : ['Tafuta hospitali', 'Msaada wa kwanza']
      };
    }

    // Hospital search
    if (lowerMessage.includes('hospitali') || lowerMessage.includes('hospital') || lowerMessage.includes('🏥')) {
      const hospitals = await searchHospitals(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: hospitals.length > 0 
          ? `🏥 **Nimepata Hospitali ${hospitals.length}**\n\nHii ni orodha ya hospitali zilizopo:`
          : '🏥 **Tafuta Hospitali**\n\nSamahani, hakuna hospitali zilizopo kwa sasa.',
        timestamp: new Date(),
        data: { type: 'hospitals', items: hospitals },
        suggestions: hospitals.length > 0 ? ['Piga simu hospitali', 'Tafuta daktari', 'Ratiba miadi'] : ['Tafuta daktari', 'Msaada wa kwanza']
      };
    }

    // Pharmacy search
    if (lowerMessage.includes('dawa') || lowerMessage.includes('pharmacy') || lowerMessage.includes('pharmasi') || lowerMessage.includes('💊')) {
      const pharmacies = await searchPharmacies(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: pharmacies.length > 0 
          ? `💊 **Nimepata Maduka ya Dawa ${pharmacies.length}**\n\nHapa kuna maduka ya dawa yaliyopo:`
          : '💊 **Tafuta Dawa**\n\nSamahani, hakuna maduka ya dawa yaliyopo kwa sasa.',
        timestamp: new Date(),
        data: { type: 'pharmacies', items: pharmacies },
        suggestions: pharmacies.length > 0 ? ['Piga simu duka', 'Tafuta dawa nyingine', 'Tafuta daktari'] : ['Tafuta daktari', 'Tafuta hospitali']
      };
    }

    // Lab search
    if (lowerMessage.includes('lab') || lowerMessage.includes('upimaji') || lowerMessage.includes('laboratory') || lowerMessage.includes('🔬')) {
      const labs = await searchLabs(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: labs.length > 0 
          ? `🔬 **Nimepata Maabara ${labs.length}**\n\nHapa kuna maabara yaliyopo:`
          : '🔬 **Tafuta Maabara**\n\nSamahani, hakuna maabara yaliyopo kwa sasa.',
        timestamp: new Date(),
        data: { type: 'labs', items: labs },
        suggestions: labs.length > 0 ? ['Ratiba upimaji', 'Piga simu', 'Tafuta daktari'] : ['Tafuta daktari', 'Tafuta hospitali']
      };
    }

    // Appointment booking
    if (lowerMessage.includes('miadi') || lowerMessage.includes('appointment') || lowerMessage.includes('ratiba') || lowerMessage.includes('📅')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '📅 **Ratiba Miadi**\n\nKwa kuratibu miadi, unahitaji:\n\n1️⃣ **Chagua Daktari** - Tafuta daktari unayemtaka\n2️⃣ **Chagua Siku** - Chagua tarehe unayotaka\n3️⃣ **Chagua Muda** - Chagua wakati unaopatikana\n\nAnza na kutafuta daktari wa aina unayomtaka.',
        timestamp: new Date(),
        suggestions: ['🩺 Tafuta Daktari', '🏥 Tafuta Hospitali', '❤️ Daktari wa Moyo', '👶 Daktari wa Watoto', '🧠 Daktari wa Akili']
      };
    }

    // Medical Records
    if (lowerMessage.includes('records') || lowerMessage.includes('rekodi') || lowerMessage.includes('history') || lowerMessage.includes('📋')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '📋 **Medical Records**\n\nHapa unaweza kuona na kusimamia rekodi zako za kimatibabu:\n\n• **Historia ya Magonjwa** - Magonjwa uliyowahi kupata\n• **Dawa za Sasa** - Dawa unazotumia\n• **Maabara** - Matokeo ya upimaji\n• **Miadi ya Awali** - Miadi uliyowahi kuwa nayo\n\nUnataka kuona nini?',
        timestamp: new Date(),
        suggestions: ['Historia yangu', 'Dawa zangu', 'Matokeo ya upimaji', 'Miadi yangu ya awali']
      };
    }

    // Settings
    if (lowerMessage.includes('settings') || lowerMessage.includes('mipangilio') || lowerMessage.includes('⚙️')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '⚙️ **Mipangilio**\n\nUnaweza kubadilisha:\n\n• **Profile Settings** - Jina, nambari, picha\n• **Notification Settings** - Arifa za miadi na dawa\n• **Language Settings** - Lugha ya matumizi\n• **Privacy Settings** - Faragha ya data\n• **Account Settings** - Nenosiri na usalama\n\nUnataka kubadilisha nini?',
        timestamp: new Date(),
        suggestions: ['Badilisha profile', 'Arifa', 'Lugha', 'Nenosiri', 'Logout']
      };
    }

    // Chat with doctor
    if (lowerMessage.includes('maongezi') || lowerMessage.includes('chat') || lowerMessage.includes('message') || lowerMessage.includes('📱')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '📱 **Maongezi na Madaktari**\n\nUnaweza kuongea moja kwa moja na:\n\n• **Daktari wako wa kawaida** - Aliyekuwa akukutibu\n• **Daktari yoyote** - Ongea na daktari aliyepo mtandaoni\n• **Mshauri wa afya** - Ongea na mshauri\n\nNani unataka kuongea naye?',
        timestamp: new Date(),
        suggestions: ['Daktari wangu', 'Daktari yoyote online', 'Mshauri wa afya', 'Tafuta daktari']
      };
    }

    // First aid / Emergency
    if (lowerMessage.includes('msaada') || lowerMessage.includes('first aid') || lowerMessage.includes('dharura') || lowerMessage.includes('🆘')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '🆘 **MSAADA WA KWANZA**\n\n🚨 **Kwa Hali ya Dharura: Piga 999!**\n\n**Msaada wa Haraka:**\n• **Jeraha** 🩹 - Safisha na funika\n• **Homa** 🤒 - Kunywa maji mengi, pumzika\n• **Maumivu ya Kichwa** 🤕 - Pumzika mahali tulivu\n• **Tumbo Kuuma** 🤢 - Kunywa maji, si kula kitu\n• **Kupumua Shida** 😮‍💨 - Kaa wima, pumzika\n\n**Una tatizo gani?**',
        timestamp: new Date(),
        suggestions: ['🩹 Jeraha', '🤒 Homa', '🤕 Kichwa kuuma', '🤢 Tumbo kuuma', '😮‍💨 Shida ya kupumua', '📞 Piga 999']
      };
    }

    // Greeting responses
    if (lowerMessage.includes('hujambo') || lowerMessage.includes('hello') || lowerMessage.includes('mambo') || lowerMessage.includes('habari')) {
      const greetings = [
        '👋 Hujambo! Habari za asubuhi? Ninaweza kukusaidia aje leo?',
        '😊 Karibu tena! Nina furaha kukuona. Unahitaji msaada gani?',
        '🌟 Hujambo rafiki! Je, una tatizo la kiafya nikakuletee msaada?'
      ];
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: greetings[Math.floor(Math.random() * greetings.length)],
        timestamp: new Date(),
        suggestions: ['🩺 Tafuta Daktari', '🏥 Tafuta Hospitali', '💊 Tafuta Dawa', '📅 Ratiba Miadi', '🆘 Msaada wa Kwanza']
      };
    }

    // Logout
    if (lowerMessage.includes('logout') || lowerMessage.includes('toka') || lowerMessage.includes('ondoka')) {
      await signOut();
      navigate('/auth');
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '👋 **Umeondoka kikamilifu**\n\nAsante kwa kutumia TeleMed. Tunatumai tutakuona tena hivi karibuni!\n\n**Unahitaji msaada wowote, tu hapa kila wakati.**',
        timestamp: new Date()
      };
    }

    // Default comprehensive response
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: '🤔 **Sijaelewa vizuri...**\n\nSamahani! Ninaweza kukusaidia na:\n\n🩺 **Kutafuta Madaktari** - "Tafuta daktari wa moyo"\n🏥 **Kutafuta Hospitali** - "Hospitali karibu nami"\n💊 **Kutafuta Dawa** - "Nataka dawa ya homa"\n📅 **Kuratibu Miadi** - "Nataka kuratibua miadi"\n🔬 **Kutafuta Maabara** - "Nataka kupima damu"\n🆘 **Msaada wa Kwanza** - "Kichwa kinauma"\n📱 **Maongezi** - "Nataka kuongea na daktari"\n\n**Jaribu moja ya hivi...**',
      timestamp: new Date(),
      suggestions: ['🩺 Tafuta Daktari', '🏥 Hospitali', '💊 Dawa', '📅 Miadi', '🔬 Upimaji', '🆘 Msaada', '📱 Chat']
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
        .limit(20);

      console.log('✅ Doctor search result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ No doctors found in profiles table');
        return [];
      }
      
      const specializations = [
        'Daktari wa Familia', 'Daktari wa Moyo', 'Daktari wa Ngozi', 'Daktari wa Watoto',
        'Daktari wa Akili', 'Daktari wa Mifupa', 'Daktari wa Wanawake', 'Daktari wa Macho',
        'Daktari wa Masikio', 'Daktari wa Figo', 'Daktari wa Mchango', 'Daktari wa Tumbo'
      ];
      
      const doctors = data.map((doctor, idx) => ({
        ...doctor,
        specialization: specializations[idx % specializations.length],
        rating: 4.0 + (Math.random() * 1.0),
        isAvailable: Math.random() > 0.3,
        experience: Math.floor(Math.random() * 20) + 5,
        consultationFee: Math.floor(Math.random() * 50000) + 30000,
        location: doctor.country || 'Tanzania',
        languages: ['Kiswahili', 'English']
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
        .limit(10);

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
        .limit(10);

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
        .limit(10);

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
        content: '❌ **Samahani, kuna tatizo**\n\nImeshindwa kuprocessa ujumbe wako. Jaribu tena baadaye au uliza swali jingine.',
        timestamp: new Date(),
        suggestions: ['🩺 Tafuta Daktari', '🏥 Hospitali', '💊 Dawa', '🆘 Msaada']
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
        <div className="mt-4 space-y-3">
          {items.map((doctor: any) => (
            <div key={doctor.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-blue-200">
                    <AvatarImage src={doctor.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold">
                      {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {doctor.isAvailable && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-gray-900">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h4>
                  <p className="text-blue-600 font-medium">{doctor.specialization}</p>
                  <div className="flex items-center mt-1 space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < Math.floor(doctor.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 font-medium">{doctor.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-gray-500">• {doctor.experience} yrs</span>
                    <span className="text-sm text-green-600 font-semibold">TSh {doctor.consultationFee.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center mt-1 space-x-2">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-500">{doctor.location}</span>
                    <span className="text-xs text-gray-400">• {doctor.languages.join(', ')}</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Button 
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white px-4 py-2 rounded-xl font-medium"
                  >
                    📅 Ratiba
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="px-3 py-2 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    💬 Chat
                  </Button>
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
            <div key={hospital.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-green-100 p-5 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl shadow-lg">
                  <Hospital className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900">{hospital.name}</h4>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
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
                      <span className="text-sm text-gray-600 font-medium">{hospital.rating || '4.5'}</span>
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
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl px-4 py-2 font-medium"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    📞 Piga
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-green-300 hover:border-green-500 hover:text-green-600 rounded-xl px-4 py-2 font-medium"
                  >
                    🔍 Maelezo
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'pharmacies') {
      return (
        <div className="mt-4 space-y-4">
          {items.map((pharmacy: any) => (
            <div key={pharmacy.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl shadow-lg">
                  <Pill className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900">{pharmacy.name}</h4>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {pharmacy.address}
                  </p>
                  <div className="flex items-center mt-3 space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < Math.floor(pharmacy.rating || 4.3) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 font-medium">{pharmacy.rating || '4.3'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-3">
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl px-4 py-2 font-medium"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    📞 Piga
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'labs') {
      return (
        <div className="mt-4 space-y-4">
          {items.map((lab: any) => (
            <div key={lab.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100 p-5 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-2xl shadow-lg">
                  <TestTube className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900">{lab.name}</h4>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {lab.address}
                  </p>
                  <div className="flex items-center mt-3 space-x-4">
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < Math.floor(lab.rating || 4.4) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 font-medium">{lab.rating || '4.4'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-3">
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl px-4 py-2 font-medium"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    📞 Piga
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

  const sidebarItems = [
    { icon: Home, label: 'Nyumbani', action: () => setShowSidebar(false) },
    { icon: Stethoscope, label: 'Madaktari', action: () => { setInput('🩺 Tafuta Daktari'); setShowSidebar(false); } },
    { icon: Hospital, label: 'Hospitali', action: () => { setInput('🏥 Tafuta Hospitali'); setShowSidebar(false); } },
    { icon: Pill, label: 'Dawa', action: () => { setInput('💊 Tafuta Dawa'); setShowSidebar(false); } },
    { icon: Calendar, label: 'Miadi', action: () => { setInput('📅 Ratiba Miadi'); setShowSidebar(false); } },
    { icon: TestTube, label: 'Maabara', action: () => { setInput('🔬 Tafuta Maabara'); setShowSidebar(false); } },
    { icon: MessageCircle, label: 'Maongezi', action: () => { setInput('📱 Chat na Daktari'); setShowSidebar(false); } },
    { icon: FileText, label: 'Rekodi', action: () => { setInput('📋 Medical Records'); setShowSidebar(false); } },
    { icon: Bell, label: 'Arifa', action: () => { setInput('🔔 Notifications'); setShowSidebar(false); } },
    { icon: Settings, label: 'Mipangilio', action: () => { setInput('⚙️ Settings'); setShowSidebar(false); } },
    { icon: LogOut, label: 'Toka', action: () => { setInput('Logout'); setShowSidebar(false); } }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-auto">
          <div className="absolute inset-0 bg-black/20 lg:hidden" onClick={() => setShowSidebar(false)} />
          <div className="relative w-80 h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-xl lg:shadow-none">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-500 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">TeleMed</h2>
                  <p className="text-sm text-gray-500">Healthcare Assistant</p>
                </div>
              </div>
              
              {user && (
                <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
                        {user.user_metadata?.first_name?.[0] || user.email?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.user_metadata?.first_name || 'User'}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="space-y-2">
                {sidebarItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:text-blue-600 rounded-xl transition-all duration-200"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="hidden lg:flex"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <Bot className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">TeleMed Assistant</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Avatar className={`w-10 h-10 ${message.type === 'user' ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}>
                  <AvatarFallback className="text-white">
                    {message.type === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex-1 max-w-3xl ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-4 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white' 
                      : 'bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-900'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                  </div>
                  
                  {/* Render data (doctors, hospitals, etc.) */}
                  {renderMessageData(message)}
                  
                  {/* Suggestions */}
                  {message.suggestions && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs bg-white/60 backdrop-blur-sm border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-full px-3 py-1"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {message.timestamp.toLocaleTimeString('sw-KE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-3">
                <Avatar className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500">
                  <AvatarFallback className="text-white">
                    <Bot className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Andika ujumbe wako hapa... (Mfano: Tafuta daktari wa moyo)"
                  className="pr-12 py-3 rounded-2xl border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 bg-white/70"
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isListening ? stopListening : startListening}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-blue-600'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white p-3 rounded-2xl"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">
                💡 Jaribu: "Tafuta daktari wa moyo" au "Hospitali karibu nami" au "Nataka dawa ya homa"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}