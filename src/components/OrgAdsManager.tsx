import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Sparkles, Trash2, Eye, MousePointerClick } from 'lucide-react';
import { toast } from 'sonner';

type OrgType = 'hospital' | 'pharmacy' | 'laboratory' | 'polyclinic';

interface Props {
  orgType: OrgType;
  orgId: string;
}

interface OrgAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_text: string | null;
  services: string[] | null;
  hours: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  clicks_count: number;
  views_count: number;
}

function isoWeekFromNow(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function OrgAdsManager({ orgType, orgId }: Props) {
  const { user } = useAuth();
  const [ads, setAds] = useState<OrgAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    cta_text: 'Tazama Zaidi',
    services: '',
    hours: '',
    ends_at: isoWeekFromNow(7),
  });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('org_ads')
      .select('*')
      .eq('org_type', orgType)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    setAds((data as OrgAd[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgType, orgId]);

  const create = async () => {
    if (!user || !form.title.trim()) {
      toast.error('Andika kichwa cha tangazo');
      return;
    }
    const payload = {
      owner_id: user.id,
      org_type: orgType,
      org_id: orgId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      cta_text: form.cta_text.trim() || 'Tazama Zaidi',
      services: form.services
        ? form.services.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      hours: form.hours.trim() || null,
      ends_at: new Date(form.ends_at + 'T23:59:59').toISOString(),
      is_active: true,
    };
    const { error } = await (supabase as any).from('org_ads').insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Tangazo limechapishwa');
    setOpen(false);
    setForm({ title: '', description: '', image_url: '', cta_text: 'Tazama Zaidi', services: '', hours: '', ends_at: isoWeekFromNow(7) });
    load();
  };

  const toggleActive = async (ad: OrgAd) => {
    await (supabase as any).from('org_ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    load();
  };

  const remove = async (ad: OrgAd) => {
    if (!confirm('Futa tangazo hili?')) return;
    await (supabase as any).from('org_ads').delete().eq('id', ad.id);
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Matangazo ya Marketplace
          </h3>
          <p className="text-[11px] text-muted-foreground">Chapisha tangazo lako lionekane juu ya soko</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 rounded-full text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> Ongeza
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tangazo Jipya</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Kichwa *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="k.m. Punguzo la Ushauri Wiki Hii" />
              </div>
              <div>
                <Label className="text-xs">Maelezo</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Picha (URL)</Label>
                <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Huduma (tenganisha kwa koma)</Label>
                <Input value={form.services} onChange={e => setForm({ ...form, services: e.target.value })} placeholder="Ushauri, Uchunguzi, Dawa" />
              </div>
              <div>
                <Label className="text-xs">Saa za Kufungua</Label>
                <Input value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="8:00 - 20:00 kila siku" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Kitufe (CTA)</Label>
                  <Input value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Inaishia</Label>
                  <Input type="date" min={isoWeekFromNow(1)} value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
                </div>
              </div>
              <Button onClick={create} className="w-full">Chapisha Tangazo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-xs text-muted-foreground text-center py-4">Inapakia...</p>}
      {!loading && ads.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">Bado hakuna tangazo. Bonyeza "Ongeza" kuanza.</p>
      )}

      <div className="space-y-2">
        {ads.map(ad => {
          const active = ad.is_active && new Date(ad.ends_at) > new Date();
          return (
            <div key={ad.id} className="rounded-xl border border-border p-3 flex items-start gap-3">
              {ad.image_url ? (
                <img src={ad.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{ad.title}</p>
                  <Badge variant={active ? 'default' : 'secondary'} className="text-[9px]">
                    {active ? 'Hai' : 'Imezimwa'}
                  </Badge>
                </div>
                {ad.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{ad.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{ad.views_count}</span>
                  <span className="flex items-center gap-0.5"><MousePointerClick className="h-3 w-3" />{ad.clicks_count}</span>
                  <span>Inaishia {new Date(ad.ends_at).toLocaleDateString('sw-TZ')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Switch checked={ad.is_active} onCheckedChange={() => toggleActive(ad)} />
                <button onClick={() => remove(ad)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
