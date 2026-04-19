import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Home, MessageCircle, Calendar, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [aiTapped, setAiTapped] = useState(false);

  if (!user) return null;
  if (location.pathname === '/auth') return null;

  const handleAiClick = () => {
    setAiTapped(true);
    window.dispatchEvent(new CustomEvent('wizy:open'));
    setTimeout(() => setAiTapped(false), 500);
  };

  const navItems = [
    { icon: Home, label: 'Nyumbani', path: '/dashboard' },
    { icon: Calendar, label: 'Miadi', path: '/appointments' },
    { icon: Bot, label: 'Wizy', path: '#wizy', isCenter: true },
    { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
    { icon: User, label: 'Mimi', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full md:hidden z-50 safe-area-bottom bg-transparent">
      <div className="flex justify-around items-end h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={handleAiClick}
                className="relative -mt-5 flex flex-col items-center justify-center"
              >
                <div className={cn(
                  "h-13 w-13 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25 transition-all duration-500",
                  aiTapped && "scale-110 rotate-[360deg]",
                  !aiTapped && "hover:scale-105 hover:shadow-primary/40"
                )} style={{ height: '52px', width: '52px' }}>
                  <Bot className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[9px] font-bold text-primary mt-1">{item.label}</span>
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 transition-colors min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
