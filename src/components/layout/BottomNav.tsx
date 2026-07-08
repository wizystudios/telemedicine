import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, MessageCircle, Calendar, User, Bot, Stethoscope, Pill, FlaskConical, Users as UsersIcon, Building2, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import wizyAvatar from '@/assets/wizy-avatar.png';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { supabase } from '@/integrations/supabase/client';

type Item = { icon: any; label: string; path: string; isCenter?: boolean };

function itemsForRole(role: string | null): Item[] {
  const center = { icon: Bot, label: 'Wizy', path: '#wizy', isCenter: true };
  switch (role) {
    case 'doctor':
      return [
        { icon: Home, label: 'Nyumbani', path: '/dashboard' },
        { icon: UsersIcon, label: 'Wagonjwa', path: '/patients' },
        center,
        { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
        { icon: User, label: 'Mimi', path: '/profile' },
      ];
    case 'hospital_owner':
    case 'polyclinic_owner':
      return [
        { icon: Home, label: 'Dashibodi', path: '/dashboard' },
        { icon: Stethoscope, label: 'Madaktari', path: '/dashboard?tab=doctors' },
        center,
        { icon: Bell, label: 'Arifa', path: '/notifications' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    case 'pharmacy_owner':
      return [
        { icon: Home, label: 'Dashibodi', path: '/dashboard' },
        { icon: Pill, label: 'Maagizo', path: '/dashboard?tab=orders' },
        center,
        { icon: Bell, label: 'Arifa', path: '/notifications' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    case 'lab_owner':
      return [
        { icon: Home, label: 'Dashibodi', path: '/dashboard' },
        { icon: FlaskConical, label: 'Vipimo', path: '/dashboard?tab=bookings' },
        center,
        { icon: Bell, label: 'Arifa', path: '/notifications' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    case 'super_admin':
    case 'admin':
      return [
        { icon: Home, label: 'Dashibodi', path: '/dashboard' },
        { icon: UsersIcon, label: 'Watumiaji', path: '/dashboard?tab=users' },
        center,
        { icon: Building2, label: 'Mashirika', path: '/dashboard?tab=orgs' },
        { icon: User, label: 'Mimi', path: '/profile' },
      ];
    case 'patient':
      return [
        { icon: Home, label: 'Nyumbani', path: '/dashboard' },
        { icon: Calendar, label: 'Miadi', path: '/appointments' },
        center,
        { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
        { icon: User, label: 'Mimi', path: '/profile' },
      ];
    default:
      return [
        { icon: Home, label: 'Tafuta', path: '/doctors-list' },
        { icon: Calendar, label: 'Soko', path: '/marketplace' },
        center,
        { icon: User, label: 'Ingia', path: '/auth' },
      ];
  }
}

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [aiTapped, setAiTapped] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const { count: unreadCount } = useUnreadNotifications();

  useEffect(() => {
    if (!user) { setRole(null); return; }
    (async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
      setRole((data?.role as any) || user.user_metadata?.role || 'patient');
    })();
  }, [user]);

  if (location.pathname === '/auth') return null;

  const handleAiClick = () => {
    setAiTapped(true);
    window.dispatchEvent(new CustomEvent('wizy:open'));
    setTimeout(() => setAiTapped(false), 500);
  };

  const navItems = itemsForRole(user ? role : null);

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full md:hidden z-50 safe-area-bottom bg-transparent">
      <div className="flex justify-around items-end h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path.split('?')[0];

          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={handleAiClick}
                className="relative -mt-5 flex flex-col items-center justify-center"
              >
                <div className={cn(
                  "flex items-center justify-center transition-all duration-500",
                  aiTapped && "scale-110 rotate-[360deg]",
                  !aiTapped && "hover:scale-105"
                )} style={{ height: '58px', width: '48px' }}>
                  <img src={wizyAvatar} alt="Wizy" className="h-full w-full object-contain" />
                </div>
                <span className="text-[9px] font-bold text-primary mt-1">{item.label}</span>
              </button>
            );
          }

          const showBadge = (item.label === 'Ujumbe' || item.label === 'Arifa') && unreadCount > 0;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 transition-colors min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")} />
              {showBadge && (
                <span className="absolute top-1 right-2 h-3.5 min-w-[14px] px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
