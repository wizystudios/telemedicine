import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Video, Phone, MessageCircle, MapPin, Loader2, BadgeCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { InsuranceSelector } from '@/components/InsuranceSelector';
import { SuccessOverlay } from '@/components/SuccessOverlay';

const TYPES = [
  { v: 'video', label: 'Video', icon: Video },
  { v: 'audio', label: 'Simu', icon: Phone },
  { v: 'chat', label: 'Chat', icon: MessageCircle },
  { v: 'in-person', label: 'Kukutana', icon: MapPin },
];
const PAY = [
  { v: 'mpesa', label: 'M-Pesa' },
  { v: 'tigopesa', label: 'Mixx by Yas' },
  { v: 'airtelmoney', label: 'Airtel Money' },
  { v: 'halopesa', label: 'HaloPesa' },
  { v: 'cash', label: 'Taslimu' },
];
const MOBILE_MONEY = ['mpesa', 'tigopesa', 'airtelmoney', 'halopesa'];
const SLOTS = Array.from({ length: 16 }, (_, i) => {
  const m = 8 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

export default function BookAppointment() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const doctorId = sp.get('doctor');
  const { user } = useAuth();
  const { toast } = useToast();

  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(new Date(), i)), []);
  const [day, setDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(sp.get('time') || '');
  const [type, setType] = useState('video');
  const [symptoms, setSymptoms] = useState('');
  const [insurance, setInsurance] = useState('');
  const [pay, setPay] = useState('mpesa');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['book-doctor', doctorId],
    queryFn: async () => {
      const { data } = await (supabase as any).from('public_doctors').select('*').eq('id', doctorId).maybeSingle();
      return data;
    },
    enabled: !!doctorId,
  });

  const { data: taken = [] } = useQuery({
    queryKey: ['taken-slots', doctorId, day],
    queryFn: async () => {
      const start = new Date(`${day}T00:00`).toISOString();
      const end = new Date(`${day}T23:59`).toISOString();
      const { data } = await supabase.from('appointments').select('appointment_date')
        .eq('doctor_id', doctorId!).gte('appointment_date', start).lte('appointment_date', end)
        .neq('status', 'cancelled');
      return (data || []).map((a) => format(new Date(a.appointment_date!), 'HH:mm'));
    },
    enabled: !!doctorId,
  });

  const fee = Number(doctor?.consultation_fee || 0);
  const usingInsurance = !!insurance && insurance !== 'none';
  const isToday = day === format(new Date(), 'yyyy-MM-dd');
  const nowHM = format(new Date(), 'HH:mm');

  const submit = async () => {
    if (!doctorId || !user) return;
    if (!time) return toast({ title: 'Chagua muda', variant: 'destructive' });
    if (!symptoms.trim()) return toast({ title: 'Eleza tatizo lako kwa ufupi', variant: 'destructive' });
    if (!usingInsurance && fee > 0 && MOBILE_MONEY.includes(pay) && !ref.trim())
      return toast({ title: 'Weka namba ya muamala', variant: 'destructive' });
    setBusy(true);
    const when = new Date(`${day}T${time}`);
    const paid = !usingInsurance && (fee <= 0 || MOBILE_MONEY.includes(pay));
    const note = usingInsurance ? 'Malipo: bima'
      : MOBILE_MONEY.includes(pay) ? `Malipo: ${pay.toUpperCase()} • ${ref.trim()}` : 'Malipo: taslimu ukifika';
    const { error } = await supabase.from('appointments').insert({
      doctor_id: doctorId, patient_id: user.id, appointment_date: when.toISOString(),
      consultation_type: type, symptoms: symptoms.trim(), notes: note, status: 'scheduled',
      fee, payment_status: paid ? 'paid' : 'pending', insurance_id: usingInsurance ? insurance : null,
      duration_minutes: 30,
    });
    setBusy(false);
    if (error) return toast({ title: 'Imeshindwa kupanga miadi', description: error.message, variant: 'destructive' });
    setDone(format(when, "EEEE d MMM yyyy 'saa' HH:mm"));
  };

  if (!doctorId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Chagua daktari kwanza</p>
        <Button className="rounded-2xl" onClick={() => navigate('/doctors-list')}>Tafuta daktari</Button>
      </div>
    );
  }

  const name = doctor ? `Dkt. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() : 'Daktari';
  const chip = (active: boolean) =>
    `rounded-2xl px-3 py-2 text-sm transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-foreground hover:bg-muted'}`;

  return (
    <div className="max-w-xl mx-auto px-4 pb-32 pt-3">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Rudi
      </button>

      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
        <div className="flex items-center gap-3 mb-8">
          <Avatar className="h-14 w-14">
            <AvatarImage src={doctor?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary">{doctor?.first_name?.[0] || 'D'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-semibold text-lg flex items-center gap-1 truncate">
              {name} {doctor?.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {doctor?.specialty_name || doctor?.doctor_type || 'Daktari wa jumla'}
              {(doctor?.hospital_name || doctor?.polyclinic_name) && ` · ${doctor.hospital_name || doctor.polyclinic_name}`}
            </p>
          </div>
          <p className="ml-auto text-right font-semibold text-primary whitespace-nowrap">TSh {fee.toLocaleString()}</p>
        </div>
      )}

      <section className="mb-7">
        <h2 className="text-sm font-medium mb-3">Siku</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((d) => {
            const v = format(d, 'yyyy-MM-dd');
            return (
              <button key={v} onClick={() => { setDay(v); setTime(''); }}
                className={`${chip(day === v)} flex flex-col items-center min-w-[56px]`}>
                <span className="text-[11px] opacity-80">{format(d, 'EEE')}</span>
                <span className="font-semibold">{format(d, 'd')}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="text-sm font-medium mb-3">Muda</h2>
        <div className="grid grid-cols-4 gap-2">
          {SLOTS.map((s) => {
            const off = taken.includes(s) || (isToday && s <= nowHM);
            return (
              <button key={s} disabled={off} onClick={() => setTime(s)}
                className={`${chip(time === s)} ${off ? 'opacity-30 line-through pointer-events-none' : ''}`}>
                {s}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="text-sm font-medium mb-3">Aina ya ushauri</h2>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map(({ v, label, icon: Icon }) => (
            <button key={v} onClick={() => setType(v)} className={`${chip(type === v)} flex flex-col items-center gap-1 py-3`}>
              <Icon className="h-4 w-4" /><span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="text-sm font-medium mb-3">Tatizo lako</h2>
        <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Mfano: homa na kichwa kwa siku 2" className="rounded-2xl bg-muted/40 border-0 min-h-[90px]" />
      </section>

      <section className="mb-7">
        <InsuranceSelector value={insurance} onChange={setInsurance} />
      </section>

      {!usingInsurance && fee > 0 && (
        <section className="mb-7">
          <h2 className="text-sm font-medium mb-3">Lipa kwa</h2>
          <div className="flex flex-wrap gap-2">
            {PAY.map((p) => (
              <button key={p.v} onClick={() => setPay(p.v)} className={chip(pay === p.v)}>{p.label}</button>
            ))}
          </div>
          {MOBILE_MONEY.includes(pay) && (
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Namba ya muamala, mf. 9XK7Y2LM4T"
              className="mt-3 rounded-2xl bg-muted/40 border-0 h-11" />
          )}
        </section>
      )}

      <div className="fixed bottom-14 md:bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border/40 p-3 z-30">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
            {time ? `${format(new Date(`${day}T${time}`), 'EEE d MMM')} · ${time}` : 'Chagua siku na muda'}
          </div>
          <Button className="rounded-2xl h-11 px-6" disabled={busy || !time} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Thibitisha'}
          </Button>
        </div>
      </div>

      {done && (
        <SuccessOverlay
          open
          title="Miadi imepangwa!"
          subtitle={`${name} · ${done}`}
          autoCloseMs={3000}
          onClose={() => navigate('/appointments')}
        />
      )}
    </div>
  );
}
