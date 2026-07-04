import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Pill, Calendar, FileText, Star, MessageCircle, Sparkles } from 'lucide-react';

type Step = {
  icon: any;
  label: string;
  hint: string;
  path: string;
  tone: 'primary' | 'accent' | 'success' | 'warning';
};

export function NextStepNudge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // 1. Pharmacy order ready for pickup / picked_up needing confirmation
      const { data: order } = await supabase
        .from('pharmacy_orders')
        .select('id, medicine_name, status, order_code')
        .eq('patient_id', user.id)
        .in('status', ['ready', 'picked_up'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (order) {
        setStep({
          icon: Pill,
          label: order.status === 'ready' ? 'Dawa yako iko tayari' : 'Thibitisha umepokea dawa',
          hint: `${order.medicine_name}${order.order_code ? ` · ${order.order_code}` : ''}`,
          path: '/my-orders',
          tone: 'success',
        });
        return;
      }

      // 2. Unread new prescription
      const { data: rx } = await supabase
        .from('prescriptions')
        .select('id, created_at')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rx && Date.now() - new Date(rx.created_at).getTime() < 7 * 86400000) {
        setStep({
          icon: FileText,
          label: 'Daktari ameandika dawa mpya',
          hint: 'Iagize kutoka famasi',
          path: '/prescriptions',
          tone: 'primary',
        });
        return;
      }

      // 3. Upcoming approved appointment reminder
      const { data: apt } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, doctor:profiles!appointments_doctor_id_fkey(first_name,last_name)')
        .eq('patient_id', user.id)
        .in('status', ['approved', 'confirmed', 'scheduled'])
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (apt) {
        const d: any = apt.doctor;
        const when = new Date(apt.appointment_date);
        const hours = Math.round((when.getTime() - Date.now()) / 3600000);
        setStep({
          icon: hours < 2 ? MessageCircle : Calendar,
          label: hours < 2 ? 'Muda wa miadi umefika' : `Miadi na Dk. ${d?.last_name ?? ''}`,
          hint: when.toLocaleString('sw-TZ', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
          path: hours < 2 ? '/messages' : '/appointments',
          tone: hours < 2 ? 'accent' : 'primary',
        });
        return;
      }

      // 4. Completed appointment without review
      const { data: done } = await supabase
        .from('appointments')
        .select('id, doctor_id')
        .eq('patient_id', user.id)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (done) {
        const { data: existing } = await supabase
          .from('reviews')
          .select('id')
          .eq('doctor_id', done.doctor_id)
          .eq('patient_id', user.id)
          .maybeSingle();
        if (!existing) {
          setStep({
            icon: Star,
            label: 'Toa maoni kuhusu daktari',
            hint: 'Wagonjwa wengine watashukuru',
            path: '/appointments',
            tone: 'warning',
          });
          return;
        }
      }

      // 5. Onboarding fallback
      setStep({
        icon: Sparkles,
        label: 'Anza safari yako ya afya',
        hint: 'Tafuta daktari na panga miadi',
        path: '/doctors-list',
        tone: 'primary',
      });
    })();
  }, [user]);

  if (!step) return null;

  const tones: Record<Step['tone'], string> = {
    primary: 'from-primary/15 to-primary/5 text-primary',
    accent: 'from-accent/20 to-accent/5 text-accent-foreground',
    success: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    warning: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-500',
  };
  const Icon = step.icon;

  return (
    <button
      onClick={() => navigate(step.path)}
      className={`w-full rounded-3xl bg-gradient-to-br ${tones[step.tone]} p-4 flex items-center gap-3 border border-border/50 hover:scale-[1.01] active:scale-[0.99] transition-transform text-left`}
    >
      <div className="h-11 w-11 rounded-2xl bg-background/70 backdrop-blur flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{step.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{step.hint}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
