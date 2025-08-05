import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';

export function OnlineStatusToggle() {
  const { user } = useAuth();
  const { toggleOnlineStatus } = useOnlineStatus();
  const [isToggling, setIsToggling] = useState(false);

  // Get current online status
  const { data: currentStatus, refetch } = useQuery({
    queryKey: ['current-online-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('doctor_online_status')
        .select('is_online')
        .eq('doctor_id', user.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleOnlineStatus();
      await refetch();
    } catch (error) {
      console.error('Error toggling status:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const isOnline = currentStatus?.is_online || false;

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Hali ya Mtandao:</span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
          {isOnline ? 'Mtandaoni' : 'Nje ya Mtandao'}
        </Badge>
        
        <Switch
          checked={isOnline}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          className="scale-75"
        />
      </div>
    </div>
  );
}