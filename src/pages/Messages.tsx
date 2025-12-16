import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Check, CheckCheck, Loader2, Paperclip, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ContactsList from '@/components/ContactsList';

export default function Messages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const doctorId = searchParams.get('doctor');
  const patientId = searchParams.get('patient');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const otherUserId = doctorId || patientId;

  // Get other user details
  const { data: otherUser } = useQuery({
    queryKey: ['user-profile', otherUserId],
    queryFn: async () => {
      if (!otherUserId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();
      return data;
    },
    enabled: !!otherUserId
  });

  // Get current user profile
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  // Get or create conversation
  const { data: conversation } = useQuery({
    queryKey: ['conversation', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return null;

      const { data: existingAppointment } = await supabase
        .from('appointments')
        .select('*')
        .or(`and(patient_id.eq.${user.id},doctor_id.eq.${otherUserId}),and(patient_id.eq.${otherUserId},doctor_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAppointment) return existingAppointment;

      const isUserPatient = currentUserProfile?.role === 'patient';
      const { data: newAppointment } = await supabase
        .from('appointments')
        .insert({
          patient_id: isUserPatient ? user.id : otherUserId,
          doctor_id: isUserPatient ? otherUserId : user.id,
          appointment_date: new Date().toISOString(),
          status: 'scheduled',
          consultation_type: 'chat'
        })
        .select()
        .single();

      return newAppointment;
    },
    enabled: !!user?.id && !!otherUserId && !!currentUserProfile
  });

  // Get messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('appointment_id', conversation.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!conversation?.id
  });

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!conversation?.id || !user?.id) return;
    
    await supabase
      .from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('appointment_id', conversation.id)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  }, [conversation?.id, user?.id]);

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ messageText, files }: { messageText: string; files: File[] }) => {
      if (!conversation?.id || (!messageText.trim() && files.length === 0)) return;

      const messagesToSend = [];

      if (messageText.trim()) {
        messagesToSend.push({
          appointment_id: conversation.id,
          sender_id: user?.id,
          message: messageText.trim(),
          message_type: 'text',
          status: 'sent'
        });
      }

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          let messageType = 'file';
          if (file.type.startsWith('image/')) messageType = 'image';

          messagesToSend.push({
            appointment_id: conversation.id,
            sender_id: user?.id,
            message: file.name,
            message_type: messageType,
            file_url: publicUrl,
            file_type: file.type,
            status: 'sent'
          });
        }
      }

      const { data } = await supabase
        .from('chat_messages')
        .insert(messagesToSend)
        .select();

      // Notify recipient
      await supabase.from('notifications').insert({
        user_id: otherUserId,
        title: 'Ujumbe Mpya',
        message: messageText.trim() || 'Faili mpya',
        type: 'message',
        related_id: conversation.id
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] });
      setMessage('');
      setSelectedFiles([]);
    }
  });

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // Broadcast typing status
      supabase.channel(`typing-${conversation?.id}`)
        .send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id } });
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    markAsRead();
  }, [messages, markAsRead]);

  // Real-time subscription
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `appointment_id=eq.${conversation.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
      })
      .subscribe();

    // Typing indicator channel
    const typingChannel = supabase
      .channel(`typing-${conversation.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user?.id) {
          setOtherUserTyping(true);
          setTimeout(() => setOtherUserTyping(false), 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [conversation?.id, queryClient, user?.id]);

  if (!otherUserId) return <ContactsList />;

  if (!otherUser || !conversation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 
    (otherUser.role === 'doctor' ? 'Daktari' : 'Mgonjwa');

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherUser.avatar_url} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {otherUser.first_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-[10px] text-muted-foreground">
            {otherUserTyping ? 'Anaandika...' : otherUser.role === 'doctor' ? 'Daktari' : 'Mgonjwa'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
              }`}>
                {msg.message_type === 'image' && msg.file_url && (
                  <img src={msg.file_url} alt="" className="rounded-lg max-w-full mb-1" />
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] opacity-70">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                  {isMe && (
                    msg.is_read ? (
                      <CheckCheck className="h-3 w-3 text-blue-400" />
                    ) : (
                      <Check className="h-3 w-3 opacity-70" />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="px-3 py-2 border-t flex gap-2 overflow-x-auto">
          {selectedFiles.map((file, i) => (
            <div key={i} className="relative shrink-0">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} className="h-16 w-16 object-cover rounded-lg" />
              ) : (
                <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center text-xs">
                  {file.name.slice(0, 8)}
                </div>
              )}
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3 flex gap-2 shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            if (e.target.files) {
              setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Andika ujumbe..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessageMutation.mutate({ messageText: message, files: selectedFiles });
            }
          }}
          className="flex-1 h-9"
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => sendMessageMutation.mutate({ messageText: message, files: selectedFiles })}
          disabled={!message.trim() && selectedFiles.length === 0}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
