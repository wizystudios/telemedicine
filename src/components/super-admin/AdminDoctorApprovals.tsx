import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, FileText, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminDoctorApprovals() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('doctor_profiles')
      .select('id, user_id, license_number, experience_years, hospital_id, polyclinic_id, org_approval_status, hospital_name, polyclinic_name, specialties(name)')
      .eq('org_approval_status', 'pending_admin');

    if (!data) { setList([]); setLoading(false); return; }
    const userIds = data.map((d: any) => d.user_id).filter(Boolean);
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
      : { data: [] as any[] };
    setList(data.map((d: any) => ({ ...d, profile: profiles?.find((p: any) => p.id === d.user_id) })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, approve: boolean) => {
    setBusy(id);
    const reason = approve ? null : prompt('Sababu ya kukataa:') || null;
    const { error } = await supabase.rpc('admin_approve_doctor', {
      p_doctor_id: id, p_approve: approve, p_reason: reason,
    } as any);
    if (error) toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    else { toast({ title: approve ? 'Daktari amethibitishwa' : 'Daktari amekataliwa' }); load(); }
    setBusy(null);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (list.length === 0) {
    return (
      <Card className="rounded-3xl p-8 text-center border-dashed">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Hakuna daktari anayesubiri uthibitisho wa mwisho</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((d) => (
        <Card key={d.id} className="rounded-3xl p-4 border-0 shadow-sm">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {d.profile?.first_name?.[0]}{d.profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Dr. {d.profile?.first_name} {d.profile?.last_name}</p>
              <p className="text-xs text-muted-foreground">{d.specialties?.name || 'General'} • {d.experience_years || 0} mi.</p>
              <p className="text-[11px] text-muted-foreground">Leseni: {d.license_number}</p>
              {(d.hospital_name || d.polyclinic_name) && (
                <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {d.hospital_name || d.polyclinic_name}
                </div>
              )}
              <Badge variant="outline" className="mt-1 text-[10px]">Org imekubali — subiri admin</Badge>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="flex-1 rounded-2xl" disabled={busy === d.id} onClick={() => act(d.id, false)}>
              <X className="h-4 w-4 mr-1" /> Kataa
            </Button>
            <Button size="sm" className="flex-1 rounded-2xl" disabled={busy === d.id} onClick={() => act(d.id, true)}>
              {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Thibitisha</>}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
