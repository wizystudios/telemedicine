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
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardContent className="p-0">
        {/* Chat Header */}
        <div className="bg-primary p-3 flex items-center gap-2 rounded-t-lg">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary-foreground text-primary">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-primary-foreground">TeleMed Assistant</h3>
            <p className="text-xs text-primary-foreground/80">Online • Tayari kusaidia</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="h-[400px] overflow-y-auto p-3 space-y-3 bg-muted/20">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                {msg.type === 'bot' && (
                  <div className="flex items-start gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-card rounded-lg p-2 shadow-sm border">
                        <p className="text-sm text-foreground">{msg.content}</p>
                        {renderMessageData(msg)}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {msg.timestamp.toLocaleTimeString('sw-TZ', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                )}
                
                {msg.type === 'user' && (
                  <div>
                    <div className="bg-primary text-primary-foreground rounded-lg p-2 shadow-sm">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block text-right">
                      {msg.timestamp.toLocaleTimeString('sw-TZ', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card rounded-lg p-2 shadow-sm border">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-3 bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Andika ujumbe..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 h-9 text-sm"
              disabled={isLoading}
            />
            <Button
              size="sm"
              variant={isListening ? "destructive" : "outline"}
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className="h-9 w-9 p-0"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="h-9 w-9 p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
