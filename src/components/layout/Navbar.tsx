import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
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
import { HeartPulse, LogOut, Settings, User, Activity, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { updateOnlineStatus } = useOnlineStatus();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);

  const userRole = user?.user_metadata?.role || 'patient';

  useEffect(() => {
    if (userRole === 'doctor') {
      updateOnlineStatus(true);
      setIsOnline(true);
      
      const handleBeforeUnload = () => updateOnlineStatus(false);
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        updateOnlineStatus(false);
      };
    }
  }, [userRole, updateOnlineStatus]);

  const handleSignOut = async () => {
    if (userRole === 'doctor') await updateOnlineStatus(false);
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  return (
    <nav className="bg-background/95 backdrop-blur-lg border-b sticky top-0 z-40 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <HeartPulse className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold hidden sm:inline">TeleMed</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <Button 
            variant="ghost" 
            size="icon"
            className="relative h-9 w-9"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {userRole === 'doctor' && isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {user.user_metadata?.first_name} {user.user_metadata?.last_name}
                  </p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {userRole}
                  </Badge>
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              {userRole === 'doctor' && (
                <>
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm">Online</span>
                    </div>
                    <Switch
                      checked={isOnline}
                      onCheckedChange={(checked) => {
                        setIsOnline(checked);
                        updateOnlineStatus(checked);
                      }}
                    />
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Mipangilio
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Toka
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
