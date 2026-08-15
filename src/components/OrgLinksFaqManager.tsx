import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Globe, Facebook, Instagram, Youtube, MessageCircle, Music2, Plus, Trash2, Loader2, HelpCircle, Save } from 'lucide-react';

type OrgType = 'hospital' | 'polyclinic' | 'pharmacy' | 'laboratory';

const TABLE: Record<OrgType, string> = {
  hospital: 'hospitals',
  polyclinic: 'polyclinics',
  pharmacy: 'pharmacies',
  laboratory: 'laboratories',
};

const SOCIALS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, ph: 'https://facebook.com/...' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, ph: 'https://instagram.com/...' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, ph: '+2557XXXXXXXX' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, ph: 'https://youtube.com/@...' },
  { key: 'tiktok', label: 'TikTok', icon: Music2, ph: 'https://tiktok.com/@...' },
  { key: 'x', label: 'X (Twitter)', icon: Globe, ph: 'https://x.com/...' },
];

interface Faq { id: string; question: string; answer: string; is_published: boolean; display_order: number }

interface Props { orgType: OrgType; orgId: string }

export default function OrgLinksFaqManager({ orgType, orgId }: Props) {
  const [website, setWebsite] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const [savingLinks, setSavingLinks] = useState(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [{ data: org }, { data: f }] = await Promise.all([
      (supabase.from(TABLE[orgType] as any) as any).select('website, social_links').eq('id', orgId).maybeSingle(),
      (supabase.from('org_faqs' as any) as any)
        .select('*').eq('org_type', orgType).eq('org_id', orgId)
        .order('display_order').order('created_at'),
    ]);
    setWebsite((org as any)?.website || '');
    setLinks(((org as any)?.social_links as Record<string, string>) || {});
    setFaqs(((f as any[]) || []) as Faq[]);
    setLoading(false);
  }, [orgType, orgId]);

  useEffect(() => { load(); }, [load]);

  const saveLinks = async () => {
    setSavingLinks(true);
    const clean = Object.fromEntries(Object.entries(links).filter(([, v]) => (v || '').trim()));
    const { error } = await (supabase.from(TABLE[orgType] as any) as any)
      .update({ website: website.trim() || null, social_links: clean })
      .eq('id', orgId);
    setSavingLinks(false);
    toast(error
      ? { title: 'Imeshindwa', description: error.message, variant: 'destructive' }
      : { title: 'Imehifadhiwa', description: 'Viungo vyako sasa vinaonekana kwa Wizy na wateja.' });
  };

  const addFaq = async () => {
    if (!q.trim() || !a.trim()) {
      toast({ title: 'Jaza swali na jibu', variant: 'destructive' });
      return;
    }
    setAdding(true);
    const { data, error } = await (supabase.from('org_faqs' as any) as any)
      .insert({ org_type: orgType, org_id: orgId, question: q.trim(), answer: a.trim(), display_order: faqs.length })
      .select().single();
    setAdding(false);
    if (error) { toast({ title: 'Imeshindwa', description: error.message, variant: 'destructive' }); return; }
    setFaqs((prev) => [...prev, data as Faq]);
    setQ(''); setA('');
    toast({ title: 'Swali limeongezwa' });
  };

  const togglePublish = async (f: Faq) => {
    setFaqs((prev) => prev.map((x) => (x.id === f.id ? { ...x, is_published: !f.is_published } : x)));
    await (supabase.from('org_faqs' as any) as any).update({ is_published: !f.is_published }).eq('id', f.id);
  };

  const removeFaq = async (id: string) => {
    setFaqs((prev) => prev.filter((x) => x.id !== id));
    await (supabase.from('org_faqs' as any) as any).delete().eq('id', id);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-5 border-0 shadow-sm space-y-4">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1.5"><Globe className="h-4 w-4 text-primary" /> Tovuti na mitandao ya kijamii</p>
          <p className="text-xs text-muted-foreground mt-0.5">Wizy hutumia viungo hivi kuwaelekeza wateja moja kwa moja kwenu.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tovuti</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="rounded-2xl" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIALS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {s.label}</Label>
                <Input
                  value={links[s.key] || ''}
                  onChange={(e) => setLinks((p) => ({ ...p, [s.key]: e.target.value }))}
                  placeholder={s.ph}
                  className="rounded-2xl"
                />
              </div>
            );
          })}
        </div>

        <Button onClick={saveLinks} disabled={savingLinks} className="rounded-2xl w-full">
          {savingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" />Hifadhi viungo</>}
        </Button>
      </Card>

      <Card className="rounded-3xl p-5 border-0 shadow-sm space-y-4">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1.5"><HelpCircle className="h-4 w-4 text-primary" /> Maswali yanayoulizwa mara kwa mara</p>
          <p className="text-xs text-muted-foreground mt-0.5">Wizy hujibu maswali haya kwa wateja wenu moja kwa moja.</p>
        </div>

        <div className="space-y-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Swali (mfano: Mnafungua saa ngapi?)" className="rounded-2xl" />
          <Textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Jibu" className="rounded-2xl min-h-[80px]" />
          <Button onClick={addFaq} disabled={adding} className="rounded-2xl w-full">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1.5" />Ongeza swali</>}
          </Button>
        </div>

        {faqs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Bado hakuna maswali.</p>
        ) : (
          <div className="space-y-2">
            {faqs.map((f) => (
              <div key={f.id} className="rounded-2xl bg-muted/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{f.question}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{f.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={f.is_published} onCheckedChange={() => togglePublish(f)} />
                    <Button size="icon" variant="ghost" className="rounded-xl h-8 w-8" onClick={() => removeFaq(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
