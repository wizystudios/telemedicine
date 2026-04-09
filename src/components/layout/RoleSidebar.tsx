import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Home, Calendar, MessageCircle, User, Stethoscope, Building2,
  Pill, FlaskConical, Shield, Bot, Bell, FileText, Users,
  Settings, Package, Activity, Heart, ClipboardList, X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RoleSidebarProps {
  open: boolean;
  onClose: () => void;
}

const roleLabels: Record<string, string> = {
  patient: 'Mgonjwa',
  doctor: 'Daktari',
  hospital_owner: 'Hospitali',
  pharmacy_owner: 'Famasi',
  lab_owner: 'Maabara',
  polyclinic_owner: 'Polyclinic',
  super_admin: 'Admin',
};

function getNavItems(role: string) {
  const common = [
    { icon: Home, label: 'Nyumbani', path: '/dashboard' },
    { icon: Calendar, label: 'Miadi', path: '/appointments' },
    { icon: MessageCircle, label: 'Ujumbe', path: '/messages' },
    { icon: Bell, label: 'Arifa', path: '/notifications' },
  ];

  switch (role) {
    case 'patient':
      return [
        ...common,
        { icon: Bot, label: 'AI Msaidizi', path: '/chatbot' },
        { icon: Stethoscope, label: 'Madaktari', path: '/doctors-list' },
        { icon: FileText, label: 'Dawa', path: '/prescriptions' },
        { icon: ClipboardList, label: 'Rekodi', path: '/medical-records' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];
    case 'doctor':
      return [
        ...common,
        { icon: Users, label: 'Wagonjwa', path: '/patients' },
        { icon: FileText, label: 'Dawa', path: '/prescriptions' },
        { icon: Activity, label: 'Maudhui', path: '/dashboard' },
        { icon: User, label: 'Profile', path: '/profile' },
      ];
    case 'hospital_owner':
      return [
        ...common,
        { icon: Stethoscope, label: 'Madaktari', path: '/dashboard' },
        { icon: Package, label: 'Huduma', path: '/dashboard' },
        { icon: Activity, label: 'Maudhui', path: '/dashboard' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    case 'pharmacy_owner':
      return [
        ...common,
        { icon: Pill, label: 'Dawa', path: '/dashboard' },
        { icon: Package, label: 'Maagizo', path: '/dashboard' },
        { icon: Activity, label: 'Maudhui', path: '/dashboard' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    case 'lab_owner':
      return [
        ...common,
        { icon: FlaskConical, label: 'Vipimo', path: '/dashboard' },
        { icon: Package, label: 'Maombi', path: '/dashboard' },
        { icon: Activity, label: 'Maudhui', path: '/dashboard' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    case 'polyclinic_owner':
      return [
        ...common,
        { icon: Stethoscope, label: 'Madaktari', path: '/dashboard' },
        { icon: Package, label: 'Huduma', path: '/dashboard' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    case 'super_admin':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Watumiaji', path: '/dashboard' },
        { icon: Stethoscope, label: 'Madaktari', path: '/dashboard' },
        { icon: Building2, label: 'Hospitali', path: '/dashboard' },
        { icon: Pill, label: 'Famasi', path: '/dashboard' },
        { icon: FlaskConical, label: 'Maabara', path: '/dashboard' },
        { icon: Shield, label: 'Usalama', path: '/dashboard' },
        { icon: Settings, label: 'Mipangilio', path: '/profile' },
      ];
    default:
      return common;
  }
}

export function RoleSidebar({ open, onClose }: RoleSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState('patient');

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

  if (!user) return null;

  const navItems = getNavItems(userRole);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">TeleMed</span>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* User Info */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {user.user_metadata?.first_name?.[0] || user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">
              {user.user_metadata?.first_name} {user.user_metadata?.last_name}
            </p>
            <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0">
              {roleLabels[userRole] || userRole}
            </Badge>
          </div>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: fixed sidebar
  if (!open) return null;

  return (
    <aside className="hidden md:flex w-56 shrink-0 border-r border-border bg-card h-[calc(100vh-2.5rem)] sticky top-10">
      {sidebarContent}
    </aside>
  );
}
