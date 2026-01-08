import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Globe, User, LogOut, Phone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}

export function SettingsDrawer({ open, onOpenChange, userRole = 'patient' }: SettingsDrawerProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    toast({ title: 'Umefanikiwa kutoka', description: 'Kwaheri!' });
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Mipangilio</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-6">
          {/* User info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-lg">{user?.email?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="outline" className="mt-1 capitalize">{userRole}</Badge>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <p className="font-medium text-sm">Mwonekano</p>
                <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Giza' : 'Mwanga'}</p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">Lugha</p>
                <p className="text-xs text-muted-foreground">Kiswahili</p>
              </div>
            </div>
          </div>

          {/* Role info */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">Jukumu</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </div>
          </div>

          {/* Add phone number (for existing email users) */}
          {user && !user.phone && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="h-5 w-5" />
                <p className="font-medium text-sm">Ongeza Nambari ya Simu</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Ongeza nambari ya simu ili uweze kuingia kwa simu pia.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => toast({ title: 'Inakuja', description: 'Huduma hii inakuja hivi karibuni.' })}
              >
                Ongeza Simu
              </Button>
            </div>
          )}
        </div>
        <DrawerFooter>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Toka
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}