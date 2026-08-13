import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, ShieldCheck, Search, FileText, LogIn, MessageSquare, Paperclip } from 'lucide-react';
import { AUDIT_LABELS } from '@/lib/audit';

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

export default function AuditLogView() {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from('audit_logs' as any) as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    const list = (data as any[]) || [];
    const ids = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids as string[]);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = rows.filter((r) => {
    if (!matchesFilter(r.event_type, filter)) return false;
    if (!q.trim()) return true;
    const p = profiles[r.user_id];
    const hay = `${r.event_type} ${r.description || ''} ${r.entity_type || ''} ${p?.first_name || ''} ${p?.last_name || ''}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

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

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center border-dashed">
          <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Hakuna matukio bado</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => {
            const p = profiles[r.user_id];
            return (
              <Card key={r.id} className="rounded-3xl p-4 border-0 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{AUDIT_LABELS[r.event_type] || r.event_type}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Mtumiaji' : 'Mtumiaji'}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
