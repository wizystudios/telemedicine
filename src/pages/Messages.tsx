
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
import ContactsList from '@/components/ContactsList';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Create or get conversation
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', otherUserId],
    queryFn: async () => {
      if (!otherUserId || !user) return null;
      
      // Try to find existing appointment between users
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('*')
        .or(`and(patient_id.eq.${user.id},doctor_id.eq.${otherUserId}),and(patient_id.eq.${otherUserId},doctor_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1);

      // If appointment exists, return it
      if (existingAppointments && existingAppointments.length > 0) {
        return existingAppointments[0];
      }

      // If no appointment exists, create one for messaging
      const isUserDoctor = user.id === doctorId;
      const { data: newAppointment, error: createError } = await supabase
        .from('appointments')
        .insert({
          patient_id: isUserDoctor ? otherUserId : user.id,
          doctor_id: isUserDoctor ? user.id : otherUserId,
          appointment_date: new Date().toISOString(),
          consultation_type: 'chat',
          status: 'approved',
          symptoms: 'Chat consultation'
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating chat appointment:', createError);
        throw createError;
      }
      
      return newAppointment;
    },
    enabled: !!otherUserId && !!user
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles(first_name, last_name, avatar_url)
        `)
        .eq('appointment_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversation?.id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, fileUrl, messageType }: { message: string; fileUrl?: string; messageType?: string }) => {
      if (!conversation?.id) throw new Error('No conversation found');
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          appointment_id: conversation.id,
          sender_id: user!.id,
          message,
          file_url: fileUrl,
          message_type: messageType || (fileUrl ? 'file' : 'text')
        });

      if (error) throw error;

      // Create notification for the other user
      if (currentUserProfile) {
        await supabase
          .from('notifications')
          .insert({
            user_id: otherUserId,
            type: 'message',
            title: 'Ujumbe Mpya',
            message: `Umepokea ujumbe kutoka ${currentUserProfile.first_name} ${currentUserProfile.last_name}`,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] });
      setMessage('');
      setSelectedFile(null);
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
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
    let messageType = 'text';
    let messageText = message;
    
    if (selectedFile) {
      fileUrl = `https://placeholder.com/files/${selectedFile.name}`;
      
      // Determine message type based on file type
      if (selectedFile.type.startsWith('image/')) {
        messageType = 'image';
        messageText = messageText || 'Picha';
      } else if (selectedFile.type.startsWith('audio/')) {
        messageType = 'voice';
        messageText = messageText || 'Ujumbe wa sauti';
      } else {
        messageType = 'file';
        messageText = messageText || 'Faili';
      }
      
      toast({
        title: 'Faili Imepakiwa',
        description: 'Faili imepakiwa kikamilifu',
      });
    }

    sendMessageMutation.mutate({ message: messageText, fileUrl, messageType });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const audioChunks: BlobPart[] = [];

        recorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
          setSelectedFile(audioFile);
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        toast({
          title: 'Hitilafu',
          description: 'Imeshindwa kuanza kurekodi sauti',
          variant: 'destructive'
        });
      }
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `appointment_id=eq.${conversation.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, queryClient]);

  if (conversationLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inaanzisha mazungumzo...</p>
        </div>
      </div>
    );
  }

  // Show contact list if no specific user is selected
  if (!otherUserId) {
    return <ContactsList />;
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia taarifa za mtumiaji...</p>
        </div>
      </div>
    );
  }

  const otherUserName = `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim();

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
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
                {otherUser.role === 'doctor' ? 'Dkt. ' : ''}{otherUserName}
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
      <div className="flex-1 overflow-y-auto p-4">
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
                      {msg.message_type === 'image' ? (
                        <img src={msg.file_url} alt="Picha" className="max-w-full h-auto rounded" />
                      ) : msg.message_type === 'voice' ? (
                        <audio controls className="w-full">
                          <source src={msg.file_url} type="audio/wav" />
                          Kivinjari hakikubaliki
                        </audio>
                      ) : (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-300 underline">
                          📄 {msg.message}
                        </a>
                      )}
                    </div>
                  )}
                  {!msg.file_url && <p>{msg.message}</p>}
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
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {selectedFile && (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedFile.type.startsWith('image/') ? (
                  <span>🖼️</span>
                ) : selectedFile.type.startsWith('audio/') ? (
                  <span>🎵</span>
                ) : (
                  <span>📄</span>
                )}
                <p className="text-sm">{selectedFile.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                ✕
              </Button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/*,audio/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
            <input
              type="file"
              id="image-upload"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              title="Picha"
            >
              📷
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
              title="Faili"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceRecord}
              title="Sauti"
              className={isRecording ? 'bg-red-500 text-white' : ''}
            >
              🎤
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
