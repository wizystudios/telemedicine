import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, ArrowLeft, Download, Play, Pause, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ContactsList from '@/components/ContactsList';
import { EnhancedChatInput } from '@/components/EnhancedChatInput';

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const doctorId = searchParams.get('doctor');
  const patientId = searchParams.get('patient');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const otherUserId = doctorId || patientId;

  // Get other user details
  const { data: otherUser } = useQuery({
    queryKey: ['user-profile', otherUserId],
    queryFn: async () => {
      if (!otherUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!otherUserId
  });

  // Get current user profile for notifications
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Get or create conversation (appointment)
  const { data: conversation } = useQuery({
    queryKey: ['conversation', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return null;

      // First, try to find existing appointment between these users
      const { data: existingAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .or(`and(patient_id.eq.${user.id},doctor_id.eq.${otherUserId}),and(patient_id.eq.${otherUserId},doctor_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (appointmentError && appointmentError.code !== 'PGRST116') {
        throw appointmentError;
      }

      if (existingAppointment) {
        return existingAppointment;
      }

      // If no appointment exists, create one for messaging
      const isUserPatient = currentUserProfile?.role === 'patient';
      const { data: newAppointment, error: createError } = await supabase
        .from('appointments')
        .insert({
          patient_id: isUserPatient ? user.id : otherUserId,
          doctor_id: isUserPatient ? otherUserId : user.id,
          appointment_date: new Date().toISOString(),
          status: 'scheduled',
          consultation_type: 'chat',
          notes: 'Chat conversation'
        })
        .select()
        .single();

      if (createError) throw createError;
      return newAppointment;
    },
    enabled: !!user?.id && !!otherUserId && !!currentUserProfile
  });

  // Get messages for this conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('appointment_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!conversation?.id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ messageText, files }: { messageText: string; files: File[] }) => {
      if (!conversation?.id || (!messageText.trim() && files.length === 0)) return;

      const messagesToSend = [];

      // Send text message if exists
      if (messageText.trim()) {
        messagesToSend.push({
          appointment_id: conversation.id,
          sender_id: user?.id,
          message: messageText.trim(),
          message_type: 'text'
        });
      }

      // Upload files and create messages for each
      for (const file of files) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('avatars')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          let messageType = 'file';
          if (file.type.startsWith('image/')) messageType = 'image';
          else if (file.type.startsWith('video/')) messageType = 'video';
          else if (file.type.startsWith('audio/')) messageType = 'audio';

          messagesToSend.push({
            appointment_id: conversation.id,
            sender_id: user?.id,
            message: file.name,
            message_type: messageType,
            file_url: publicUrl,
            file_type: file.type
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: 'Hitilafu',
            description: `Imeshindwa kupakia faili: ${file.name}`,
            variant: 'destructive'
          });
        }
      }

      // Insert all messages
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messagesToSend)
        .select();

      if (error) throw error;

      // Create notification for the recipient
      const notificationTitle = currentUserProfile?.role === 'doctor' 
        ? 'Ujumbe Mpya wa Daktari'
        : 'Ujumbe Mpya wa Mgonjwa';
      
      const notificationMessage = messageText.trim() 
        ? `${currentUserProfile?.first_name || 'Mtu'} amekutumia ujumbe: "${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}"`
        : `${currentUserProfile?.first_name || 'Mtu'} amekutumia faili`;

      await supabase
        .from('notifications')
        .insert({
          user_id: otherUserId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'message',
          related_id: conversation.id
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] });
      setMessage('');
      setSelectedFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma ujumbe',
        variant: 'destructive'
      });
      console.error('Error sending message:', error);
    }
  });

  const handleSendMessage = () => {
    sendMessageMutation.mutate({ 
      messageText: message, 
      files: selectedFiles 
    });
  };

  const handleFileSelect = (files: FileList) => {
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            const audioFile = new File([event.data], `voice-${Date.now()}.webm`, {
              type: 'audio/webm'
            });
            setSelectedFiles(prev => [...prev, audioFile]);
          }
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          title: 'Hitilafu',
          description: 'Imeshindwa kufikia kipaza sauti',
          variant: 'destructive'
        });
      }
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel('chat_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `appointment_id=eq.${conversation.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, queryClient]);

  const renderMessageContent = (msg: any) => {
    switch (msg.message_type) {
      case 'image':
        return (
          <div className="max-w-sm">
            <img 
              src={msg.file_url} 
              alt={msg.message}
              className="rounded-lg max-w-full h-auto cursor-pointer"
              onClick={() => window.open(msg.file_url, '_blank')}
            />
            <p className="text-xs text-gray-500 mt-1">{msg.message}</p>
          </div>
        );
      case 'video':
        return (
          <div className="max-w-sm">
            <video 
              controls
              className="rounded-lg max-w-full h-auto"
              preload="metadata"
            >
              <source src={msg.file_url} type={msg.file_type} />
              Video haiwezi kuonyeshwa
            </video>
            <p className="text-xs text-gray-500 mt-1">{msg.message}</p>
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
            <audio controls className="max-w-xs">
              <source src={msg.file_url} type={msg.file_type} />
              Sauti haiwezi kuchezwa
            </audio>
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-xs">
            <FileText className="w-8 h-8 text-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.message}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(msg.file_url, '_blank')}
                className="text-xs text-blue-600 p-0 h-auto"
              >
                <Download className="w-3 h-3 mr-1" />
                Pakua
              </Button>
            </div>
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap">{msg.message}</p>;
    }
  };

  // If no specific user selected, show contacts list
  if (!otherUserId) {
    return <ContactsList />;
  }

  // Loading state
  if (!otherUser || !conversation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Inapakia mazungumzo...</p>
        </div>
      </div>
    );
  }

  const displayName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 
    (otherUser.role === 'doctor' ? 'Daktari' : 'Mgonjwa');

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="lg:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherUser.avatar_url} />
              <AvatarFallback>
                {otherUser.first_name?.[0] || otherUser.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {displayName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {otherUser.role === 'doctor' ? 'Daktari' : 'Mgonjwa'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.sender_id === user?.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border'
              }`}
            >
              {renderMessageContent(msg)}
              <p className={`text-xs mt-1 ${
                msg.sender_id === user?.id ? 'text-emerald-100' : 'text-gray-500'
              }`}>
                {format(new Date(msg.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Chat Input */}
      <EnhancedChatInput
        message={message}
        setMessage={setMessage}
        onSendMessage={handleSendMessage}
        onFileSelect={handleFileSelect}
        onVoiceRecord={handleVoiceRecord}
        selectedFiles={selectedFiles}
        onRemoveFile={handleRemoveFile}
        isRecording={isRecording}
      />
    </div>
  );
}