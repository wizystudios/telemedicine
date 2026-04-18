import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Sparkles, Megaphone, Lightbulb } from 'lucide-react';

export function AdsManager() {
  const [ads, setAds] = useState<any[]>([]);
  const [tips, setTips] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [generatingTips, setGeneratingTips] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', image_url: '', link_url: '', cta_text: 'Tazama' });

  const load = async () => {
    const [a, t] = await Promise.all([
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_health_tips').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    setAds(a.data || []);
    setTips(t.data || []);
  };

  useEffect(() => { load(); }, []);

  const createAd = async () => {
    if (!form.title) return toast({ title: 'Andika kichwa cha tangazo' });
    setCreating(true);
    const { error } = await supabase.from('ads').insert({ ...form, is_active: true });
    setCreating(false);
    if (error) return toast({ title: 'Hitilafu', description: error.message, variant: 'destructive' });
    setForm({ title: '', description: '', image_url: '', link_url: '', cta_text: 'Tazama' });
    toast({ title: 'Tangazo limeundwa' });
    load();
  };

  const toggleAd = async (id: string, val: boolean) => {
    await supabase.from('ads').update({ is_active: val }).eq('id', id);
    load();
  };

  const deleteAd = async (id: string) => {
    await supabase.from('ads').delete().eq('id', id);
    load();
  };

  const generateTips = async () => {
    setGeneratingTips(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-health-tips', { body: { count: 5 } });
      if (error) throw error;
      toast({ title: `Tips ${data?.count || 0} zimeundwa` });
      load();
    } catch (e: any) {
      toast({ title: 'Hitilafu', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingTips(false);
    }
  };

  const toggleTip = async (id: string, val: boolean) => {
    await supabase.from('ai_health_tips').update({ is_active: val }).eq('id', id);
    load();
  };

  const deleteTip = async (id: string) => {
    await supabase.from('ai_health_tips').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Ads */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Matangazo</h2>
        </div>

        <Card className="mb-3">
          <CardContent className="p-4 space-y-2">
            <Input placeholder="Kichwa" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Maelezo" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="URL ya picha (hiari)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <Input placeholder="Link (mfano /doctors-list)" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            <Input placeholder="CTA text" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
            <Button onClick={createAd} disabled={creating} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Ongeza Tangazo
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {ads.map(ad => (
            <div key={ad.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{ad.title}</p>
                {ad.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{ad.description}</p>}
                <Badge variant={ad.is_active ? 'default' : 'secondary'} className="text-[10px] mt-1">
                  {ad.is_active ? 'Hai' : 'Imezimwa'}
                </Badge>
              </div>
              <Switch checked={ad.is_active} onCheckedChange={(v) => toggleAd(ad.id, v)} />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteAd(ad.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Health Tips (AI)</h2>
          </div>
          <Button size="sm" onClick={generateTips} disabled={generatingTips}>
            <Sparkles className="h-4 w-4 mr-1" />
            {generatingTips ? 'Inaunda...' : 'Unda na AI'}
          </Button>
        </div>

        <div className="space-y-2">
          {tips.map(tip => (
            <div key={tip.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{tip.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{tip.content}</p>
              </div>
              <Switch checked={tip.is_active} onCheckedChange={(v) => toggleTip(tip.id, v)} />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTip(tip.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
