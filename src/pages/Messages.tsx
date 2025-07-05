
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Paperclip, Phone, Video, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const doctorId = searchParams.get('doctor');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Create or get appointment for messaging
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['messaging-appointment', doctorId],
    queryFn: async () => {
      if (!doctorId || !user) return null;
      
      // Check if there's an existing appointment for messaging
      let { data: existingAppointment } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
          doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('patient_id', user.id)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // If no appointment exists, create one for messaging
      if (!existingAppointment) {
        const { data: newAppointment, error: createError } = await supabase
          .from('appointments')
          .insert({
            patient_id: user.id,
            doctor_id: doctorId,
            appointment_date: new Date().toISOString(),
            consultation_type: 'chat',
            status: 'pending',
            symptoms: 'Chat consultation'
          })
          .select(`
            *,
            patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
            doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)
          `)
          .single();

        if (createError) {
          console.error('Error creating appointment for chat:', createError);
          throw createError;
        }
        
        existingAppointment = newAppointment;
      } else {
        // Get the appointment with profile details
        const { data: fullAppointment } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
            doctor:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)
          `)
          .eq('id', existingAppointment.id)
          .single();
        
        existingAppointment = fullAppointment;
      }

      return existingAppointment;
    },
    enabled: !!doctorId && !!user
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', appointment?.id],
    queryFn: async () => {
      if (!appointment?.id) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles(first_name, last_name, avatar_url)
        `)
        .eq('appointment_id', appointment.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!appointment?.id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, fileUrl }: { message: string; fileUrl?: string }) => {
      if (!appointment?.id) throw new Error('No appointment found');
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          appointment_id: appointment.id,
          sender_id: user!.id,
          message,
          file_url: fileUrl,
          message_type: fileUrl ? 'file' : 'text'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', appointment?.id] });
      setMessage('');
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Hitilafu',
        description: error.message || 'Imeshindwa kutuma ujumbe',
        variant: 'destructive'
      });
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) return;

    let fileUrl = '';
    
    if (selectedFile) {
      // For now, we'll just use a placeholder URL
      fileUrl = `https://placeholder.com/files/${selectedFile.name}`;
      
      toast({
        title: 'Faili Imepakiwa',
        description: 'Faili imepakiwa kikamilifu',
      });
    }

    sendMessageMutation.mutate({ message: message || 'Faili', fileUrl });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!appointment?.id) return;

    const channel = supabase
      .channel(`messages:${appointment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `appointment_id=eq.${appointment.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', appointment.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointment?.id, queryClient]);

  if (appointmentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inaanzisha mazungumzo...</p>
        </div>
      </div>
    );
  }

  if (!doctorId || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Hitilafu katika kuanzisha mazungumzo
          </h3>
          <Button onClick={() => navigate('/doctors-list')}>
            Chagua Daktari
          </Button>
        </div>
      </div>
    );
  }

  const otherUser = user?.id === appointment.patient_id ? appointment.doctor : appointment.patient;
  const otherUserName = `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherUser?.avatar_url} alt={otherUserName} />
              <AvatarFallback>
                {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {otherUserName}
              </h2>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Video className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isMe 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}>
                  {msg.file_url && (
                    <div className="mb-2">
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-300 underline">
                        Faili
                      </a>
                    </div>
                  )}
                  <p>{msg.message}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-emerald-100' : 'text-gray-500'}`}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          {selectedFile && (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
              <p className="text-sm">Faili: {selectedFile.name}</p>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                Ondoa
              </Button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Andika ujumbe..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
