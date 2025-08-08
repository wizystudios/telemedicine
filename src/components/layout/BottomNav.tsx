
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Home, Calendar, MessageCircle, User, Users, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) return null;

  const userRole = user?.user_metadata?.role || 'patient';
  
  // Get unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .neq('sender_id', user.id)
        .eq('is_read', false);
      
      if (error) return 0;
      const uniqueSenders = new Set((data || []).map((m: any) => m.sender_id));
      return uniqueSenders.size;
    },
    enabled: !!user?.id
  });

  // Different navigation items based on role
  const getNavItems = () => {
    const baseItems = [
      { icon: Home, label: 'Nyumbani', path: '/dashboard' },
      { icon: Calendar, label: 'Miadi', path: '/appointments' },
      { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
    ];

    if (userRole === 'doctor') {
      return [
        ...baseItems,
        { icon: Stethoscope, label: 'Wagonjwa', path: '/patients' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];
    } else {
      return [
        ...baseItems,
        { icon: Users, label: 'Madaktari', path: '/doctors-list' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2 md:hidden z-50">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center py-2 px-2 rounded-lg transition-colors min-w-0 relative",
                isActive 
                  ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950" 
                  : "text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              )}
            >
              <Icon className="w-6 h-6" />
              {item.path === '/messages' && unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
