import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, DatabaseZap, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function DirectoryBackfill() {
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_backfill_directory' as any, { _dry_run: dryRun } as any);
    setBusy(false);
    if (error) {
      toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
      return;
    }
    setPreview(data);
    if (!dryRun) {
      setDone(true);
      toast({ title: 'Imekamilika', description: 'Madaktari na mashirika yaliyothibitishwa yamepakiwa kwenye orodha ya umma.' });
    }
  };

  const rows = preview
    ? [
        { label: 'Madaktari', value: preview.doctors },
        { label: 'Hospitali', value: preview.hospitals },
        { label: 'Polyclinics', value: preview.polyclinics },
        { label: 'Maduka ya dawa', value: preview.pharmacies },
        { label: 'Maabara', value: preview.laboratories },
      ]
    : [];

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 border-0 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <DatabaseZap className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Pakia orodha ya umma</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Huthibitisha madaktari na mashirika yenye hati za leseni ili waonekane kwa wagonjwa.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1 rounded-2xl" disabled={busy} onClick={() => run(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kagua kwanza'}
          </Button>
          <Button className="flex-1 rounded-2xl" disabled={busy || !preview} onClick={() => run(false)}>
            <Upload className="h-4 w-4 mr-1.5" /> Pakia
          </Button>
        </div>
      </Card>

      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rows.map((r) => (
            <Card key={r.label} className="rounded-3xl p-4 border-0 shadow-sm text-center">
              <p className="text-2xl font-bold">{r.value ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{r.label}</p>
            </Card>
          ))}
        </div>
      )}

      {done && (
        <Card className="rounded-3xl p-4 border-0 shadow-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm">Orodha imesasishwa.</p>
        </Card>
      )}
    </div>
  );
}
