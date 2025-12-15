import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  Stethoscope,
  Building,
  Pill,
  TestTube,
  MapPin,
  Phone,
  Star,
  Calendar,
  HeartPulse,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: any;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function TeleMedHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Karibu TeleMed! 👋\nNisaidie kupata huduma za afya.',
      timestamp: new Date(),
      suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Duka la Dawa', '🔬 Maabara']
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'sw-TZ';

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (recognition.current) {
      if (isListening) {
        recognition.current.stop();
      } else {
        recognition.current.start();
      }
      setIsListening(!isListening);
    }
  };

  const processMessage = async (message: string): Promise<Message> => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('daktari') || lowerMessage.includes('doctor')) {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('role', 'doctor')
        .limit(5);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Nimepata madaktari ${data.length}:` : 'Hakuna daktari sasa hivi.',
        timestamp: new Date(),
        data: data?.length ? { type: 'doctors', items: data } : undefined,
        suggestions: ['📅 Ratiba Miadi', '🔙 Rudi Nyuma']
      };
    }

    if (lowerMessage.includes('hospitali') || lowerMessage.includes('hospital')) {
      const { data } = await supabase
        .from('hospitals')
        .select('*')
        .eq('is_verified', true)
        .limit(5);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Hospitali ${data.length}:` : 'Hakuna hospitali.',
        timestamp: new Date(),
        data: data?.length ? { type: 'hospitals', items: data } : undefined
      };
    }

    if (lowerMessage.includes('dawa') || lowerMessage.includes('pharmacy')) {
      const { data } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('is_verified', true)
        .limit(5);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Maduka ya dawa ${data.length}:` : 'Hakuna maduka.',
        timestamp: new Date(),
        data: data?.length ? { type: 'pharmacies', items: data } : undefined
      };
    }

    if (lowerMessage.includes('maabara') || lowerMessage.includes('lab')) {
      const { data } = await supabase
        .from('laboratories')
        .select('*')
        .eq('is_verified', true)
        .limit(5);
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data?.length ? `Maabara ${data.length}:` : 'Hakuna maabara.',
        timestamp: new Date(),
        data: data?.length ? { type: 'labs', items: data } : undefined
      };
    }

    return {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Nisaidie kupata daktari, hospitali, duka la dawa, au maabara.',
      timestamp: new Date(),
      suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Duka la Dawa', '🔬 Maabara']
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

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

  const handleBookAppointment = (doctorId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate(`/book-appointment?doctorId=${doctorId}`);
  };

  const renderData = (data: any) => {
    if (!data) return null;
    
    const { type, items } = data;

    if (type === 'doctors') {
      return (
        <div className="space-y-2 mt-3">
          {items.map((doc: any) => (
            <Card key={doc.id} className="bg-white/80 backdrop-blur border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-11 w-11 bg-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Dr. {doc.first_name} {doc.last_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>4.8</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">Available</Badge>
                  </div>
                </div>
                <Button size="sm" className="h-8 px-3" onClick={() => handleBookAppointment(doc.id)}>
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Book
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (type === 'hospitals') {
      return (
        <div className="space-y-2 mt-3">
          {items.map((h: any) => (
            <Card key={h.id} className="bg-white/80 backdrop-blur border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-green-100 flex items-center justify-center">
                  <Building className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {h.address}
                  </p>
                </div>
                {h.phone && (
                  <Button size="sm" variant="outline" className="h-8">
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (type === 'pharmacies') {
      return (
        <div className="space-y-2 mt-3">
          {items.map((p: any) => (
            <Card key={p.id} className="bg-white/80 backdrop-blur border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-purple-100 flex items-center justify-center">
                  <Pill className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {p.address}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (type === 'labs') {
      return (
        <div className="space-y-2 mt-3">
          {items.map((l: any) => (
            <Card key={l.id} className="bg-white/80 backdrop-blur border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-teal-100 flex items-center justify-center">
                  <TestTube className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {l.address}
                  </p>
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
    <div className="h-screen flex flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b safe-area-top">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">TeleMed</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="font-medium"
          onClick={() => navigate('/auth')}
        >
          {user ? 'Dashboard' : 'Ingia'}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.type === 'user' ? '' : 'flex gap-2'}`}>
              {msg.type === 'bot' && (
                <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
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
                        className="rounded-full h-8 text-xs bg-background hover:bg-primary/5"
                        onClick={() => setInput(s.replace(/[^\w\s]/gi, ''))}
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
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t safe-area-bottom">
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
      </div>
    </div>
  );
}
