import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { Stethoscope, Building2, Pill, Calendar, Loader2, X, RefreshCw, Wallet } from 'lucide-react';

const SLOTS = Array.from({ length: 16 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const STATUS: Record<string, string> = {
  scheduled: 'Inasubiri idhini', approved: 'Imekubaliwa', confirmed: 'Imekubaliwa',
  completed: 'Imekamilika', cancelled: 'Imeghairiwa', rejected: 'Imekataliwa',
};

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [resched, setResched] = useState<any>(null);
  const [day, setDay] = useState(addDays(new Date(), 1));
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(new Date(), i)), []);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['my-bookings', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('appointments')
        .select('*, doctor:profiles!appointments_doctor_id_fkey(first_name,last_name,avatar_url)')
        .eq('patient_id', user!.id).neq('consultation_type', 'chat')
        .order('appointment_date', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const upcoming = list.filter((a: any) => new Date(a.appointment_date) >= now && !['cancelled', 'rejected'].includes(a.status));
  const past = list.filter((a: any) => !upcoming.includes(a));
  const paid = list.filter((a: any) => a.payment_status === 'paid').reduce((s: number, a: any) => s + Number(a.fee || 0), 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-bookings'] });

  const cancel = async (a: any) => {
    if (!confirm('Ghairi miadi hii?')) return;
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', a.id);
    if (error) return toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    toast({ title: 'Miadi imeghairiwa' });
    refresh();
  };

  const saveResched = async () => {
    if (!time || !resched) return;
    const [h, m] = time.split(':').map(Number);
    const d = new Date(day); d.setHours(h, m, 0, 0);
    if (d < new Date()) return toast({ title: 'Chagua muda ujao', variant: 'destructive' });
    setBusy(true);
    const { data: clash } = await supabase.from('appointments').select('id')
      .eq('doctor_id', resched.doctor_id).eq('appointment_date', d.toISOString())
      .in('status', ['scheduled', 'approved', 'confirmed']).neq('id', resched.id);
    if (clash?.length) { setBusy(false); return toast({ title: 'Muda huu umeshachukuliwa', variant: 'destructive' }); }
    const { error } = await supabase.from('appointments').update({ appointment_date: d.toISOString(), status: 'scheduled' }).eq('id', resched.id);
    setBusy(false);
    if (error) return toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' });
    toast({ title: 'Miadi imehamishwa', description: format(d, 'EEE dd MMM, HH:mm') });
    setResched(null); setTime(null); refresh();
  };

  const Row = ({ a, active }: { a: any; active?: boolean }) => (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="h-10 w-10"><AvatarImage src={a.doctor?.avatar_url} />
        <AvatarFallback className="bg-primary/10 text-xs text-primary">{a.doctor?.first_name?.[0]}{a.doctor?.last_name?.[0]}</AvatarFallback>
      </Avatar>
      <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/doctor-profile/${a.doctor_id}`)}>
        <p className="truncate text-sm font-medium">Dkt. {a.doctor?.first_name} {a.doctor?.last_name}</p>
        <p className="text-xs text-muted-foreground">{format(new Date(a.appointment_date), 'EEE dd MMM · HH:mm')} · {STATUS[a.status] || a.status}</p>
        {a.fee ? <p className="text-[11px] text-muted-foreground">TSh {Number(a.fee).toLocaleString()} · {a.payment_status === 'paid' ? 'Imelipwa' : 'Haijalipwa'}</p> : null}
      </button>
      {active && (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="rounded-2xl" aria-label="Hamisha" onClick={() => { setResched(a); setDay(new Date(a.appointment_date)); setTime(null); }}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="rounded-2xl text-destructive" aria-label="Ghairi" onClick={() => cancel(a)}><X className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24 pt-4">
      <div>
        <h1 className="text-xl font-bold">Miadi yangu</h1>
        <p className="text-sm text-muted-foreground">Tafuta huduma, weka miadi, lipa na fuatilia hapa.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[{ l: 'Zijazo', v: upcoming.length }, { l: 'Zote', v: list.length }, { l: 'Umelipa', v: `TSh ${paid.toLocaleString()}` }].map(s => (
          <div key={s.l}><p className="text-lg font-bold">{s.v}</p><p className="text-[11px] text-muted-foreground">{s.l}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[{ i: Stethoscope, l: 'Madaktari', p: '/doctors-list' }, { i: Building2, l: 'Hospitali', p: '/hospitals' }, { i: Pill, l: 'Famasi', p: '/pharmacies' }, { i: Wallet, l: 'Oda zangu', p: '/my-orders' }].map(s => (
          <button key={s.l} onClick={() => navigate(s.p)} className="flex flex-col items-center gap-1.5 py-2 active:scale-95">
            <s.i className="h-6 w-6" strokeWidth={1.6} /><span className="text-[11px] font-medium">{s.l}</span>
          </button>
        ))}
      </div>

      {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /> : (
        <>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zijazo</h2>
            {upcoming.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                <p className="mb-3 text-sm text-muted-foreground">Huna miadi inayokuja</p>
                <Button className="rounded-2xl" onClick={() => navigate('/doctors-list')}>Tafuta daktari</Button>
              </div>
            ) : <div className="divide-y divide-border">{upcoming.map((a: any) => <Row key={a.id} a={a} active />)}</div>}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historia</h2>
              <div className="divide-y divide-border">{past.map((a: any) => <Row key={a.id} a={a} />)}</div>
            </section>
          )}
        </>
      )}

      <Sheet open={!!resched} onOpenChange={(o) => !o && setResched(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>Hamisha miadi</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map(d => (
                <button key={d.toISOString()} onClick={() => { setDay(d); setTime(null); }}
                  className={`shrink-0 rounded-2xl px-3 py-2 text-center text-xs ${isSameDay(d, day) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p>{format(d, 'EEE')}</p><p className="text-base font-bold">{format(d, 'dd')}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SLOTS.map(s => (
                <button key={s} onClick={() => setTime(s)} className={`rounded-2xl py-2 text-sm ${time === s ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{s}</button>
              ))}
            </div>
            <Button className="w-full rounded-2xl" disabled={!time || busy} onClick={saveResched}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : time ? `Hamisha hadi ${format(day, 'dd MMM')} ${time}` : 'Chagua muda'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
