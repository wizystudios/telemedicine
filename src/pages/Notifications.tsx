import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageCircle, Calendar, Phone, CheckCheck, Trash2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user?.id
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

  const handleClick = (n: any) => {
    markAsRead(n.id);
    if (n.type === 'appointment') navigate('/appointments');
    else if (n.type === 'message') navigate('/messages');
    else if (n.type === 'pharmacy_order' || n.type === 'lab_booking') navigate('/appointments');
    else if (n.type === 'patient_problem') navigate('/patient-problems');
  };

  const iconMap: Record<string, React.ReactNode> = {
    message: <MessageCircle className="h-4 w-4 text-primary" />,
    appointment: <Calendar className="h-4 w-4 text-primary" />,
    call: <Phone className="h-4 w-4 text-primary" />,
    pharmacy_order: <Clock className="h-4 w-4 text-primary" />,
    lab_booking: <Clock className="h-4 w-4 text-primary" />,
    patient_problem: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
      <div className="flex items-center justify-between mb-4">
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

      <div className="space-y-1">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors ${
              !n.is_read ? 'bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {iconMap[n.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {n.title}
                {!n.is_read && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(n.created_at), 'dd MMM, HH:mm')}
              </p>
            </div>
          </button>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-16">
          <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Hakuna arifa bado</p>
        </div>
      )}
    </div>
  );
}
