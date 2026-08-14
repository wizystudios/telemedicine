import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Activity } from 'lucide-react';
import { logAudit } from '@/lib/audit';

type Status = 'pass' | 'fail' | 'warn';
interface Result { name: string; status: Status; detail: string }

export default function SystemDiagnostics() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  const run = async () => {
    setRunning(true);
    setResults([]);
    const out: Result[] = [];
    const push = (r: Result) => { out.push(r); setResults([...out]); };

    // 1. Public doctor directory
    try {
      const { data, error } = await (supabase.from('public_doctors' as any) as any).select('id, first_name, is_verified').limit(50);
      if (error) push({ name: 'Orodha ya madaktari', status: 'fail', detail: error.message });
      else if (!data?.length) push({ name: 'Orodha ya madaktari', status: 'warn', detail: 'Hakuna daktari kwenye orodha ya umma.' });
      else push({ name: 'Orodha ya madaktari', status: 'pass', detail: `${data.length} madaktari wanapatikana.` });
    } catch (e: any) { push({ name: 'Orodha ya madaktari', status: 'fail', detail: e.message }); }

    // 2. Doctor profile links resolve
    try {
      const { data } = await (supabase.from('public_doctors' as any) as any).select('id').limit(10);
      const ids = (data as any[])?.map((d) => d.id) || [];
      let broken = 0;
      for (const id of ids) {
        const { data: one } = await (supabase.from('public_doctors' as any) as any).select('id').eq('id', id).maybeSingle();
        if (!one) broken++;
      }
      push({
        name: 'Viungo vya wasifu wa daktari',
        status: broken === 0 ? 'pass' : 'fail',
        detail: broken === 0 ? `Viungo ${ids.length} vyote vinafunguka.` : `${broken} viungo havifunguki.`,
      });
    } catch (e: any) { push({ name: 'Viungo vya wasifu wa daktari', status: 'fail', detail: e.message }); }

    // 3. Doctors with no matching profile row
    try {
      const { data: dps } = await supabase.from('doctor_profiles').select('user_id').limit(200);
      const ids = (dps || []).map((d: any) => d.user_id).filter(Boolean);
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('id, role').in('id', ids)
        : { data: [] as any[] };
      const missing = ids.filter((id: string) => !(profs || []).some((p: any) => p.id === id));
      const wrongRole = (profs || []).filter((p: any) => p.role !== 'doctor');
      push({
        name: 'Uhusiano wa daktari ↔ wasifu',
        status: missing.length === 0 && wrongRole.length === 0 ? 'pass' : 'warn',
        detail: `${missing.length} bila wasifu, ${wrongRole.length} wenye nafasi isiyo sahihi.`,
      });
    } catch (e: any) { push({ name: 'Uhusiano wa daktari ↔ wasifu', status: 'fail', detail: e.message }); }

    // 4. Chat threads
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true });
      if (error) push({ name: 'Mazungumzo (chat)', status: 'fail', detail: error.message });
      else push({ name: 'Mazungumzo (chat)', status: 'pass', detail: `Jumla ya ujumbe: ${count ?? 0}.` });
    } catch (e: any) { push({ name: 'Mazungumzo (chat)', status: 'fail', detail: e.message }); }

    // 5. Attachment upload + signed download round trip
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Hujaingia');
      const path = `${user.id}/diagnostics-${Date.now()}.txt`;
      const blob = new Blob(['telemed diagnostics'], { type: 'text/plain' });
      const { error: upErr } = await supabase.storage.from('chat-attachments').upload(path, blob);
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 60);
      if (sErr || !signed?.signedUrl) throw sErr || new Error('Signed URL failed');
      const res = await fetch(signed.signedUrl);
      await supabase.storage.from('chat-attachments').remove([path]);
      push({
        name: 'Kupakia / kupakua mafaili',
        status: res.ok ? 'pass' : 'fail',
        detail: res.ok ? 'Upload, signed URL na download vimefanikiwa.' : `Download imeshindwa (${res.status}).`,
      });
    } catch (e: any) { push({ name: 'Kupakia / kupakua mafaili', status: 'fail', detail: e.message }); }

    // 6. Organizations reachable
    try {
      const tables = ['hospitals', 'pharmacies', 'laboratories', 'polyclinics'] as const;
      const counts: string[] = [];
      let failed = false;
      for (const t of tables) {
        const { count, error } = await supabase.from(t).select('id', { count: 'exact', head: true });
        if (error) { failed = true; counts.push(`${t}: kosa`); }
        else counts.push(`${t}: ${count ?? 0}`);
      }
      push({ name: 'Mashirika', status: failed ? 'fail' : 'pass', detail: counts.join(' • ') });
    } catch (e: any) { push({ name: 'Mashirika', status: 'fail', detail: e.message }); }

    // 7. Audit trail writable
    try {
      const id = await supabase.rpc('log_audit_event' as any, {
        _event_type: 'diagnostics_run', _entity_type: 'system', _description: 'Admin diagnostics executed',
      } as any);
      push({ name: 'Kumbukumbu za mfumo (audit)', status: id.error ? 'fail' : 'pass', detail: id.error?.message || 'Tukio limerekodiwa.' });
    } catch (e: any) { push({ name: 'Kumbukumbu za mfumo (audit)', status: 'fail', detail: e.message }); }

    // Persist the run so it appears in the scheduled report history
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from('diagnostics_runs' as any) as any).insert({
        source: 'manual',
        ran_by: user?.id ?? null,
        passed: out.filter((r) => r.status === 'pass').length,
        warned: out.filter((r) => r.status === 'warn').length,
        failed: out.filter((r) => r.status === 'fail').length,
        results: out,
      });
    } catch { /* non-fatal */ }

    await logAudit('diagnostics_run', { entityType: 'system', metadata: { checks: out.length } });
    setRunning(false);
  };

  const icon = (s: Status) =>
    s === 'pass' ? <CheckCircle2 className="h-4 w-4 text-green-600" />
      : s === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-500" />
      : <XCircle className="h-4 w-4 text-destructive" />;

  const failures = results.filter((r) => r.status === 'fail').length;

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 border-0 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">Uchunguzi wa mfumo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hukagua viungo vya madaktari, mazungumzo, mafaili na mashirika.
            </p>
          </div>
          <Button className="rounded-2xl" onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Activity className="h-4 w-4 mr-1.5" />Anza</>}
          </Button>
        </div>
      </Card>

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Badge variant={failures ? 'destructive' : 'secondary'} className="rounded-xl">
              {failures ? `${failures} matatizo` : 'Kila kitu kiko sawa'}
            </Badge>
            <span className="text-xs text-muted-foreground">{results.length} vipimo</span>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <Card key={i} className="rounded-3xl p-4 border-0 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{icon(r.status)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground break-words">{r.detail}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
