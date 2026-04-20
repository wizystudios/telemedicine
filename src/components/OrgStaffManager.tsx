import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, Users, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrgStaffManagerProps {
  orgType: 'hospital' | 'pharmacy' | 'laboratory' | 'polyclinic';
  orgId: string;
}

const PERMISSION_OPTIONS = [
  { key: 'manage_orders', label: 'Simamia Maagizo' },
  { key: 'manage_inventory', label: 'Simamia Bidhaa/Dawa' },
  { key: 'manage_doctors', label: 'Simamia Madaktari' },
  { key: 'manage_services', label: 'Simamia Huduma' },
  { key: 'view_reports', label: 'Tazama Ripoti' },
  { key: 'manage_content', label: 'Simamia Maudhui' },
  { key: 'reply_messages', label: 'Jibu Ujumbe' },
];

interface Staff {
  id: string;
  user_id: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  profile?: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null };
}

export default function OrgStaffManager({ orgType, orgId }: OrgStaffManagerProps) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('org_staff')
      .select('*')
      .eq('org_type', orgType)
      .eq('org_id', orgId);
    if (!data) { setStaff([]); setLoading(false); return; }
    // Fetch profiles separately
    const ids = data.map(s => s.user_id);
    const { data: profs } = ids.length
      ? await supabase.from('profiles').select('id, first_name, last_name, email, avatar_url').in('id', ids)
      : { data: [] as any[] };
    setStaff(data.map(s => ({
      ...s,
      permissions: (s.permissions as any) || {},
      profile: profs?.find(p => p.id === s.user_id) || undefined,
    })) as Staff[]);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, [orgId, orgType]);

  const handleAdd = async () => {
    if (!email.trim() || !user) return;
    setAdding(true);
    try {
      // Find user by email in profiles
      const { data: prof } = await supabase
        .from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (!prof) {
        toast({ title: 'Mtumiaji hapatikani', description: 'Hakuna account na barua pepe hii.', variant: 'destructive' });
        setAdding(false); return;
      }
      const { error } = await supabase.from('org_staff').insert({
        org_type: orgType,
        org_id: orgId,
        user_id: prof.id,
        invited_by: user.id,
        permissions: perms,
        is_active: true,
      } as any);
      if (error) throw error;
      toast({ title: 'Mfanyakazi ameongezwa' });
      setOpen(false);
      setEmail(''); setPerms({});
      fetchStaff();
    } catch (e: any) {
      toast({ title: 'Kosa', description: e.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const togglePerm = async (id: string, key: string, current: Record<string, boolean>) => {
    const next = { ...current, [key]: !current[key] };
    await supabase.from('org_staff').update({ permissions: next as any }).eq('id', id);
    fetchStaff();
  };

  const removeStaff = async (id: string) => {
    if (!confirm('Ondoa mfanyakazi huyu?')) return;
    await supabase.from('org_staff').delete().eq('id', id);
    toast({ title: 'Ameondolewa' });
    fetchStaff();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Wafanyakazi ({staff.length})</h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Ongeza Mfanyakazi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ongeza Mfanyakazi</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Barua pepe ya mfanyakazi</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mfanyakazi@example.com"
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mtumiaji lazima awe tayari amesajili account.
                </p>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Ruhusa (chagua zinazohitajika)</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {PERMISSION_OPTIONS.map(p => (
                    <div key={p.key} className="flex items-center gap-2">
                      <Checkbox
                        id={p.key}
                        checked={!!perms[p.key]}
                        onCheckedChange={(v) => setPerms({ ...perms, [p.key]: !!v })}
                      />
                      <label htmlFor={p.key} className="text-xs cursor-pointer">{p.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={handleAdd} disabled={adding || !email.trim()} className="w-full">
                {adding ? 'Inaongezwa...' : 'Ongeza'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-center text-xs text-muted-foreground py-4">Inapakia...</p>}

      {!loading && staff.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Hakuna wafanyakazi waliongezwa.</p>
        </div>
      )}

      <div className="space-y-2">
        {staff.map(s => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {s.profile?.first_name || ''} {s.profile?.last_name || ''}
                  {!s.profile?.first_name && !s.profile?.last_name && (s.profile?.email || s.user_id.slice(0, 8))}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{s.profile?.email}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeStaff(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {PERMISSION_OPTIONS.map(p => {
                const enabled = !!s.permissions[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePerm(s.id, p.key, s.permissions)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                      enabled
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
