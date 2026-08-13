import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, X, FileText, Building2, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const TYPES = [
  { key: 'pending', label: 'Zinasubiri' },
  { key: 'approved', label: 'Zilizokubaliwa' },
  { key: 'rejected', label: 'Zilizokataliwa' },
];

const TYPE_LABEL: Record<string, string> = {
  hospital: 'Hospitali',
  polyclinic: 'Polyclinic',
  pharmacy: 'Duka la dawa',
  laboratory: 'Maabara',
};

export default function AdminLicenseApprovals() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState('pending');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_license_queue' as any);
    if (error) toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    setRows((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDoc = async (url: string) => {
    if (!url) return;
    if (url.startsWith('http')) { window.open(url, '_blank'); return; }
    const { data } = await supabase.storage.from('org-documents').createSignedUrl(url, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast({ title: 'Hati haipatikani', variant: 'destructive' });
  };

  const act = async (row: any, approve: boolean) => {
    setBusy(row.org_id);
    const reason = approve ? null : prompt('Sababu ya kukataa:') || null;
    const { error } = await supabase.rpc('admin_review_org_license' as any, {
      _org_type: row.org_type, _org_id: row.org_id, _approve: approve, _reason: reason,
    } as any);
    if (error) toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    else { toast({ title: approve ? 'Leseni imekubaliwa' : 'Leseni imekataliwa' }); load(); }
    setBusy(null);
  };

  const visible = rows.filter((r) => {
    const status = r.org_approval_status || 'pending';
    if (tab === 'pending') return status !== 'approved' && status !== 'rejected';
    return status === tab;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-medium transition-all ${
                  tab === t.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </ScrollArea>
        <Button size="sm" variant="outline" className="h-9 rounded-2xl shrink-0" onClick={load}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center border-dashed">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Hakuna leseni katika kundi hili</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <Card key={`${r.org_type}-${r.org_id}`} className="rounded-3xl p-4 border-0 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{TYPE_LABEL[r.org_type] || r.org_type} • {r.address}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    BRELA: {r.brela_number || '—'} • TIN: {r.tin_number || '—'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant={r.is_verified ? 'secondary' : 'outline'} className="text-[10px]">
                      {r.is_verified ? 'Imethibitishwa' : (r.org_approval_status || 'pending')}
                    </Badge>
                    {r.license_document_url && (
                      <button onClick={() => openDoc(r.license_document_url)} className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                        <ExternalLink className="h-3 w-3" /> Angalia leseni
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 rounded-2xl" disabled={busy === r.org_id} onClick={() => act(r, false)}>
                  <X className="h-4 w-4 mr-1" /> Kataa
                </Button>
                <Button size="sm" className="flex-1 rounded-2xl" disabled={busy === r.org_id} onClick={() => act(r, true)}>
                  {busy === r.org_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Thibitisha</>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
