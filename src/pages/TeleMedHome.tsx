import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  HeartHandshake,
  Shield,
  Star,
  Users,
  Building,
  Clock
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

// Speech Recognition types
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
      content: 'Karibu! Ninaweza kukusaidia kupata:',
      timestamp: new Date(),
      suggestions: [
        '🩺 Find Doctor',
        '🏥 Find Hospital', 
        '💊 Find Pharmacy',
        '🔬 Find Laboratory',
        '🆘 First Aid'
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
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Speech Recognition Error",
          description: "Could not recognize speech. Please try again.",
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
    if (lowerMessage.includes('doctor') || lowerMessage.includes('daktari') || lowerMessage.includes('find doctor')) {
      const doctors = await searchDoctors(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: doctors.length > 0 
          ? `Found ${doctors.length} available doctors. Here are your options:`
          : 'Sorry, no doctors are currently available.',
        timestamp: new Date(),
        data: { type: 'doctors', items: doctors }
      };
    }

    // Hospital search
    if (lowerMessage.includes('hospital') || lowerMessage.includes('find hospital')) {
      const hospitals = await searchHospitals(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: hospitals.length > 0 
          ? `Found ${hospitals.length} hospitals near you:`
          : 'Sorry, no hospitals found.',
        timestamp: new Date(),
        data: { type: 'hospitals', items: hospitals }
      };
    }

    // Pharmacy search
    if (lowerMessage.includes('pharmacy') || lowerMessage.includes('medicine') || lowerMessage.includes('find pharmacy')) {
      const pharmacies = await searchPharmacies(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: pharmacies.length > 0 
          ? `Found ${pharmacies.length} pharmacies:`
          : 'Sorry, no pharmacies found.',
        timestamp: new Date(),
        data: { type: 'pharmacies', items: pharmacies }
      };
    }

    // Lab search
    if (lowerMessage.includes('laboratory') || lowerMessage.includes('lab') || lowerMessage.includes('test')) {
      const labs = await searchLabs(message);
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: labs.length > 0 
          ? `Found ${labs.length} laboratories:`
          : 'Sorry, no laboratories found.',
        timestamp: new Date(),
        data: { type: 'labs', items: labs }
      };
    }

    // Appointment booking
    if (lowerMessage.includes('appointment') || lowerMessage.includes('book')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'To book an appointment, please select a doctor from the list or tell me your preferred specialty.',
        timestamp: new Date(),
        suggestions: ['Find Doctor', 'Heart Specialist', 'Skin Doctor', 'Mental Health']
      };
    }

    // First aid
    if (lowerMessage.includes('first aid') || lowerMessage.includes('emergency') || lowerMessage.includes('help')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: '🚨 For emergencies, call 911 immediately!\n\nFirst Aid Quick Tips:\n• Cuts - Clean and cover\n• Fever - Stay hydrated\n• Pain - Rest and medication\n• Breathing problems - Call emergency\n\nWhat specific help do you need?',
        timestamp: new Date(),
        suggestions: ['Emergency Call', 'Wound Care', 'Fever Help', 'Pain Relief']
      };
    }

    // General greeting
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Hello! Welcome to TeleMed Smart Chatbot. I\'m here to help you with all your healthcare needs. How can I assist you today?',
        timestamp: new Date(),
        suggestions: ['Find Doctor', 'Find Hospital', 'Find Pharmacy', 'First Aid Help']
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: 'I can help you find doctors, hospitals, pharmacies, laboratories, provide first aid guidance, or book appointments. What would you like to do?',
      timestamp: new Date(),
      suggestions: ['Find Doctor', 'Find Hospital', 'Find Pharmacy', 'First Aid Help']
    };
  };

  const searchDoctors = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, country, avatar_url')
        .eq('role', 'doctor')
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const specializations = ['Familia', 'Moyo', 'Ngozi', 'Watoto', 'Akili', 'Mifupa', 'Wanawake', 'Macho'];
      
      return data.map((doctor, idx) => ({
        id: doctor.id,
        profiles: {
          id: doctor.id,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          avatar_url: doctor.avatar_url
        },
        specialties: {
          name: specializations[idx % specializations.length]
        },
        rating: 4.0 + (Math.random() * 1.0),
        is_available: true
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
        .order('is_promoted', { ascending: false })
        .limit(3);

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
        .limit(3);

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
        .limit(3);

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
      const botResponse = await processMessage(input);
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
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

  const handleBookAppointment = (doctorId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book an appointment.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    navigate(`/book-appointment?doctorId=${doctorId}`);
  };

  const renderMessageData = (message: Message) => {
    if (!message.data) return null;

    const { type, items } = message.data;

    if (type === 'doctors') {
      return (
        <div className="mt-3 space-y-3">
          {items.map((doctor: any) => (
            <Card key={doctor.id} className="border shadow-medical hover:shadow-medical-strong transition-all">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-medical-light-blue text-medical-blue">
                      <Stethoscope className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                    </h4>
                    <p className="text-sm text-medical-gray">{doctor.specialties?.name}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <Star className="h-4 w-4 text-medical-warning fill-current" />
                      <span className="text-sm text-medical-gray">{doctor.rating || '4.8'}</span>
                      <Badge className="bg-medical-light-green text-medical-green">Available</Badge>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleBookAppointment(doctor.id)}
                    className="bg-medical-blue hover:bg-medical-blue/90"
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
            <Card key={hospital.id} className="border shadow-medical hover:shadow-medical-strong transition-all">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-medical-light-green rounded-lg">
                    <Building className="h-6 w-6 text-medical-green" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{hospital.name}</h4>
                    <p className="text-sm text-medical-gray mt-1">{hospital.address}</p>
                    <div className="flex items-center mt-2 space-x-2">
                      <Star className="h-4 w-4 text-medical-warning fill-current" />
                      <span className="text-sm text-medical-gray">{hospital.rating || '4.5'}</span>
                      {hospital.is_promoted && (
                        <Badge className="bg-medical-light-blue text-medical-blue">Featured</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" className="bg-medical-green hover:bg-medical-green/90">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
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
    <div className="min-h-screen bg-medical-gradient-light">
      {/* Header */}
      <div className="bg-background border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HeartHandshake className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">TeleMed</h1>
          </div>
          
          {!user ? (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>Login</Button>
              <Button size="sm" onClick={() => navigate('/auth')}>Sign Up</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
          )}
        </div>
      </div>

      {/* Main Chatbot Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Chatbot Interface */}
          <Card className="bg-white shadow-medical-strong h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="bg-medical-gradient text-white p-4 rounded-t-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">TeleMed Smart Assistant</h3>
                  <p className="text-sm opacity-90">Ask me anything about healthcare</p>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={message.type === 'user' ? 'bg-medical-light-blue text-medical-blue' : 'bg-medical-light-green text-medical-green'}>
                          {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`rounded-lg p-3 ${
                        message.type === 'user' 
                          ? 'bg-medical-blue text-white' 
                          : 'bg-muted text-foreground'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {renderMessageData(message)}
                        
                        {message.suggestions && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="text-xs h-7"
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
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-medical-light-green text-medical-green">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-medical-gray rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-medical-gray rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-medical-gray rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Input Area */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex space-x-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about doctors, hospitals, or health questions..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={isListening ? stopListening : startListening}
                  className={isListening ? 'bg-medical-error text-white' : ''}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-medical-blue hover:bg-medical-blue/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}