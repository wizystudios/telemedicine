import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Home, Calendar, MessageCircle, User, Users, Stethoscope, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) return null;

  const userRole = user?.user_metadata?.role || 'patient';

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
    <div className={cn(
      "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-gray-900 dark:text-white">{t('appName')}</span>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900 dark:text-white">
                {user.user_metadata?.first_name} {user.user_metadata?.last_name}
              </p>
              <Badge variant="secondary" className="text-xs">
                {userRole === 'doctor' ? t('doctor') : t('patient')}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isCollapsed ? "px-2" : "px-4",
                  isActive && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
                onClick={() => navigate(item.path)}
              >
                <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}