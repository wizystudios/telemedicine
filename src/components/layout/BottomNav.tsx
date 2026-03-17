import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, MessageCircle, Calendar, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;
  if (location.pathname === '/auth') return null;

  const navItems = [
    { icon: Home, label: 'Nyumbani', path: '/dashboard' },
    { icon: Bot, label: 'AI Chat', path: '/chatbot' },
    { icon: Calendar, label: 'Miadi', path: '/appointments' },
    { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
    { icon: User, label: 'Mimi', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-background/95 backdrop-blur-lg border-t md:hidden z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 transition-colors min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
