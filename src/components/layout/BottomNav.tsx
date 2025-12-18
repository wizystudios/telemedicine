import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNav } from '@/contexts/NavContext';
import { Home, MessageCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hideNav } = useNav();

  // Hide bottom nav when in chat mode or on auth page
  if (hideNav) return null;
  if (location.pathname === '/auth') return null;

  const navItems = user 
    ? [
        { icon: Home, label: 'Home', path: '/dashboard' },
        { icon: Calendar, label: 'Miadi', path: '/appointments' },
        { icon: MessageCircle, label: 'Chat', path: '/messages' },
        { icon: User, label: 'Mimi', path: '/profile' },
      ]
    : [
        { icon: Home, label: 'Home', path: '/' },
        { icon: User, label: 'Ingia', path: '/auth' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-background/95 backdrop-blur-lg border-t md:hidden z-50">
      <div className="flex justify-around items-center h-12">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0 py-1.5 px-3 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "stroke-[2.5px]")} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
