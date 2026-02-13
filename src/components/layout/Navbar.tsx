import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useNav } from '@/contexts/NavContext';
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
import { supabase } from '@/integrations/supabase/client';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { updateOnlineStatus } = useOnlineStatus();
  const { hideNav } = useNav();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [userRole, setUserRole] = useState<string>('patient');

  // Fetch real role from user_roles table
  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserRole(data?.role || user.user_metadata?.role || 'patient');
    };
    fetchRole();
  }, [user]);

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

  // Hide navbar when in chat mode
  if (hideNav) return null;
  if (!user) return null;

  return (
    <nav className="w-full bg-background/95 backdrop-blur-lg border-b sticky top-0 z-40">
      <div className="flex items-center justify-between h-10 px-3">
        <Link to="/dashboard" className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <HeartPulse className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xs">TeleMed</span>
        </Link>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          
          <Button 
            variant="ghost" 
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-3.5 w-3.5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-7 w-7 rounded-full p-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {userRole === 'doctor' && isOnline && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary border border-background rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-48" align="end">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">
                    {user.user_metadata?.first_name} {user.user_metadata?.last_name}
                  </p>
                  <Badge variant="secondary" className="text-[10px] capitalize px-1 py-0">
                    {userRole}
                  </Badge>
                </div>
              </div>
              
              <DropdownMenuSeparator />
              
              {userRole === 'doctor' && (
                <>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3 w-3" />
                      <span className="text-xs">Online</span>
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
              
              <DropdownMenuItem asChild className="text-xs py-1.5">
                <Link to="/profile" className="flex items-center">
                  <User className="mr-2 h-3 w-3" />
                  Profile
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild className="text-xs py-1.5">
                <Link to="/profile" className="flex items-center">
                  <Settings className="mr-2 h-3 w-3" />
                  Settings
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive text-xs py-1.5">
                <LogOut className="mr-2 h-3 w-3" />
                Ondoka
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
