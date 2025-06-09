
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, MessageCircle, Calendar, Phone, CheckCircle, Clock, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function NotificationsList() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
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
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-600';
      case 'appointment': return 'text-green-600';
      case 'call': return 'text-purple-600';
      case 'booking': return 'text-emerald-600';
      case 'reminder': return 'text-orange-600';
      case 'registration': return 'text-indigo-600';
      default: return 'text-gray-600';
    }
  };

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Arifa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 text-center">
              Hakuna arifa bado
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Utapokea arifa kuhusu miadi, ujumbe, na shughuli nyingine hapa
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Arifa</span>
          </div>
          <Badge variant="secondary">
            {notifications.filter(n => !n.is_read).length} mpya
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border transition-colors ${
              !notification.is_read 
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' 
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-75'
            }`}
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
                    {!notification.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs px-2 py-1 h-6"
                      >
                        Imesomwa
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {notification.message}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {format(new Date(notification.created_at), 'MMM dd, h:mm a')}
                  </p>
                  <span className={`text-xs font-medium ${getTypeColor(notification.type)}`}>
                    {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {notifications.length >= 10 && (
          <div className="text-center pt-3 border-t">
            <Button variant="ghost" size="sm" className="text-xs">
              Ona arifa zote
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
