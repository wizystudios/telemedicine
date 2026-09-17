import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function DemoSeeder() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_seed_demo_data' as any);
    setBusy(false);
    if (error) {
      toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
      return;
    }
    setResult(data);
    toast({ title: 'Imekamilika', description: 'Hospitali, daktari na miadi ya mfano vimeundwa.' });
  };

  const creds = result?.credentials;

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 border-0 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Jaza data ya mfano</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Huunda hospitali moja, mmiliki wake, daktari aliyethibitishwa mwenye ratiba ya wiki,
              mgonjwa wa mfano na miadi miwili ili chati na orodha zionekane mara moja.
            </p>
          </div>
        </div>
        <Button className="w-full rounded-2xl mt-4" disabled={busy} onClick={run}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unda data ya mfano'}
        </Button>
        <p className="text-[11px] text-muted-foreground mt-2">
          Ukibonyeza tena haitarudia — data ileile itatumika.
        </p>
      </Card>

      {creds && (
        <Card className="rounded-3xl p-4 border-0 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-sm font-semibold">Akaunti za mfano</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Mmiliki: {creds.owner}</p>
            <p>Daktari: {creds.doctor}</p>
            <p>Mgonjwa: {creds.patient}</p>
            <p>Nenosiri: {creds.password}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
