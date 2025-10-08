import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, MicOff } from 'lucide-react';
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
}

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
      content: 'Karibu TeleMed! Ninaweza kukusaidia na:',
      timestamp: new Date(),
      suggestions: [
        '🩺 Daktari',
        '🏥 Hospitali', 
        '💊 Dawa',
        '📅 Miadi',
        '🔬 Maabara',
        '🆘 Msaada',
        '📱 Chat',
        '⚙️ Settings'
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
    
    if (lowerMessage.includes('daktari') || lowerMessage.includes('doctor') || lowerMessage.includes('find') || lowerMessage.includes('🩺')) {
      const doctors = await searchDoctors(message);
      if (doctors.length === 0) {
        return {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Samahani, hakuna madaktari waliopo kwa sasa.',
          timestamp: new Date(),
          suggestions: ['🏥 Hospitali', '🆘 Msaada']
        };
      }
      
      let content = `Nimepata madaktari ${doctors.length}:\n\n`;
      doctors.forEach((doc: any, idx: number) => {
        content += `${idx + 1}. Dr. ${doc.first_name} ${doc.last_name}\n`;
        content += `   ${doc.specialization}\n`;
        content += `   ⭐ ${doc.rating.toFixed(1)}\n`;
        content += `   📍 ${doc.location}\n`;
        if (doc.phone) content += `   📞 ${doc.phone}\n`;
        content += `\n`;
      });
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content,
        timestamp: new Date(),
        suggestions: ['📅 Miadi', '🏥 Hospitali', '💊 Dawa']
      };
    }

    if (lowerMessage.includes('hospitali') || lowerMessage.includes('hospital') || lowerMessage.includes('🏥')) {
      const hospitals = await searchHospitals(message);
      if (hospitals.length === 0) {
        return {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Samahani, hakuna hospitali zilizopo kwa sasa.',
          timestamp: new Date(),
          suggestions: ['🩺 Daktari', '💊 Dawa']
        };
      }
      
      let content = `Nimepata hospitali ${hospitals.length}:\n\n`;
      hospitals.forEach((h: any, idx: number) => {
        content += `${idx + 1}. ${h.name}\n`;
        content += `   📍 ${h.address}\n`;
        if (h.phone) content += `   📞 ${h.phone}\n`;
        content += `\n`;
      });
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content,
        timestamp: new Date(),
        suggestions: ['🩺 Daktari', '💊 Dawa', '📅 Miadi']
      };
    }

    if (lowerMessage.includes('dawa') || lowerMessage.includes('pharmacy') || lowerMessage.includes('pharmasi') || lowerMessage.includes('💊')) {
      const pharmacies = await searchPharmacies(message);
      if (pharmacies.length === 0) {
        return {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Samahani, hakuna maduka ya dawa yaliyopo.',
          timestamp: new Date(),
          suggestions: ['🩺 Daktari', '🏥 Hospitali']
        };
      }
      
      let content = `Nimepata maduka ya dawa ${pharmacies.length}:\n\n`;
      pharmacies.forEach((p: any, idx: number) => {
        content += `${idx + 1}. ${p.name}\n`;
        content += `   📍 ${p.address}\n`;
        if (p.phone) content += `   📞 ${p.phone}\n`;
        content += `\n`;
      });
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content,
        timestamp: new Date(),
        suggestions: ['🩺 Daktari', '🏥 Hospitali']
      };
    }

    if (lowerMessage.includes('lab') || lowerMessage.includes('upimaji') || lowerMessage.includes('laboratory') || lowerMessage.includes('🔬')) {
      const labs = await searchLabs(message);
      if (labs.length === 0) {
        return {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Samahani, hakuna maabara yaliyopo.',
          timestamp: new Date(),
          suggestions: ['🩺 Daktari', '🏥 Hospitali']
        };
      }
      
      let content = `Nimepata maabara ${labs.length}:\n\n`;
      labs.forEach((l: any, idx: number) => {
        content += `${idx + 1}. ${l.name}\n`;
        content += `   📍 ${l.address}\n`;
        if (l.phone) content += `   📞 ${l.phone}\n`;
        content += `\n`;
      });
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content,
        timestamp: new Date(),
        suggestions: ['🩺 Daktari', '📅 Miadi']
      };
    }

    if (lowerMessage.includes('miadi') || lowerMessage.includes('appointment') || lowerMessage.includes('ratiba') || lowerMessage.includes('📅')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Kwa kuratibu miadi:\n\n1. Chagua Daktari\n2. Chagua Siku\n3. Chagua Muda\n\nAnza na kutafuta daktari.',
        timestamp: new Date(),
        suggestions: ['🩺 Daktari', '🏥 Hospitali']
      };
    }

    if (lowerMessage.includes('records') || lowerMessage.includes('rekodi') || lowerMessage.includes('history') || lowerMessage.includes('📋')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Medical Records:\n\n• Historia ya Magonjwa\n• Dawa za Sasa\n• Matokeo ya Maabara\n• Miadi ya Awali\n\nUnataka kuona nini?',
        timestamp: new Date(),
        suggestions: ['Historia', 'Dawa', 'Matokeo', 'Miadi']
      };
    }

    if (lowerMessage.includes('settings') || lowerMessage.includes('mipangilio') || lowerMessage.includes('⚙️')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Mipangilio:\n\n• Profile\n• Arifa\n• Lugha\n• Privacy\n• Account\n\nUnataka kubadilisha nini?',
        timestamp: new Date(),
        suggestions: ['Profile', 'Arifa', 'Lugha', 'Logout']
      };
    }

    if (lowerMessage.includes('maongezi') || lowerMessage.includes('chat') || lowerMessage.includes('message') || lowerMessage.includes('📱')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Maongezi na Madaktari:\n\n• Daktari wako wa kawaida\n• Daktari yoyote online\n• Mshauri wa afya\n\nNani unataka kuongea naye?',
        timestamp: new Date(),
        suggestions: ['Daktari wangu', 'Online', 'Tafuta']
      };
    }

    if (lowerMessage.includes('msaada') || lowerMessage.includes('first aid') || lowerMessage.includes('dharura') || lowerMessage.includes('🆘')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '🚨 Kwa Dharura: Piga 999!\n\nMsaada wa Haraka:\n• Jeraha - Safisha na funika\n• Homa - Maji mengi\n• Kichwa - Pumzika\n• Tumbo - Maji\n• Kupumua - Kaa wima\n\nUna tatizo gani?',
        timestamp: new Date(),
        suggestions: ['Jeraha', 'Homa', 'Kichwa', 'Piga 999']
      };
    }

    if (lowerMessage.includes('hujambo') || lowerMessage.includes('hello') || lowerMessage.includes('mambo') || lowerMessage.includes('habari')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Hujambo! Ninaweza kukusaidia aje leo?',
        timestamp: new Date(),
        suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🆘 Msaada']
      };
    }

    if (lowerMessage.includes('logout') || lowerMessage.includes('toka') || lowerMessage.includes('ondoka')) {
      await signOut();
      navigate('/auth');
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Umeondoka. Asante!',
        timestamp: new Date()
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Ninaweza kukusaidia na:\n\n🩺 Madaktari\n🏥 Hospitali\n💊 Dawa\n📅 Miadi\n🔬 Maabara\n🆘 Msaada\n📱 Chat\n\nJaribu moja ya hivi...',
      timestamp: new Date(),
      suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🆘 Msaada']
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

  const searchHospitals = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('is_verified', true)
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
        content: 'Samahani, kuna tatizo. Jaribu tena.',
        timestamp: new Date(),
        suggestions: ['🩺 Daktari', '🏥 Hospitali', '🆘 Msaada']
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-2xl px-4 py-2.5 shadow-sm`}>
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 text-xs bg-background/80 hover:bg-background rounded-full border transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Andika ujumbe..."
            className="flex-1 rounded-full"
            disabled={isLoading}
          />
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            className="rounded-full"
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
