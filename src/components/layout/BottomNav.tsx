import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, MessageCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Hide on auth page
  if (location.pathname === '/auth') return null;

  const navItems = user 
    ? [
        { icon: Home, label: 'Nyumbani', path: '/dashboard' },
        { icon: Calendar, label: 'Miadi', path: '/appointments' },
        { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
        { icon: User, label: 'Mimi', path: '/profile' },
      ]
    : [
        { icon: Home, label: 'Nyumbani', path: '/' },
        { icon: User, label: 'Ingia', path: '/auth' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t md:hidden z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-xl transition-colors min-w-[64px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
