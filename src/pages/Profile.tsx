import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProfileImageUpload } from '@/components/ProfileImageUpload';
import { Moon, Sun, Globe, LogOut, LayoutDashboard, KeyRound, ShoppingBag, FileText, Pill, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ROLE_LABEL: Record<string, string> = {
  patient: 'Mgonjwa',
  doctor: 'Daktari',
  hospital_owner: 'Mmiliki wa Hospitali',
  pharmacy_owner: 'Mmiliki wa Famasi',
  lab_owner: 'Mmiliki wa Maabara',
  polyclinic_owner: 'Mmiliki wa Polyclinic',
  super_admin: 'Super Admin',
  admin: 'Admin',
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const { theme, language, toggleTheme, setLanguage } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string>('patient');
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (!user) return;
    setProfile({
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      phone: user.user_metadata?.phone || '',
      avatar_url: user.user_metadata?.avatar_url || '',
    });
    // Fetch authoritative role from user_roles → fallback profiles → metadata
    (async () => {
      const { data: ur } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (ur?.role) { setRole(ur.role); return; }
      const { data: p } = await supabase
        .from('profiles').select('role, first_name, last_name, phone, avatar_url').eq('id', user.id).maybeSingle();
      if (p?.role) setRole(p.role);
      if (p) setProfile(prev => ({
        first_name: p.first_name || prev.first_name,
        last_name: p.last_name || prev.last_name,
        phone: p.phone || prev.phone,
        avatar_url: p.avatar_url || prev.avatar_url,
      }));
    })();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: profile });
      if (error) throw error;
      await supabase.from('profiles').update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      }).eq('id', user?.id);
      setIsEditing(false);
      toast({ title: 'Imehifadhiwa!' });
    } catch (e: any) {
      toast({ title: 'Kosa', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isOrgOwner = ['hospital_owner', 'pharmacy_owner', 'lab_owner', 'polyclinic_owner'].includes(role);
  const isPatient = role === 'patient';
  const isDoctor = role === 'doctor';

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-6">
        <div className="relative mb-3">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <ProfileImageUpload
              currentImageUrl={profile.avatar_url}
              userId={user?.id || ''}
              userName={`${profile.first_name} ${profile.last_name}`}
              onImageUpdate={(url) => setProfile({ ...profile, avatar_url: url })}
            />
          )}
        </div>
        <h2 className="text-lg font-bold">
          {profile.first_name} {profile.last_name}
        </h2>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <Badge variant="secondary" className="mt-1 text-[10px]">{ROLE_LABEL[role] || role}</Badge>
      </div>

      {/* Edit Form */}
      {isEditing ? (
        <div className="space-y-4 mb-6">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Jina la kwanza</span>
            <Input value={profile.first_name} onChange={e => setProfile({ ...profile, first_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Jina la familia</span>
            <Input value={profile.last_name} onChange={e => setProfile({ ...profile, last_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Simu</span>
            <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+255..." />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Inahifadhi...' : 'Hifadhi'}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Ghairi</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full mb-6" onClick={() => setIsEditing(true)}>
          Hariri Taarifa
        </Button>
      )}

      {/* Role-aware quick actions */}
      <div className="space-y-1 mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Vitendo</p>

        {(isOrgOwner || isDoctor || role === 'super_admin' || role === 'admin') && (
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-muted/50 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1">Dashboard yangu</span>
          </button>
        )}

        {isPatient && (
          <>
            <button
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-muted/50 transition-colors"
            >
              <Pill className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">Soko la Dawa</span>
            </button>
            <button
              onClick={() => navigate('/my-orders')}
              className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-muted/50 transition-colors"
            >
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">Maagizo Yangu</span>
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-muted/50 transition-colors"
            >
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">Cart Yangu</span>
            </button>
            <button
              onClick={() => navigate('/medical-records')}
              className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">Rekodi za Afya</span>
            </button>
          </>
        )}

        <button
          onClick={() => navigate('/force-password-change')}
          className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-muted/50 transition-colors"
        >
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1">Badili Nenosiri</span>
        </button>
      </div>

      {/* Settings */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Mipangilio</p>

        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm">Mandhari</span>
          </div>
          <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Lugha</span>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                { code: 'sw', name: 'Kiswahili' },
                { code: 'en', name: 'English' },
                { code: 'fr', name: 'Français' },
              ].map(l => (
                <SelectItem key={l.code} value={l.code} className="text-xs">{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 p-3 rounded-xl w-full text-left text-destructive hover:bg-destructive/5 transition-colors mt-4"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Ondoka</span>
        </button>
      </div>
    </div>
  );
}
