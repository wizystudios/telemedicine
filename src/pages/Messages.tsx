import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Check, CheckCheck, Loader2, Paperclip, X } from 'lucide-react';
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
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const otherUserId = doctorId || patientId;

  const { data: otherUser } = useQuery({
    queryKey: ['user-profile', otherUserId],
    queryFn: async () => {
      if (!otherUserId) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
      return data;
    },
    enabled: !!otherUserId
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id
  });

  const { data: conversation } = useQuery({
    queryKey: ['conversation', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId) return null;
      const { data: existing } = await supabase
        .from('appointments')
        .select('*')
        .or(`and(patient_id.eq.${user.id},doctor_id.eq.${otherUserId}),and(patient_id.eq.${otherUserId},doctor_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return existing;

      const isPatient = currentUserProfile?.role === 'patient';
      const { data } = await supabase.from('appointments').insert({
        patient_id: isPatient ? user.id : otherUserId,
        doctor_id: isPatient ? otherUserId : user.id,
        appointment_date: new Date().toISOString(),
        status: 'scheduled',
        consultation_type: 'chat'
      }).select().single();
      return data;
    },
    enabled: !!user?.id && !!otherUserId && !!currentUserProfile
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const { data } = await supabase.from('chat_messages').select('*')
        .eq('appointment_id', conversation.id).order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!conversation?.id
  });

  const markAsRead = useCallback(async () => {
    if (!conversation?.id || !user?.id) return;
    await supabase.from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('appointment_id', conversation.id).neq('sender_id', user.id).eq('is_read', false);
  }, [conversation?.id, user?.id]);

  const sendMutation = useMutation({
    mutationFn: async ({ text, files }: { text: string; files: File[] }) => {
      if (!conversation?.id || (!text.trim() && files.length === 0)) return;
      const msgs: any[] = [];
      if (text.trim()) {
        msgs.push({ appointment_id: conversation.id, sender_id: user?.id, message: text.trim(), message_type: 'text', status: 'sent' });
      }
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${user?.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, file);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          msgs.push({
            appointment_id: conversation.id, sender_id: user?.id, message: file.name,
            message_type: file.type.startsWith('image/') ? 'image' : 'file',
            file_url: publicUrl, file_type: file.type, status: 'sent'
          });
        }
      }
      await supabase.from('chat_messages').insert(msgs);
      await supabase.from('notifications').insert({
        user_id: otherUserId, title: 'Ujumbe Mpya', message: text.trim() || 'Faili mpya', type: 'message', related_id: conversation.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] });
      setMessage(''); setSelectedFiles([]);
    }
  });

  const handleTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    supabase.channel(`typing-${conversation?.id}`)
      .send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id } });
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    markAsRead();
  }, [messages, markAsRead]);

  useEffect(() => {
    if (!conversation?.id) return;
    const ch = supabase.channel(`chat-${conversation.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `appointment_id=eq.${conversation.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] }))
      .subscribe();
    const tch = supabase.channel(`typing-${conversation.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user?.id) { setOtherUserTyping(true); setTimeout(() => setOtherUserTyping(false), 2000); }
      }).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(tch); };
  }, [conversation?.id, queryClient, user?.id]);

  if (!otherUserId) return <ContactsList />;

  if (!otherUser || !conversation) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const displayName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'Mtumiaji';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/messages')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-7 w-7">
          <AvatarImage src={otherUser.avatar_url} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{otherUser.first_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-[10px] text-muted-foreground">{otherUserTyping ? 'Anaandika...' : ''}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                {msg.message_type === 'image' && msg.file_url && (
                  <img src={msg.file_url} alt="" className="rounded-lg max-w-full mb-1" />
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[9px] opacity-60">{format(new Date(msg.created_at), 'HH:mm')}</span>
                  {isMe && (msg.is_read ? <CheckCheck className="h-3 w-3 text-blue-400" /> : <Check className="h-3 w-3 opacity-60" />)}
                </div>
              </div>
            </div>
          );
        })}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {selectedFiles.length > 0 && (
        <div className="px-3 py-1.5 border-t flex gap-2 overflow-x-auto">
          {selectedFiles.map((file, i) => (
            <div key={i} className="relative shrink-0">
              {file.type.startsWith('image/')
                ? <img src={URL.createObjectURL(file)} className="h-12 w-12 object-cover rounded-lg" />
                : <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center text-[10px]">{file.name.slice(0, 6)}</div>
              }
              <Button size="icon" variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 rounded-full"
                onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-2 flex gap-2 shrink-0">
        <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => { if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
        <Input placeholder="Andika ujumbe..." value={message} className="flex-1 h-8 text-sm"
          onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMutation.mutate({ text: message, files: selectedFiles }); } }} />
        <Button size="icon" className="h-8 w-8 shrink-0" disabled={!message.trim() && selectedFiles.length === 0}
          onClick={() => sendMutation.mutate({ text: message, files: selectedFiles })}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
