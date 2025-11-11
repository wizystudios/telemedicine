
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Heart, LogOut, Settings, User, Activity, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useEffect, useState } from 'react';
import { NotificationsList } from '@/components/NotificationsList';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { updateOnlineStatus } = useOnlineStatus();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);

  // Get user role from both user_metadata and direct role property
  const userRole = user?.user_metadata?.role || user?.role || 'patient';

  // Set doctor online when they login
  useEffect(() => {
    if (userRole === 'doctor') {
      updateOnlineStatus(true);
      setIsOnline(true);
      
      // Set offline when page unloads
      const handleBeforeUnload = () => {
        updateOnlineStatus(false);
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        updateOnlineStatus(false);
      };
    }
  }, [userRole, updateOnlineStatus]);

  const handleSignOut = async () => {
    if (userRole === 'doctor') {
      await updateOnlineStatus(false);
    }
    await signOut();
    navigate('/auth');
  };

  const toggleOnlineStatus = async (checked: boolean) => {
    setIsOnline(checked);
    await updateOnlineStatus(checked);
  };

  if (!user) return null;

  return (
    <nav className="bg-background/80 backdrop-blur-lg border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center items-center h-14">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">TeleMed</span>
          </Link>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="icon"
              className="relative h-8 w-8"
              onClick={() => {
                const event = new CustomEvent('toggleNotifications');
                window.dispatchEvent(event);
              }}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {userRole === 'doctor' && isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-background rounded-full"></div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent className="w-64" align="end">
                <div className="flex items-center space-x-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="font-medium text-sm">
                      {user.user_metadata?.first_name} {user.user_metadata?.last_name}
                    </p>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {userRole === 'doctor' ? t('doctor') : t('patient')}
                    </Badge>
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                {userRole === 'doctor' && (
                  <>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm">{t('onlineStatus')}</span>
                      </div>
                      <Switch
                        checked={isOnline}
                        onCheckedChange={toggleOnlineStatus}
                      />
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('profile')}</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('settings')}</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
