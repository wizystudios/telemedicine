import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Star,
  Calendar,
  HeartPulse,
  Paperclip,
  Globe,
  Sparkles,
  AlertTriangle
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
  isEmergency?: boolean;
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
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const analyzeSymptoms = async (symptoms: string): Promise<Message> => {
    try {
      const { data, error } = await supabase.functions.invoke('symptom-checker', {
        body: { symptoms }
      });

      if (error) throw error;

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: data.analysis || 'Samahani, sijaweza kuchambua dalili zako.',
        timestamp: new Date(),
        data: data.specialists ? { type: 'specialists', items: data.specialists } : undefined,
        isEmergency: data.isEmergency,
        suggestions: ['🩺 Pata Daktari', '🏥 Hospitali', '💊 Dawa']
      };
    } catch (error) {
      console.error('Symptom analysis error:', error);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Samahani, kuna tatizo la mfumo. Tafadhali jaribu tena.',
        timestamp: new Date()
      };
    }
  };

  const processMessage = async (message: string): Promise<Message> => {
    const lowerMessage = message.toLowerCase();
    
    // Check for symptom-related keywords
    const symptomKeywords = ['maumivu', 'homa', 'kichwa', 'tumbo', 'kifua', 'kikohozi', 'kizunguzungu', 'pain', 'headache', 'fever', 'stomach', 'cough', 'sick', 'nina', 'ninahisi'];
    const hasSymptoms = symptomKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasSymptoms) {
      return await analyzeSymptoms(message);
    }
    
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
        suggestions: ['📅 Ratiba Miadi', '🔙 Nyingine']
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
      content: 'Karibu TeleMed! Niambie dalili zako au tafuta huduma za afya.',
      timestamp: new Date(),
      suggestions: ['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🔬 Maabara']
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

    if (type === 'specialists' || type === 'doctors') {
      return (
        <div className="space-y-2 mt-3">
          {items.map((doc: any, idx: number) => (
            <Card key={doc.id || idx} className="bg-secondary/50 border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-primary/20">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">
                    {doc.name || `Dr. ${doc.first_name || ''} ${doc.last_name || ''}`}
                  </p>
                  {doc.specialty && (
                    <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>4.8</span>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleBookAppointment(doc.id)}>
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
            <Card key={h.id} className="bg-secondary/50 border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Building className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {h.address}
                  </p>
                </div>
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
            <Card key={p.id} className="bg-secondary/50 border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Pill className="h-5 w-5 text-purple-400" />
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
            <Card key={l.id} className="bg-secondary/50 border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <TestTube className="h-5 w-5 text-teal-400" />
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

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Nav */}
      <nav className="w-full flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">TeleMed</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Ingia
              </Button>
              <Button size="sm" onClick={() => navigate('/auth')}>
                Jiandikishe
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {!hasMessages ? (
          /* Empty State - Centered */
          <div className="w-full max-w-2xl text-center animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-8">
              Ninaweza kukusaidiaje?
            </h1>
            
            {/* Chat Input */}
            <div className="bg-chat-input rounded-2xl border border-border/50 p-2">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Eleza dalili zako au uliza chochote..."
                  className="flex-1 bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[24px] max-h-[120px] py-2 px-2 text-sm"
                  rows={1}
                />
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  size="sm"
                  variant={isListening ? 'destructive' : 'secondary'}
                  className={`gap-1.5 ${isListening ? 'voice-recording' : ''}`}
                  onClick={input.trim() ? handleSend : toggleListening}
                >
                  {input.trim() ? (
                    <>
                      <Send className="h-4 w-4" />
                      Tuma
                    </>
                  ) : (
                    <>
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      Sauti
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['🩺 Daktari', '🏥 Hospitali', '💊 Dawa', '🔬 Maabara'].map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setInput(action.replace(/[^\w\s]/gi, ''))}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat View */
          <div className="w-full max-w-2xl flex-1 flex flex-col py-4">
            <div className="flex-1 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] ${msg.type === 'user' ? '' : 'flex gap-2'}`}>
                    {msg.type === 'bot' && (
                      <Avatar className="h-7 w-7 mt-0.5 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      {msg.isEmergency && (
                        <div className="flex items-center gap-2 mb-2 text-destructive text-xs font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          DHARURA - Tafadhali tafuta msaada haraka!
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        msg.type === 'user'
                          ? 'bg-chat-user text-foreground'
                          : 'bg-chat-bot border border-border/50'
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
                              className="rounded-full text-xs h-7"
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
                <div className="flex gap-2 animate-fade-in">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-chat-bot border border-border/50 rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input at bottom when chatting */}
            <div className="mt-4 bg-chat-input rounded-2xl border border-border/50 p-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Andika ujumbe..."
                  className="flex-1 bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[24px] max-h-[120px] py-2 px-2 text-sm"
                  rows={1}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-3 text-xs text-muted-foreground border-t border-border/30">
        Kwa kutumia TeleMed, unakubali <a href="#" className="underline hover:text-foreground">Masharti</a> na <a href="#" className="underline hover:text-foreground">Sera ya Faragha</a>.
      </footer>
    </div>
  );
}
