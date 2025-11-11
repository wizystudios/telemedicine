import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function useRealtimeChatNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to new messages where user is recipient
    const messagesChannel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `appointment_id=in.(select id from appointments where patient_id=eq.${user.id} or doctor_id=eq.${user.id})`
        },
        async (payload) => {
          // Check if this message is not from current user
          if (payload.new.sender_id !== user.id) {
            // Get sender info
            const { data: sender } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', payload.new.sender_id)
              .single();

            const senderName = sender 
              ? `${sender.first_name} ${sender.last_name}`
              : 'Someone';

            // Show notification
            toast({
              title: `New message from ${senderName}`,
              description: payload.new.message_type === 'text' 
                ? payload.new.message.substring(0, 50) 
                : 'Sent a file',
            });

            // Invalidate messages query to refetch
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
          }
        }
      )
      .subscribe();

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          toast({
            title: payload.new.title,
            description: payload.new.message,
          });

          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user?.id, toast, queryClient]);
}
