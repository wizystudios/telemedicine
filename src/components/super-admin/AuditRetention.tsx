import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Timer, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const OPTIONS = [30, 90, 365];

export default function AuditRetention() {
  const [days, setDays] = useState(365);
  const [autoPurge, setAutoPurge] = useState(false);
  const [preview, setPreview] = useState<{ to_delete: number; oldest: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [denied, setDenied] = useState(false);

  const loadPreview = async (d: number) => {
    const { data, error } = await supabase.rpc('audit_retention_preview' as any, { _days: d } as any);
    if (error) { setDenied(true); return; }
    setPreview(data as any);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.from('system_settings' as any) as any)
        .select('value').eq('key', 'audit_retention').maybeSingle();
      if (error) setDenied(true);
      const v = (data as any)?.value;
      const d = v?.days ?? 365;
      setDays(d);
      setAutoPurge(!!v?.auto_purge);
      await loadPreview(d);
      setLoading(false);
    })();
  }, []);

  const save = async (nextDays: number, nextAuto: boolean) => {
    setSaving(true);
    setDays(nextDays);
    setAutoPurge(nextAuto);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from('system_settings' as any) as any).upsert(
      { key: 'audit_retention', value: { days: nextDays, auto_purge: nextAuto }, updated_by: user?.id },
      { onConflict: 'key' },
    );
    if (error) toast({ title: 'Imeshindwa kuhifadhi', description: error.message, variant: 'destructive' });
    else toast({ title: 'Imehifadhiwa', description: `Kumbukumbu zitahifadhiwa siku ${nextDays}.` });
    await loadPreview(nextDays);
    setSaving(false);
  };

  const purge = async () => {
    setPurging(true);
    const { data, error } = await supabase.rpc('purge_audit_logs' as any, { _days: days } as any);
    if (error) toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    else toast({ title: 'Usafishaji umekamilika', description: `Matukio ${(data as any)?.deleted ?? 0} yameondolewa.` });
    await loadPreview(days);
    setPurging(false);
    setConfirmOpen(false);
  };

  if (denied) {
    return (
      <Card className="rounded-3xl p-8 text-center border-dashed">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-muted-foreground">Huna ruhusa ya kubadilisha muda wa kuhifadhi kumbukumbu.</p>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 border-0 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Timer className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Muda wa kuhifadhi kumbukumbu</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Matukio yatakayozidi muda uliochaguliwa yanaweza kufutwa ili kulinda faragha.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((d) => (
            <button
              key={d}
              disabled={saving}
              onClick={() => save(d, autoPurge)}
              className={`rounded-2xl py-3 text-sm font-medium transition-all ${
                days === d ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Siku {d}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/30 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Usafishaji otomatiki</p>
            <p className="text-[11px] text-muted-foreground">Hufanyika kila Jumapili saa 3:30 usiku.</p>
          </div>
          <Switch checked={autoPurge} disabled={saving} onCheckedChange={(v) => save(days, v)} />
        </div>
      </Card>

      <Card className="rounded-3xl p-5 border-0 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Hakiki kabla ya kufuta</p>
          <Badge variant={preview?.to_delete ? 'destructive' : 'secondary'} className="rounded-xl">
            {preview?.to_delete ?? 0} matukio
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {preview?.oldest
            ? `Kongwe zaidi: ${new Date(preview.oldest).toLocaleDateString('sw-TZ')}. Matukio ${preview.to_delete} yamezidi siku ${days}.`
            : `Hakuna matukio yaliyozidi siku ${days}.`}
        </p>
        <Button
          variant="destructive"
          className="w-full rounded-2xl"
          disabled={!preview?.to_delete || purging}
          onClick={() => setConfirmOpen(true)}
        >
          {purging ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1.5" />Futa sasa</>}
        </Button>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Futa kumbukumbu za zamani?</AlertDialogTitle>
            <AlertDialogDescription>
              Matukio {preview?.to_delete ?? 0} yaliyozidi siku {days} yatafutwa kabisa. Kitendo hiki hakirudishwi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Ghairi</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl bg-destructive text-destructive-foreground" onClick={purge}>
              Ndiyo, futa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
