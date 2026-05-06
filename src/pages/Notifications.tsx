import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, MessageCircle, Calendar, Phone, CheckCheck, Clock, AlertCircle, Sparkles, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { urlForNotificationType } from '@/lib/notificationRoutes';
import { UniversalSearch } from '@/components/UniversalSearch';

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    refetch();
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false);
    refetch();
    toast({ title: 'Arifa zote zimesomwa' });
  };

  // Deep-link with id when present (e.g. open the exact appointment)
  const targetFor = async (n: any) => {
    const base = urlForNotificationType(n.type);
    const id = n.related_id || n.appointment_id;
    if (!id) return base;
    if (n.type === 'appointment' || n.type === 'appointment_request') return `/appointments?focus=${id}`;
    if (n.type === 'message') return `/messages`;
    if (n.type === 'pharmacy_order') return `/my-orders?focus=${id}`;
    if (n.type === 'pending_action') return `/pending-actions`;
    return base;
  };

  const handleClick = async (n: any) => {
    await markAsRead(n.id);
    const url = await targetFor(n);
    navigate(url);
  };

  const iconMap: Record<string, React.ReactNode> = {
    message: <MessageCircle className="h-4 w-4" />,
    appointment: <Calendar className="h-4 w-4" />,
    appointment_request: <Calendar className="h-4 w-4" />,
    call: <Phone className="h-4 w-4" />,
    pharmacy_order: <Pill className="h-4 w-4" />,
    lab_booking: <Clock className="h-4 w-4" />,
    patient_problem: <AlertCircle className="h-4 w-4" />,
    pending_action: <Sparkles className="h-4 w-4" />,
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return notifications;
    const q = search.toLowerCase();
    return notifications.filter((n: any) =>
      `${n.title} ${n.message} ${n.type || ''}`.toLowerCase().includes(q)
    );
  }, [notifications, search]);

  const unread = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Arifa</h1>
          {unread > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllAsRead} className="text-xs text-primary font-medium flex items-center gap-1">
            <CheckCheck className="h-3 w-3" /> Soma zote
          </button>
        )}
      </div>

      <UniversalSearch
        placeholder="Tafuta arifa au popote..."
        onLocalFilter={setSearch}
        global={true}
      />

      <div className="space-y-1.5">
        {filtered.map((n: any) => {
          const unreadItem = !n.is_read;
          return (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl transition-colors border ${
                unreadItem
                  ? 'bg-primary/10 border-primary/30 shadow-sm'
                  : 'bg-card border-border hover:bg-muted/40'
              }`}
            >
              <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                unreadItem ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {iconMap[n.type] || <Bell className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${unreadItem ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                  {n.title}
                </p>
                <p className={`text-xs line-clamp-2 mt-0.5 ${unreadItem ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                  {n.message}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(n.created_at), 'dd MMM, HH:mm')}
                </p>
              </div>
              {unreadItem && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{search ? 'Hakuna arifa zinazolingana' : 'Hakuna arifa bado'}</p>
        </div>
      )}
    </div>
  );
}
