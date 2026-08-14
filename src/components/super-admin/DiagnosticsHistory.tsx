import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, CalendarClock, Play, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Status = 'pass' | 'warn' | 'fail';

const icon = (s: Status) =>
  s === 'pass' ? <CheckCircle2 className="h-4 w-4 text-green-600" />
    : s === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-500" />
    : <XCircle className="h-4 w-4 text-destructive" />;

interface Props {
  orgType?: 'hospital' | 'polyclinic' | 'pharmacy' | 'laboratory';
  orgId?: string;
}

export default function DiagnosticsHistory({ orgType, orgId }: Props) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase.from('diagnostics_runs' as any) as any)
      .select('*').order('created_at', { ascending: false }).limit(20);
    if (orgType && orgId) q = q.eq('org_type', orgType).eq('org_id', orgId);
    const { data, error } = await q;
    if (error) setDenied(true);
    setRuns((data as any[]) || []);
    setLoading(false);
  }, [orgType, orgId]);

  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc('admin_run_diagnostics' as any, {} as any);
    if (error) {
      toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    } else {
      const r = data as any;
      toast({
        title: 'Uchunguzi umekamilika',
        description: `${r.passed} sawa • ${r.warned} tahadhari • ${r.failed} matatizo`,
      });
      await load();
    }
    setRunning(false);
  };

  if (denied) {
    return (
      <Card className="rounded-3xl p-8 text-center border-dashed">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-muted-foreground">Huna ruhusa ya kuona ripoti za uchunguzi.</p>
      </Card>
    );
  }

  const latest = runs[0];

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 border-0 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-primary" /> Uchunguzi wa kiotomatiki
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hujiendesha kila siku saa 2:00 usiku — hukagua viungo vya madaktari, mazungumzo, mafaili na mashirika.
            </p>
          </div>
          {!orgType && (
            <Button className="rounded-2xl shrink-0" onClick={runNow} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-1.5" />Kagua sasa</>}
            </Button>
          )}
        </div>

        {latest && (
          <div className="flex items-center gap-2 mt-4">
            <Badge variant={latest.failed ? 'destructive' : 'secondary'} className="rounded-xl">
              {latest.failed ? `${latest.failed} matatizo` : 'Kila kitu kiko sawa'}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {latest.passed} sawa • {latest.warned} tahadhari • {new Date(latest.created_at).toLocaleString('sw-TZ', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : runs.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center border-dashed">
          <CalendarClock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Bado hakuna ripoti. Ya kwanza itatolewa usiku wa leo.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Card key={run.id} className="rounded-3xl p-4 border-0 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">
                  {new Date(run.created_at).toLocaleString('sw-TZ', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <Badge variant="outline" className="text-[10px] rounded-xl">
                  {run.source === 'scheduled' ? 'Kiotomatiki' : 'Mwongozo'}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {(run.results || []).map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5">{icon(r.status)}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground break-words">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
