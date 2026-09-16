import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminCreate } from '@/lib/adminCreate';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, Loader2, Upload, CheckCircle2, XCircle, Download } from 'lucide-react';

const HEADERS = [
  'orgType', 'name', 'address', 'orgPhone', 'orgEmail', 'brelaNumber', 'tinNumber',
  'ownerFirstName', 'ownerLastName', 'ownerEmail', 'ownerPassword',
];

const TEMPLATE = `${HEADERS.join(',')}
hospital,Hospitali ya Mfano,Mikocheni Dar es Salaam,+255700000001,info@mfano.co.tz,BRELA-123,TIN-456,Asha,Juma,asha@mfano.co.tz,Nenosiri@123
pharmacy,Duka la Afya,Kariakoo Dar es Salaam,+255700000002,info@afya.co.tz,BRELA-124,TIN-457,Juma,Ally,juma@afya.co.tz,Nenosiri@123`;

type Row = Record<string, string>;
type Result = { name: string; ok: boolean; message?: string };

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const cols = lines[0].split(',').map((c) => c.trim());
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    const row: Row = {};
    cols.forEach((c, i) => { row[c] = (cells[i] || '').trim(); });
    return row;
  });
}

export default function BulkOrgImport({ onDone }: { onDone?: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      toast({ title: 'Faili tupu', description: 'Hakuna safu zilizosomeka kwenye CSV.', variant: 'destructive' });
      return;
    }
    setResults([]);
    setRows(parsed);
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mashirika-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = async () => {
    setBusy(true);
    const out: Result[] = [];
    for (const r of rows) {
      const label = r.name || r.ownerEmail || 'Bila jina';
      try {
        if (!r.orgType || !r.name || !r.address || !r.ownerEmail || !r.ownerPassword) {
          throw new Error('Safu haina orgType, jina, anwani au taarifa za mmiliki');
        }
        await adminCreate('create_organization', {
          orgType: r.orgType.toLowerCase(),
          name: r.name,
          address: r.address,
          orgPhone: r.orgPhone || undefined,
          orgEmail: r.orgEmail || undefined,
          brelaNumber: r.brelaNumber || undefined,
          tinNumber: r.tinNumber || undefined,
          ownerFirstName: r.ownerFirstName,
          ownerLastName: r.ownerLastName,
          ownerEmail: r.ownerEmail,
          ownerPassword: r.ownerPassword,
          autoApprove: false,
        });
        out.push({ name: label, ok: true });
      } catch (e: any) {
        out.push({ name: label, ok: false, message: e.message || 'Imeshindwa' });
      }
      setResults([...out]);
    }
    setBusy(false);
    const ok = out.filter((o) => o.ok).length;
    toast({
      title: 'Upakiaji umekamilika',
      description: `${ok} kati ya ${out.length} mashirika yamesajiliwa. Pakia leseni kabla ya kuidhinisha.`,
    });
    onDone?.();
  };

  return (
    <Card className="rounded-3xl border-0 shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Sajili mashirika mengi kwa CSV</p>
          <p className="text-[11px] text-muted-foreground">
            Kila safu huunda shirika na mmiliki wake. Hati za leseni hupakiwa baadaye kabla ya idhini.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" className="rounded-xl text-[11px]" onClick={downloadTemplate}>
          <Download className="h-3 w-3 mr-1" /> Pakua kiolezo
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0] || null)} />
        <Button type="button" size="sm" variant="outline" className="rounded-xl text-[11px]" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3 w-3 mr-1" /> Chagua faili la CSV
        </Button>
        {rows.length > 0 && <Badge variant="secondary" className="rounded-xl text-[11px]">{rows.length} safu</Badge>}
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="max-h-40 overflow-y-auto rounded-2xl border border-border/60 divide-y divide-border/60">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
                <span className="truncate">{r.name}</span>
                <span className="text-muted-foreground shrink-0">{r.orgType}</span>
              </div>
            ))}
          </div>
          <Button type="button" className="w-full rounded-2xl" disabled={busy} onClick={run}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Sajili mashirika ${rows.length}`}
          </Button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
              <span className="truncate">{r.name}</span>
              {!r.ok && <span className="text-muted-foreground">— {r.message}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
