import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Send, Check, CheckCheck, Loader2, Paperclip, X, FileText, Download, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import ContactsList from '@/components/ContactsList';

type PendingMsg = {
  tempId: string;
  text?: string;
  files?: { name: string; url: string; type: string; isImage: boolean }[];
  created_at: string;
  sending: boolean;
  failed?: boolean;
};

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [optimisticMsgs, setOptimisticMsgs] = useState<PendingMsg[]>([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const otherUserId = doctorId || patientId;

  const { data: otherUser } = useQuery({
    queryKey: ['user-profile', otherUserId],
    queryFn: async () => {
      if (!otherUserId) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
      return data;
    },
    enabled: !!otherUserId,
  });

  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
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
        consultation_type: 'chat',
      }).select().single();
      return data;
    },
    enabled: !!user?.id && !!otherUserId && !!currentUserProfile,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];
      const { data } = await supabase.from('chat_messages').select('*')
        .eq('appointment_id', conversation.id).order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!conversation?.id,
  });

  const markAsRead = useCallback(async () => {
    if (!conversation?.id || !user?.id) return;
    await supabase.from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('appointment_id', conversation.id).neq('sender_id', user.id).eq('is_read', false);
  }, [conversation?.id, user?.id]);

  // ── Send (optimistic + realtime broadcast) ──
  const performSend = useCallback(async (text: string, files: File[]) => {
    if (!conversation?.id) return;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isoNow = new Date().toISOString();

    // Optimistic
    setOptimisticMsgs(prev => [...prev, {
      tempId,
      text: text.trim() || undefined,
      files: files.map(f => ({
        name: f.name, url: URL.createObjectURL(f), type: f.type, isImage: f.type.startsWith('image/'),
      })),
      created_at: isoNow,
      sending: true,
    }]);

    try {
      const inserts: any[] = [];
      if (text.trim()) {
        inserts.push({
          appointment_id: conversation.id, sender_id: user?.id,
          message: text.trim(), message_type: 'text', status: 'sent',
        });
      }
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        inserts.push({
          appointment_id: conversation.id, sender_id: user?.id, message: file.name,
          message_type: file.type.startsWith('image/') ? 'image' : 'file',
          file_url: publicUrl, file_type: file.type, status: 'sent',
        });
      }
      const { error } = await supabase.from('chat_messages').insert(inserts);
      if (error) throw error;
      // Remove optimistic entry — realtime will deliver the real one
      setOptimisticMsgs(prev => prev.filter(m => m.tempId !== tempId));
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
    } catch (e: any) {
      setOptimisticMsgs(prev => prev.map(m => m.tempId === tempId ? { ...m, sending: false, failed: true } : m));
    }
  }, [conversation?.id, user?.id, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async ({ text, files }: { text: string; files: File[] }) => {
      await performSend(text, files);
    },
    onSuccess: () => {
      setMessage(''); setPendingFiles([]);
    },
  });

  // ── Auto scroll + mark as read ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    markAsRead();
  }, [messages, optimisticMsgs, markAsRead]);

  // ── Realtime subscription (instant delivery) ──
  useEffect(() => {
    if (!conversation?.id) return;
    const ch = supabase.channel(`chat-${conversation.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `appointment_id=eq.${conversation.id}` },
        (payload) => {
          queryClient.setQueryData(['messages', conversation.id], (prev: any[] = []) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
          });
        },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `appointment_id=eq.${conversation.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] }),
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user?.id) {
          setOtherUserTyping(true);
          setTimeout(() => setOtherUserTyping(false), 2500);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversation?.id, queryClient, user?.id]);

  const handleTyping = () => {
    if (!conversation?.id) return;
    supabase.channel(`chat-${conversation.id}`)
      .send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id } });
  };

  // ── Consent flow for media ──
  const onPickFiles = () => fileInputRef.current?.click();
  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setPendingFiles(Array.from(e.target.files));
    setConsentChecked(false);
    setConsentOpen(true);
    e.target.value = '';
  };
  const confirmConsent = () => {
    if (!consentChecked) return;
    setConsentOpen(false);
  };
  const cancelConsent = () => {
    setPendingFiles([]); setConsentOpen(false);
  };

  if (!otherUserId) return <ContactsList />;

  if (!otherUser || !conversation) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const displayName = `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'Mtumiaji';

  // Merge real + optimistic for rendering
  const allMessages: any[] = [
    ...messages,
    ...optimisticMsgs.map(o => ({
      id: o.tempId, sender_id: user?.id, created_at: o.created_at,
      message: o.text, message_type: o.files?.[0]?.isImage ? 'image' : (o.files?.length ? 'file' : 'text'),
      file_url: o.files?.[0]?.url, file_type: o.files?.[0]?.type,
      _optimistic: true, _sending: o.sending, _failed: o.failed,
    })),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center gap-2 shrink-0 bg-card/40">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/messages')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherUser.avatar_url} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{otherUser.first_name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <p className="text-[10px] text-muted-foreground">{otherUserTyping ? 'Anaandika…' : 'Mtandaoni'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {allMessages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          const showImage = msg.message_type === 'image' && msg.file_url;
          const showFile = msg.message_type === 'file' && msg.file_url;

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-2.5 py-1 text-xs leading-relaxed shadow-sm ${
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                } ${msg._failed ? 'opacity-60 ring-1 ring-destructive' : ''}`}
              >
                {showImage && (
                  <a href={msg.file_url} target="_blank" rel="noreferrer" className="block">
                    <img src={msg.file_url} alt={msg.message || 'picha'} className="rounded-lg max-w-[220px] max-h-[220px] object-cover mb-0.5" />
                  </a>
                )}
                {showFile && (
                  <a
                    href={msg.file_url} target="_blank" rel="noreferrer"
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 my-0.5 ${isMe ? 'bg-primary-foreground/10' : 'bg-background/60'}`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px] truncate flex-1">{msg.message}</span>
                    <Download className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {msg.message && !showFile && !showImage && (
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                )}
                {showImage && msg.message && msg.message !== msg.file_url && (
                  <p className="whitespace-pre-wrap break-words text-[11px] opacity-90">{msg.message}</p>
                )}
                <div className="flex items-center justify-end gap-1 mt-0.5 opacity-70">
                  <span className="text-[9px]">{format(new Date(msg.created_at), 'HH:mm')}</span>
                  {isMe && (
                    msg._failed ? <span className="text-[9px] text-destructive font-medium">!</span>
                    : msg._sending ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    : msg.is_read ? <CheckCheck className="h-3 w-3 text-blue-300" />
                    : <Check className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-2.5 py-1.5">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending files preview (after consent) */}
      {pendingFiles.length > 0 && !consentOpen && (
        <div className="px-3 py-1.5 border-t flex gap-2 overflow-x-auto bg-card/40">
          {pendingFiles.map((file, i) => (
            <div key={i} className="relative shrink-0">
              {file.type.startsWith('image/')
                ? <img src={URL.createObjectURL(file)} className="h-12 w-12 object-cover rounded-lg" />
                : <div className="h-12 w-12 bg-muted rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px] px-1 text-center">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate w-full">{file.name.slice(0, 8)}</span>
                  </div>
              }
              <Button size="icon" variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 rounded-full"
                onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-2 flex gap-2 shrink-0 bg-card/40">
        <input type="file" ref={fileInputRef} className="hidden" multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={onFilesSelected} />
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={onPickFiles}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          placeholder="Andika ujumbe..."
          value={message}
          className="flex-1 h-9 px-3 rounded-full bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (message.trim() || pendingFiles.length) sendMutation.mutate({ text: message, files: pendingFiles });
            }
          }}
        />
        <Button size="icon" className="h-9 w-9 shrink-0 rounded-full" disabled={!message.trim() && pendingFiles.length === 0}
          onClick={() => sendMutation.mutate({ text: message, files: pendingFiles })}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Consent dialog */}
      <Dialog open={consentOpen} onOpenChange={(o) => !o && cancelConsent()}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-base">Idhini ya kushiriki</DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed">
              Unakaribia kushiriki <strong>{pendingFiles.length}</strong> {pendingFiles.length === 1 ? 'faili' : 'faili'}
              {' '}na <strong>{displayName}</strong>. Faili hizi zinaweza kuwa na taarifa nyeti za afya
              (rekodi, dawa, vipimo, picha za mwili).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-muted/50 p-3 space-y-2 text-[11px] text-muted-foreground">
            <p>• Mtu unayetuma anaweza kupakua faili hizi.</p>
            <p>• Hutaweza kuzifuta baada ya kutuma.</p>
            <p>• Daktari/mhudumu pekee atayatumia kwa malengo ya matibabu.</p>
          </div>
          <label className="flex items-start gap-2 cursor-pointer p-2 rounded-xl hover:bg-muted/30">
            <Checkbox checked={consentChecked} onCheckedChange={(v) => setConsentChecked(!!v)} className="mt-0.5" />
            <span className="text-xs leading-relaxed">
              Nakubali kushiriki faili hizi na ninafahamu zinaweza kuwa na taarifa nyeti za afya.
            </span>
          </label>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={cancelConsent}>Ghairi</Button>
            <Button className="flex-1 rounded-2xl" disabled={!consentChecked} onClick={confirmConsent}>
              Endelea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
