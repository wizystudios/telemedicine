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
  Image as ImageIcon,
  Paperclip,
  MapPin,
  Phone,
  Clock,
  Stethoscope,
  Calendar,
  Pill,
  AlertCircle,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  isVoice?: boolean;
  audioUrl?: string;
  imageUrl?: string;
  data?: {
    type: 'doctors' | 'hospitals' | 'pharmacies' | 'quick-replies';
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
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      content: "Hi! How can I help you today?",
      type: 'bot',
      timestamp: new Date(),
      data: {
        type: 'quick-replies',
        items: [
          { id: 'find-doctor', label: 'Find Doctor', icon: 'stethoscope' },
          { id: 'book-appointment', label: 'Book Appointment', icon: 'calendar' },
          { id: 'find-pharmacy', label: 'Find Pharmacy', icon: 'pill' },
          { id: 'emergency', label: 'Emergency', icon: 'alert' }
        ]
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const userMessage: Message = {
          content: '🎤 Voice message',
          type: 'user',
          timestamp: new Date(),
          isVoice: true,
          audioUrl
        };

        setMessages(prev => [...prev, userMessage]);
        setShowQuickReplies(false);
        setIsLoading(true);
        
        // Simulate processing
        setTimeout(() => {
          const botResponse: Message = {
            content: "I received your voice message. How can I help you?",
            type: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botResponse]);
          setIsLoading(false);
        }, 1000);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file under 5MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleQuickReply = async (action: string) => {
    let messageText = '';
    switch (action) {
      case 'find-doctor':
        messageText = 'I need to find a doctor';
        break;
      case 'book-appointment':
        messageText = 'I want to book an appointment';
        break;
      case 'find-pharmacy':
        messageText = 'Show me nearby pharmacies';
        break;
      case 'emergency':
        messageText = 'I need emergency help';
        break;
    }
    
    setInput(messageText);
    setTimeout(() => handleSendMessage(), 100);
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
    if (!input.trim() && !selectedFile) return;

    let imageUrl = '';
    
    if (selectedFile) {
      imageUrl = URL.createObjectURL(selectedFile);
    }

    const userMessage: Message = {
      content: input || '📎 Attachment',
      type: 'user',
      timestamp: new Date(),
      imageUrl
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedFile(null);
    setShowQuickReplies(false);
    setIsLoading(true);

    const botResponse = await processMessage(input || 'attachment');
    setMessages(prev => [...prev, botResponse]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderQuickReplies = (items: any[]) => {
    if (!showQuickReplies) return null;
    
    const getIcon = (iconName: string) => {
      switch (iconName) {
        case 'stethoscope': return <Stethoscope className="h-4 w-4" />;
        case 'calendar': return <Calendar className="h-4 w-4" />;
        case 'pill': return <Pill className="h-4 w-4" />;
        case 'alert': return <AlertCircle className="h-4 w-4" />;
        default: return null;
      }
    };

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {items.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            size="sm"
            onClick={() => handleQuickReply(item.id)}
            className="rounded-full border-primary/20 hover:bg-primary/10 hover:border-primary"
          >
            {getIcon(item.icon)}
            <span className="ml-1.5">{item.label}</span>
          </Button>
        ))}
      </div>
    );
  };

  const renderMessageData = (message: Message) => {
    if (!message.data) return null;

    const { type, items } = message.data;

    if (type === 'quick-replies') {
      return renderQuickReplies(items);
    }

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
    <div className="flex flex-col h-full w-full bg-white">
      {/* Messages Area - iPhone iMessage Style */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.type === 'bot' && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className={`max-w-[70%] flex flex-col gap-0.5`}>
              <div
                className={`
                  px-4 py-2.5 rounded-[18px] shadow-sm
                  ${msg.type === 'user' 
                    ? 'bg-[#34C759] text-white rounded-br-sm' 
                    : 'bg-[#E9E9EB] text-gray-900 rounded-bl-sm'
                  }
                `}
              >
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Shared" 
                    className="rounded-lg mb-2 max-w-full h-auto"
                  />
                )}
                {msg.isVoice && msg.audioUrl && (
                  <audio controls className="w-full max-w-xs mb-1">
                    <source src={msg.audioUrl} type="audio/webm" />
                  </audio>
                )}
                <p className="text-[15px] leading-[1.4]">{msg.content}</p>
                {renderMessageData(msg)}
              </div>
              <span className={`text-[11px] text-gray-500 px-2 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-end gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500">
                <Bot className="h-4 w-4 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-[#E9E9EB] rounded-[18px] rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-3 py-2 border-t bg-gray-50">
          <div className="flex items-center gap-2 bg-white rounded-lg p-2 max-w-xs">
            <ImageIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area - iPhone iMessage Style */}
      <div className="border-t bg-white px-2 py-2">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 rounded-full flex-shrink-0 text-gray-600 hover:bg-gray-100"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 bg-gray-100 rounded-[20px] px-3 py-1.5 min-h-[36px] flex items-center">
            <Input
              placeholder="iMessage"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border-0 bg-transparent p-0 h-auto text-[16px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
              disabled={isLoading}
            />
          </div>

          {input.trim() || selectedFile ? (
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={isLoading}
              className="h-8 w-8 rounded-full flex-shrink-0 bg-[#007AFF] hover:bg-[#0056b3]"
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isLoading}
              className={`h-8 w-8 rounded-full flex-shrink-0 ${
                isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
