import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, MessageCircle, Calendar, Phone, CheckCircle, Clock, UserPlus, AlertCircle, X, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSidebar({ isOpen, onClose }: NotificationSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          appointment:appointments(
            id,
            patient_profile:profiles!appointments_patient_id_fkey(first_name, last_name, avatar_url),
            doctor_profile:profiles!appointments_doctor_id_fkey(first_name, last_name, avatar_url)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      refetch();
    } catch (error: any) {
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuweka arifa kama imesomwa',
        variant: 'destructive'
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;
      refetch();
      toast({
        title: 'Imefanikiwa',
        description: 'Arifa zote zimewekwa kama zimesomwa',
      });
    } catch (error: any) {
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuweka arifa kama zimesomwa',
        variant: 'destructive'
      });
    }
  };

  const deleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      refetch();
      toast({
        title: 'Imefanikiwa',
        description: 'Arifa imefutwa',
      });
    } catch (error: any) {
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kufuta arifa',
        variant: 'destructive'
      });
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'appointment':
        window.location.href = '/appointments';
        break;
      case 'message':
        window.location.href = '/messages';
        break;
      case 'call':
        // Handle call notification
        break;
      case 'patient_problem':
        window.location.href = `/patient-problems`;
        break;
      default:
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-green-600" />;
      case 'call':
        return <Phone className="w-4 h-4 text-purple-600" />;
      case 'booking':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'registration':
        return <UserPlus className="w-4 h-4 text-indigo-600" />;
      case 'patient_problem':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Arifa</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {notifications.filter(n => !n.is_read).length} mpya
          </Badge>
          {notifications.filter(n => !n.is_read).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Soma zote
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 text-center">
                Hakuna arifa bado
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700",
                  !notification.is_read 
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-75'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">Mpya</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {format(new Date(notification.created_at), 'MMM dd, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}