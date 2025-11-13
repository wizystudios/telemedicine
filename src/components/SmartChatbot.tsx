import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff,
  MapPin,
  Phone,
  Star,
  Clock,
  Stethoscope
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  data?: {
    type: 'doctors' | 'hospitals' | 'pharmacies';
    items: any[];
  };
}

interface SmartChatbotProps {
  onBookAppointment?: (doctorId: string) => void;
  onViewHospital?: (hospitalId: string) => void;
  onViewPharmacy?: (pharmacyId: string) => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function SmartChatbot({ 
  onBookAppointment, 
  onViewHospital, 
  onViewPharmacy 
}: SmartChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      content: "Habari! Nikusaidie nini? Uliza kuhusu madaktari, hospitali, au dawa.",
      type: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'sw-TZ';

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
      };
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Search doctors
    if (lowerMessage.includes('daktari') || lowerMessage.includes('doctor')) {
      const { data: doctors } = await supabase
        .from('doctor_profiles')
        .select('*, profiles(full_name, avatar_url, phone)')
        .eq('is_available', true)
        .limit(3);

      if (doctors && doctors.length > 0) {
        return {
          content: `${doctors.length} madaktari wanapatikana:`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'doctors', items: doctors }
        };
      }
    }

    // Search hospitals
    if (lowerMessage.includes('hospitali') || lowerMessage.includes('hospital')) {
      const { data: hospitals } = await supabase
        .from('hospitals')
        .select('*')
        .eq('is_verified', true)
        .limit(3);

      if (hospitals && hospitals.length > 0) {
        return {
          content: `${hospitals.length} hospitali:`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'hospitals', items: hospitals }
        };
      }
    }

    // Search pharmacies
    if (lowerMessage.includes('dawa') || lowerMessage.includes('pharmacy')) {
      const { data: pharmacies } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('is_verified', true)
        .limit(3);

      if (pharmacies && pharmacies.length > 0) {
        return {
          content: `${pharmacies.length} maduka ya dawa:`,
          type: 'bot',
          timestamp: new Date(),
          data: { type: 'pharmacies', items: pharmacies }
        };
      }
    }

    return {
      content: "Samahani, sijaeleweka. Uliza kuhusu madaktari, hospitali, au dawa.",
      type: 'bot',
      timestamp: new Date()
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      content: input,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const botResponse = await processMessage(input);
    setMessages(prev => [...prev, botResponse]);
    setIsLoading(false);
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
        <div className="space-y-2 mt-2">
          {items.map((doctor: any) => (
            <Card key={doctor.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={doctor.profiles?.avatar_url} />
                    <AvatarFallback><Stethoscope className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{doctor.profiles?.full_name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs py-0">
                        <Clock className="h-3 w-3 mr-1" />
                        {doctor.consultation_fee ? `Tsh ${doctor.consultation_fee}` : 'N/A'}
                      </Badge>
                      {doctor.is_available && (
                        <Badge variant="default" className="text-xs py-0">Online</Badge>
                      )}
                    </div>
                    {onBookAppointment && (
                      <Button 
                        size="sm" 
                        className="w-full mt-2 h-7 text-xs"
                        onClick={() => onBookAppointment(doctor.id)}
                      >
                        Ratiba Miadi
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (type === 'hospitals') {
      return (
        <div className="space-y-2 mt-2">
          {items.map((hospital: any) => (
            <Card key={hospital.id} className="overflow-hidden">
              <CardContent className="p-3">
                <h4 className="font-semibold text-sm truncate">{hospital.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{hospital.location}</span>
                </div>
                {hospital.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    <span>{hospital.phone}</span>
                  </div>
                )}
                {onViewHospital && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-2 h-7 text-xs"
                    onClick={() => onViewHospital(hospital.id)}
                  >
                    Tazama Zaidi
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
        <div className="space-y-2 mt-2">
          {items.map((pharmacy: any) => (
            <Card key={pharmacy.id} className="overflow-hidden">
              <CardContent className="p-3">
                <h4 className="font-semibold text-sm truncate">{pharmacy.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{pharmacy.location}</span>
                </div>
                {pharmacy.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    <span>{pharmacy.phone}</span>
                  </div>
                )}
                {onViewPharmacy && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-2 h-7 text-xs"
                    onClick={() => onViewPharmacy(pharmacy.id)}
                  >
                    Tazama Zaidi
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Messages Area - iPhone iMessage Style */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: 'hsl(var(--background))' }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.type === 'bot' && (
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className={`max-w-[75%] ${msg.type === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`
                  px-4 py-2.5 rounded-[20px] shadow-sm
                  ${msg.type === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-muted/80 text-foreground rounded-bl-md'
                  }
                `}
              >
                <p className="text-[15px] leading-relaxed">{msg.content}</p>
                {renderMessageData(msg)}
              </div>
              <span className={`text-[11px] text-muted-foreground px-2 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-end gap-2">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback className="bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted/80 rounded-[20px] rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - iPhone iMessage Style */}
      <div className="border-t bg-background/95 backdrop-blur-sm px-2 py-2 safe-bottom">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <Button
            size="icon"
            variant="ghost"
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            className="h-9 w-9 rounded-full flex-shrink-0 text-primary hover:bg-primary/10"
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1 bg-muted/50 rounded-[20px] px-4 py-2 min-h-[36px] flex items-center">
            <Input
              placeholder="iMessage"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border-0 bg-transparent p-0 h-auto text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
              disabled={isLoading}
            />
          </div>

          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="h-9 w-9 rounded-full flex-shrink-0 bg-primary hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
