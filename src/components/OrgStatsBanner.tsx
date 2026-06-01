import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Eye, Users, CalendarCheck, FileText, Stethoscope, Clock } from 'lucide-react';

type OrgType = 'hospital' | 'polyclinic' | 'pharmacy' | 'laboratory';

interface Props {
  orgType: OrgType;
  orgId: string;
}

interface Stats {
  doctors: number;
  patients: number;
  visits_today: number;
  visits_7d: number;
  appointments_or_orders: number;
  content_count: number;
  pending_doctors: number;
}

export default function OrgStatsBanner({ orgType, orgId }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      const { data, error } = await supabase.rpc('org_dashboard_stats', {
        p_org_type: orgType,
        p_org_id: orgId,
      } as any);
      if (!error && data) setStats(data as any);
    };
    load();
  }, [orgType, orgId]);

  if (!stats) return null;

  const showDoctors = orgType === 'hospital' || orgType === 'polyclinic';
  const apptLabel = orgType === 'pharmacy' ? 'Maagizo' : orgType === 'laboratory' ? 'Vipimo' : 'Miadi';

  const items = [
    { icon: Eye, label: 'Wameingia leo', value: stats.visits_today, color: 'text-info' },
    { icon: Clock, label: 'Wiki hii', value: stats.visits_7d, color: 'text-primary' },
    { icon: Users, label: 'Wateja', value: stats.patients, color: 'text-emerald-600' },
    { icon: CalendarCheck, label: apptLabel, value: stats.appointments_or_orders, color: 'text-amber-600' },
    ...(showDoctors ? [{ icon: Stethoscope, label: 'Madaktari', value: stats.doctors, color: 'text-purple-600' }] : []),
    { icon: FileText, label: 'Maudhui', value: stats.content_count, color: 'text-rose-600' },
  ];

  return (
    <Card className="rounded-3xl p-4 border-0 shadow-sm bg-gradient-to-br from-primary/5 to-accent/30">
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="flex flex-col items-start p-2 rounded-2xl bg-card/60 backdrop-blur-sm">
              <Icon className={`h-4 w-4 mb-1 ${it.color}`} />
              <span className="text-lg font-bold leading-none">{it.value}</span>
              <span className="text-[10px] text-muted-foreground mt-1 leading-tight">{it.label}</span>
            </div>
          );
        })}
      </div>
      {stats.pending_doctors > 0 && showDoctors && (
        <div className="mt-3 text-xs px-3 py-2 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
          🔔 Madaktari {stats.pending_doctors} wanasubiri idhini yako
        </div>
      )}
    </Card>
  );
}
