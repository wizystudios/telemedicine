import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageCircle } from 'lucide-react';
import { UniversalSearch } from '@/components/UniversalSearch';
import { formatDistanceToNow } from 'date-fns';

export default function ContactsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch contacts (target role)
  const { data: rawContacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['contacts-all', currentUserProfile?.role],
    queryFn: async () => {
      if (!currentUserProfile?.role) return [];
      const targetRole = currentUserProfile.role === 'patient' ? 'doctor' : 'patient';
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .eq('role', targetRole)
        .order('first_name');
      return data || [];
    },
    enabled: !!currentUserProfile?.role,
  });

  // Fetch recent chat metadata so we can sort by activity + show unread count
  const { data: chatMeta = [] } = useQuery({
    queryKey: ['chat-meta', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.rpc('wizy_recent_chats', { _user_id: user.id, _limit: 200 });
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  // Realtime: refresh when new message arrives
  // (handled via refetchInterval to keep this component small)

  const contacts = useMemo(() => {
    const metaMap = new Map<string, any>();
    (chatMeta as any[]).forEach(m => metaMap.set(m.other_id, m));

    let list = rawContacts.map((c: any) => ({
      ...c,
      _meta: metaMap.get(c.id),
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c: any) =>
        `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q),
      );
    }

    // Sort: unread first, then last activity desc, then alpha
    list.sort((a: any, b: any) => {
      const aUnread = Number(a._meta?.unread_count || 0);
      const bUnread = Number(b._meta?.unread_count || 0);
      if (aUnread !== bUnread) return bUnread - aUnread;
      const aTime = a._meta?.last_at ? +new Date(a._meta.last_at) : 0;
      const bTime = b._meta?.last_at ? +new Date(b._meta.last_at) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
    return list;
  }, [rawContacts, chatMeta, search]);

  const handleContactClick = (contact: any) => {
    const paramName = contact.role === 'doctor' ? 'doctor' : 'patient';
    navigate(`/messages?${paramName}=${contact.id}`);
  };

  const totalUnread = (chatMeta as any[]).reduce((s, m) => s + Number(m.unread_count || 0), 0);

  if (loadingContacts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Ujumbe</h1>
          {totalUnread > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      <UniversalSearch
        placeholder="Tafuta jina, daktari, dawa..."
        onLocalFilter={setSearch}
        global={true}
      />

      <div className="space-y-1">
        {contacts.map((contact: any) => {
          const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Mtumiaji';
          const meta = contact._meta;
          const unread = Number(meta?.unread_count || 0);
          const hasUnread = unread > 0;

          return (
            <button
              key={contact.id}
              onClick={() => handleContactClick(contact)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-colors text-left border ${
                hasUnread ? 'bg-primary/5 border-primary/20' : 'border-transparent hover:bg-muted/50'
              }`}
            >
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {contact.first_name?.[0]}{contact.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-medium'}`}>
                    {contact.role === 'doctor' ? 'Dk. ' : ''}{name}
                  </p>
                  {meta?.last_at && (
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(meta.last_at), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <p className={`text-[11px] truncate ${hasUnread ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                  {meta?.last_message || (contact.role === 'doctor' ? 'Daktari' : 'Mgonjwa')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {contacts.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Hakuna aliyepatikana' : 'Hakuna watu kwa sasa'}
          </p>
        </div>
      )}
    </div>
  );
}
