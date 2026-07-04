import { useEffect, useState } from 'react';
import { Download, Trash2, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';

export function GdprPanel() {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [request, setRequest] = useState<any>(null);

  useEffect(() => { void refresh(); }, []);

  const refresh = async () => {
    const { data } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('status', 'pending')
      .maybeSingle();
    setRequest(data);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const url = `https://ydqrorzkrwesnehagfdx.supabase.co/functions/v1/gdpr-export`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const dl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dl;
      a.download = `my-telemed-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(dl);
      toast({ title: 'Data yako imepakuliwa ✅', description: 'Faili la JSON limehifadhiwa.' });
    } catch (e: any) {
      toast({ title: 'Hitilafu', description: e.message, variant: 'destructive' });
    } finally { setExporting(false); }
  };

  const requestDeletion = async () => {
    setDeleting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('gdpr-delete-account', {
        body: { action: 'request' },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      if (error) throw error;
      await refresh();
      toast({ title: 'Ombi la kufuta limepokelewa', description: 'Akaunti yako itafutwa baada ya siku 30. Unaweza kughairi wakati wowote.' });
    } catch (e: any) {
      toast({ title: 'Hitilafu', description: e.message, variant: 'destructive' });
    } finally { setDeleting(false); }
  };

  const cancelDeletion = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      await supabase.functions.invoke('gdpr-delete-account', {
        body: { action: 'cancel' },
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
      });
      await refresh();
      toast({ title: 'Ombi limeghairiwa ✅' });
    } catch (e: any) {
      toast({ title: 'Hitilafu', description: e.message, variant: 'destructive' });
    }
  };

  const daysLeft = request?.scheduled_for
    ? Math.max(0, Math.ceil((new Date(request.scheduled_for).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Haki Zangu (GDPR)</p>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Download className="h-4 w-4 text-muted-foreground" />}
        <div className="flex-1">
          <p className="text-sm">Pakua data yangu</p>
          <p className="text-[11px] text-muted-foreground">Nakala kamili ya data yako kama JSON</p>
        </div>
      </button>

      {request ? (
        <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Akaunti yako itafutwa</p>
              <p className="text-xs text-muted-foreground">Muda uliobaki: siku {daysLeft} · Itafutwa {new Date(request.scheduled_for).toLocaleDateString('sw-TZ')}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full rounded-xl" onClick={cancelDeletion}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Ghairi ombi
          </Button>
        </div>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-3 p-3 rounded-xl w-full text-left text-destructive hover:bg-destructive/5 transition-colors">
              <Trash2 className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-sm">Futa akaunti yangu</p>
                <p className="text-[11px] opacity-70">Muda wa uvumilivu wa siku 30</p>
              </div>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Una uhakika?</AlertDialogTitle>
              <AlertDialogDescription>
                Akaunti yako itafutwa baada ya siku 30. Ndani ya muda huo unaweza kuingia na kughairi. Baada ya hapo, data yote itafutwa kabisa na haitaweza kurejeshwa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Sitisha</AlertDialogCancel>
              <AlertDialogAction onClick={requestDeletion} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Naam, futa'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
