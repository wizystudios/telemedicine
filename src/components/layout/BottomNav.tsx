
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Home, Calendar, MessageCircle, User, Users, Stethoscope, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

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

  // Different navigation items based on auth status
  const getNavItems = () => {
    // Guest nav items
    if (!user) {
      return [
        { icon: Home, label: 'Home', path: '/' },
        { icon: LogIn, label: 'Login', path: '/auth' },
        { icon: UserPlus, label: 'Sign Up', path: '/auth' },
      ];
    }

    // Logged in nav items
    const baseItems = [
      { icon: Home, label: 'Home', path: '/dashboard' },
      { icon: Calendar, label: 'Appointments', path: '/appointments' },
      { icon: MessageCircle, label: 'Messages', path: '/messages' },
    ];

    if (userRole === 'doctor') {
      return [
        ...baseItems,
        { icon: Stethoscope, label: 'Patients', path: '/patients' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];
    } else {
      return [
        ...baseItems,
        { icon: Users, label: 'Doctors', path: '/doctors-list' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t px-4 py-2 md:hidden z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.path === '/messages' && unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
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
