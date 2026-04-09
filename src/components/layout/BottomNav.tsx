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
    setTimeout(() => {
      setAiTapped(false);
      navigate('/chatbot');
    }, 400);
  };

  const navItems = [
    { icon: Home, label: 'Nyumbani', path: '/dashboard' },
    { icon: Calendar, label: 'Miadi', path: '/appointments' },
    { icon: Bot, label: 'AI', path: '/chatbot', isCenter: true },
    { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
    { icon: User, label: 'Mimi', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full border-t border-border/50 md:hidden z-50 safe-area-bottom bg-transparent backdrop-blur-sm">
      <div className="flex justify-around items-end h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={handleAiClick}
                className={cn(
                  "relative -mt-5 flex flex-col items-center justify-center transition-all",
                  aiTapped && "animate-bounce"
                )}
              >
                <div className={cn(
                  "h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg transition-transform",
                  aiTapped && "scale-110 rotate-[360deg]",
                  !aiTapped && "hover:scale-105"
                )} style={{ transition: 'transform 0.4s ease' }}>
                  <Bot className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[9px] font-semibold text-primary mt-0.5">{item.label}</span>
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-2 transition-colors min-w-0",
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
