
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
import { Heart, LogOut, Settings, User, Activity } from 'lucide-react';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { updateOnlineStatus } = useOnlineStatus();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);

  // Set doctor online when they login
  useEffect(() => {
    if (user?.role === 'doctor') {
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
  }, [user, updateOnlineStatus]);

  const handleSignOut = async () => {
    if (user?.role === 'doctor') {
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
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">TeleHealth</span>
          </Link>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.role === 'doctor' && isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">
                      {user.user_metadata?.first_name} {user.user_metadata?.last_name}
                    </p>
                    <p className="w-[200px] truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {user.role === 'doctor' ? 'Doctor' : 'Patient'}
                    </Badge>
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                
                {user.role === 'doctor' && (
                  <>
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm">Online Status</span>
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
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
