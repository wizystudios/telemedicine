import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, RefreshCw, ShieldCheck, Search, FileText, LogIn, MessageSquare,
  Paperclip, Download, Printer, ShieldAlert,
} from 'lucide-react';
import { AUDIT_LABELS } from '@/lib/audit';
import { toast } from '@/hooks/use-toast';

const FILTERS = [
  { key: 'all', label: 'Zote', icon: FileText },
  { key: 'login', label: 'Kuingia', icon: LogIn },
  { key: 'chat', label: 'Ujumbe', icon: MessageSquare },
  { key: 'file', label: 'Mafaili', icon: Paperclip },
];

function matchesFilter(eventType: string, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'login') return eventType.startsWith('login') || eventType === 'logout' || eventType.startsWith('biometric');
  if (filter === 'chat') return eventType.startsWith('chat_');
  if (filter === 'file') return eventType.startsWith('attachment_');
  return true;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface Props {
  /** When provided the log is scoped to a single organisation (used by org owners). */
  orgType?: 'hospital' | 'polyclinic' | 'pharmacy' | 'laboratory';
  orgId?: string;
}

export default function AuditLogView({ orgType, orgId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 864e5)));
  const [to, setTo] = useState(() => isoDate(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    setDenied(null);
    const { data, error } = await supabase.rpc('admin_audit_logs' as any, {
      _from: new Date(`${from}T00:00:00`).toISOString(),
      _to: new Date(`${to}T23:59:59`).toISOString(),
      _org_type: orgType ?? null,
      _org_id: orgId ?? null,
      _limit: 2000,
    } as any);

    if (error) {
      setDenied(error.message.includes('authorized') ? 'Huna ruhusa ya kuona kumbukumbu hizi.' : error.message);
      setRows([]);
    } else {
      setRows((data as any[]) || []);
    }
    setLoading(false);
  }, [from, to, orgType, orgId]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => rows.filter((r) => {
    if (!matchesFilter(r.event_type, filter)) return false;
    if (!q.trim()) return true;
    const hay = `${r.event_type} ${r.description || ''} ${r.entity_type || ''} ${r.actor_name || ''}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }), [rows, filter, q]);

  const exportCsv = () => {
    if (!visible.length) { toast({ title: 'Hakuna data ya kupakua' }); return; }
    const head = ['Tarehe', 'Tukio', 'Mtumiaji', 'Nafasi', 'Kitu', 'Maelezo'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = visible.map((r) => [
      new Date(r.created_at).toISOString(),
      AUDIT_LABELS[r.event_type] || r.event_type,
      r.actor_name || '—',
      r.actor_role || '—',
      r.entity_type || '—',
      r.description || '—',
    ].map(esc).join(','));
    const csv = '\uFEFF' + [head.map(esc).join(','), ...body].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV imepakuliwa', description: `${visible.length} matukio` });
  };

  const exportPdf = () => {
    if (!visible.length) { toast({ title: 'Hakuna data ya kupakua' }); return; }
    const esc = (s: any) => String(s ?? '—').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Kumbukumbu za Mfumo ${from} – ${to}</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px} p.sub{color:#666;font-size:12px;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{text-align:left;background:#f4f6f8;padding:6px;border-bottom:1px solid #ddd}
        td{padding:6px;border-bottom:1px solid #eee;vertical-align:top}
      </style></head><body>
      <h1>TeleMed — Kumbukumbu za Mfumo</h1>
      <p class="sub">${from} – ${to} • ${visible.length} matukio • Imetolewa ${new Date().toLocaleString('sw-TZ')}</p>
      <table><thead><tr><th>Tarehe</th><th>Tukio</th><th>Mtumiaji</th><th>Nafasi</th><th>Maelezo</th></tr></thead><tbody>
      ${visible.map((r) => `<tr><td>${esc(new Date(r.created_at).toLocaleString('sw-TZ'))}</td><td>${esc(AUDIT_LABELS[r.event_type] || r.event_type)}</td><td>${esc(r.actor_name)}</td><td>${esc(r.actor_role)}</td><td>${esc(r.description)}</td></tr>`).join('')}
      </tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast({ title: 'Ruhusu pop-up ili kupakua PDF', variant: 'destructive' }); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta tukio au mtumiaji..."
            className="pl-9 h-11 rounded-2xl border-0 bg-muted/40"
          />
        </div>
        <Button variant="outline" size="sm" className="h-11 rounded-2xl" onClick={load}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="rounded-3xl p-4 border-0 shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Kuanzia</p>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-2xl border-0 bg-muted/40" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Hadi</p>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-2xl border-0 bg-muted/40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-2xl h-10" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" className="flex-1 rounded-2xl h-10" onClick={exportPdf}>
            <Printer className="h-4 w-4 mr-1.5" /> PDF
          </Button>
        </div>
      </Card>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-medium transition-all ${
                filter === f.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
              }`}
            >
              <f.icon className="h-3.5 w-3.5" /> {f.label}
            </button>
          ))}
        </div>
      </ScrollArea>

      {denied ? (
        <Card className="rounded-3xl p-8 text-center border-dashed">
          <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-muted-foreground">{denied}</p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center border-dashed">
          <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Hakuna matukio katika kipindi hiki</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground px-1">{visible.length} matukio</p>
          {visible.map((r) => (
            <Card key={r.id} className="rounded-3xl p-4 border-0 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{AUDIT_LABELS[r.event_type] || r.event_type}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.actor_name || 'Mtumiaji'}
                    {r.actor_role ? ` • ${r.actor_role}` : ''}
                    {r.entity_type ? ` • ${r.entity_type}` : ''}
                  </p>
                  {r.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {new Date(r.created_at).toLocaleString('sw-TZ', { dateStyle: 'short', timeStyle: 'short' })}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
