import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Stethoscope, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  orgType: 'hospital' | 'polyclinic';
  orgId: string;
}

export default function OrgDoctorApprovals({ orgType, orgId }: Props) {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const col = orgType === 'hospital' ? 'hospital_id' : 'polyclinic_id';
    const { data } = await (supabase
      .from('doctor_profiles') as any)
      .select('id, user_id, license_number, bio, experience_years, specialty_id, org_approval_status, specialties(name)')
      .eq(col, orgId)
      .eq('org_approval_status', 'pending_org');

    if (!data) { setPending([]); setLoading(false); return; }

    const userIds = data.map((d: any) => d.user_id).filter(Boolean);
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds)
      : { data: [] as any[] };

    const merged = data.map((d: any) => ({
      ...d,
      profile: profiles?.find((p: any) => p.id === d.user_id),
    }));
    setPending(merged);
    setLoading(false);
  }, [orgType, orgId]);

  useEffect(() => { load(); }, [load]);

  const act = async (doctorId: string, approve: boolean) => {
    setActingId(doctorId);
    const reason = approve ? null : prompt('Sababu ya kukataa (hiari):') || null;
    const { error } = await supabase.rpc('org_approve_doctor', {
      p_doctor_id: doctorId, p_approve: approve, p_reason: reason,
    } as any);
    if (error) {
      toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: approve ? 'Daktari amekubaliwa' : 'Daktari amekataliwa' });
      load();
    }
    setActingId(null);
  };

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (pending.length === 0) {
    return (
      <Card className="rounded-3xl p-6 text-center border-dashed">
        <Stethoscope className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Hakuna daktari anayesubiri idhini</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((d) => (
        <Card key={d.id} className="rounded-3xl p-4 border-0 shadow-sm">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {d.profile?.first_name?.[0]}{d.profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Dr. {d.profile?.first_name} {d.profile?.last_name}</p>
              <p className="text-xs text-muted-foreground truncate">{d.specialties?.name || 'General'} • {d.experience_years || 0} miaka</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Leseni: {d.license_number}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">Anasubiri</Badge>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="flex-1 rounded-2xl" disabled={actingId === d.id} onClick={() => act(d.id, false)}>
              <X className="h-4 w-4 mr-1" /> Kataa
            </Button>
            <Button size="sm" className="flex-1 rounded-2xl" disabled={actingId === d.id} onClick={() => act(d.id, true)}>
              {actingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Kubali</>}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
