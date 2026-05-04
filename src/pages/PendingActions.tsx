import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, Sparkles, Loader2, Clock, ShoppingCart, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  add_to_cart: { label: 'Ongeza dawa kwenye cart', icon: ShoppingCart, color: 'bg-green-500/10 text-green-700' },
  order_medicine: { label: 'Agiza dawa', icon: ShoppingCart, color: 'bg-green-500/10 text-green-700' },
  create_appointment: { label: 'Weka miadi na daktari', icon: Calendar, color: 'bg-blue-500/10 text-blue-700' },
  post_problem: { label: 'Tuma tatizo la kiafya', icon: AlertCircle, color: 'bg-amber-500/10 text-amber-700' },
};

export default function PendingActions() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_actions')
        .select('*')
        .eq('matched_user_id', user.id)
        .eq('status', 'awaiting_confirmation')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (e: any) {
      toast.error('Imeshindwa kupakia maombi', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('pending-actions-' + user.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pending_actions',
        filter: `matched_user_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const execute = async (a: any) => {
    setBusyId(a.id);
    try {
      const p = a.payload || {};
      if (a.action_type === 'add_to_cart' || a.action_type === 'order_medicine') {
        if (!p.medicine_id || !p.pharmacy_id) throw new Error('Maelezo ya dawa hayajakamilika.');
        const { error } = await supabase.from('cart_items').upsert(
          { user_id: user!.id, medicine_id: p.medicine_id, pharmacy_id: p.pharmacy_id, quantity: p.quantity || 1 },
          { onConflict: 'user_id,medicine_id' }
        );
        if (error) throw error;
      } else if (a.action_type === 'create_appointment') {
        if (!p.doctor_id) throw new Error('Daktari hajachaguliwa.');
        const { error } = await supabase.from('appointments').insert({
          patient_id: user!.id, doctor_id: p.doctor_id,
          appointment_date: p.appointment_date || new Date(Date.now() + 86400000).toISOString(),
          symptoms: p.symptoms || null, consultation_type: p.consultation_type || 'video', status: 'scheduled',
        });
        if (error) throw error;
      } else if (a.action_type === 'post_problem') {
        if (!p.problem_text) throw new Error('Maelezo ya tatizo hayajakamilika.');
        const { error } = await supabase.from('patient_problems').insert({
          patient_id: user!.id, problem_text: p.problem_text,
          category: p.category || 'general', urgency_level: p.urgency_level || 'normal',
        });
        if (error) throw error;
      } else {
        throw new Error('Aina ya kitendo haijajulikana: ' + a.action_type);
      }
      await supabase.from('pending_actions').update({ status: 'executed', executed_at: new Date().toISOString() }).eq('id', a.id);
      toast.success('Imekamilika', { description: a.human_summary });
      load();
    } catch (e: any) {
      await supabase.from('pending_actions').update({ status: 'failed', error: e.message }).eq('id', a.id);
      toast.error('Imeshindwa', { description: e.message });
      load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.from('pending_actions').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      toast.success('Ombi limekataliwa');
      load();
    } catch (e: any) {
      toast.error('Imeshindwa kukataa', { description: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const renderPayload = (a: any) => {
    const p = a.payload || {};
    const entries: { k: string; v: any }[] = [];
    if (p.medicine_name) entries.push({ k: 'Dawa', v: p.medicine_name });
    if (p.pharmacy_name) entries.push({ k: 'Famasi', v: p.pharmacy_name });
    if (p.quantity) entries.push({ k: 'Kiasi', v: p.quantity });
    if (p.doctor_name) entries.push({ k: 'Daktari', v: p.doctor_name });
    if (p.appointment_date) entries.push({ k: 'Tarehe', v: new Date(p.appointment_date).toLocaleString('sw-TZ') });
    if (p.consultation_type) entries.push({ k: 'Aina', v: p.consultation_type });
    if (p.symptoms) entries.push({ k: 'Dalili', v: p.symptoms });
    if (p.problem_text) entries.push({ k: 'Tatizo', v: p.problem_text });
    if (entries.length === 0) return null;
    return (
      <div className="rounded-xl bg-muted/40 p-2.5 space-y-1">
        {entries.map(e => (
          <div key={e.k} className="flex justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground shrink-0">{e.k}</span>
            <span className="font-medium text-right truncate">{String(e.v)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-2xl px-3 pt-3 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="h-8 px-2 text-xs">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Rudi
          </Button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Maombi ya Wizy
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Vitendo ambavyo Wizy aliahidi kwa niaba yako. Thibitisha au kataa kila moja.
        </p>

        {loading && (
          <div className="flex flex-col items-center py-12 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Inapakia maombi...</p>
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Hakuna maombi yanayosubiri.</p>
          </div>
        )}

        <div className="space-y-2">
          {items.map(a => {
            const meta = ACTION_LABELS[a.action_type] || { label: a.action_type, icon: Sparkles, color: 'bg-muted text-foreground' };
            const Icon = meta.icon;
            const busy = busyId === a.id;
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl ${meta.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                    <p className="text-sm font-medium leading-snug">{a.human_summary}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString('sw-TZ')} • kupitia {a.contact_type === 'email' ? 'email' : 'simu'} {a.contact}
                    </p>
                  </div>
                </div>
                {renderPayload(a)}
                <div className="flex gap-2">
                  <Button size="sm" className="h-9 flex-1 text-xs" onClick={() => execute(a)} disabled={busy}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Kubali & Tekeleza
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 flex-1 text-xs" onClick={() => reject(a.id)} disabled={busy}>
                    <X className="h-3.5 w-3.5 mr-1" /> Kataa
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
