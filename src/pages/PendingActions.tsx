import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PendingActions() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('pending_actions')
      .select('*')
      .eq('matched_user_id', user.id)
      .eq('status', 'awaiting_confirmation')
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const execute = async (a: any) => {
    try {
      const p = a.payload || {};
      if (a.action_type === 'add_to_cart' || a.action_type === 'order_medicine') {
        const { error } = await supabase.from('cart_items').upsert(
          { user_id: user!.id, medicine_id: p.medicine_id, pharmacy_id: p.pharmacy_id, quantity: p.quantity || 1 },
          { onConflict: 'user_id,medicine_id' }
        );
        if (error) throw error;
      } else if (a.action_type === 'create_appointment') {
        const { error } = await supabase.from('appointments').insert({
          patient_id: user!.id, doctor_id: p.doctor_id,
          appointment_date: p.appointment_date || new Date(Date.now() + 86400000).toISOString(),
          symptoms: p.symptoms || null, consultation_type: p.consultation_type || 'video', status: 'scheduled',
        });
        if (error) throw error;
      } else if (a.action_type === 'post_problem') {
        const { error } = await supabase.from('patient_problems').insert({
          patient_id: user!.id, problem_text: p.problem_text,
          category: p.category || 'general', urgency_level: p.urgency_level || 'normal',
        });
        if (error) throw error;
      }
      await supabase.from('pending_actions').update({ status: 'executed' }).eq('id', a.id);
      toast({ title: 'Imekamilika', description: a.human_summary });
      load();
    } catch (e: any) {
      await supabase.from('pending_actions').update({ status: 'failed', error: e.message }).eq('id', a.id);
      toast({ title: 'Imeshindwa', description: e.message, variant: 'destructive' });
      load();
    }
  };

  const reject = async (id: string) => {
    await supabase.from('pending_actions').update({ status: 'rejected' }).eq('id', id);
    load();
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
        <p className="text-xs text-muted-foreground">Vitendo ambavyo Wizy aliahidi kwa niaba yako. Thibitisha au kataa.</p>

        {loading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {!loading && items.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">Hakuna maombi yanayosubiri.</p>
        )}

        <div className="space-y-2">
          {items.map(a => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Badge variant="outline" className="text-[10px] mb-1">{a.action_type}</Badge>
                  <p className="text-sm font-medium">{a.human_summary}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(a.created_at).toLocaleString('sw-TZ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => execute(a)}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Kubali & Tekeleza
                </Button>
                <Button size="sm" variant="outline" className="h-8 flex-1 text-xs" onClick={() => reject(a.id)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Kataa
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
