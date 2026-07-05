import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, ArrowRight } from 'lucide-react';

interface OrgAd {
  id: string;
  org_type: 'hospital' | 'pharmacy' | 'laboratory' | 'polyclinic';
  org_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_text: string | null;
  services: string[] | null;
  hours: string | null;
  ends_at: string;
}

const ORG_PATH: Record<OrgAd['org_type'], string> = {
  hospital: 'hospital-profile',
  pharmacy: 'pharmacy-profile',
  laboratory: 'laboratory-profile',
  polyclinic: 'polyclinic-profile',
};

export function OrgAdsCarousel() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<OrgAd[]>([]);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from('org_ads')
        .select('id, org_type, org_id, title, description, image_url, cta_text, services, hours, ends_at')
        .eq('is_active', true)
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso)
        .order('display_order', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      const list = (data as OrgAd[]) || [];
      setAds(list);
      // fire-and-forget view counters
      list.forEach(a => {
        (supabase as any).rpc('increment_org_ad_metric', { _ad_id: a.id, _metric: 'view' });
      });
    })();
  }, []);

  if (!ads.length) return null;

  const open = (ad: OrgAd) => {
    (supabase as any).rpc('increment_org_ad_metric', { _ad_id: ad.id, _metric: 'click' });
    navigate(`/${ORG_PATH[ad.org_type]}/${ad.org_id}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Matangazo Yaliyokuzwa
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 snap-x snap-mandatory scrollbar-none">
        {ads.map(ad => {
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(ad.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          );
          return (
            <button
              key={ad.id}
              onClick={() => open(ad)}
              className="snap-start shrink-0 w-[280px] rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden text-left hover:border-primary/40 transition"
            >
              {ad.image_url ? (
                <div className="h-28 w-full overflow-hidden bg-muted">
                  <img src={ad.image_url} alt={ad.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-14 bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold line-clamp-1">{ad.title}</p>
                  <Badge variant="secondary" className="text-[9px] shrink-0 capitalize">
                    {ad.org_type}
                  </Badge>
                </div>
                {ad.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{ad.description}</p>
                )}
                {ad.hours && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {ad.hours}
                  </p>
                )}
                {ad.services && ad.services.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ad.services.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">Wiki hii · siku {daysLeft} zimebaki</span>
                  <span className="text-xs font-medium text-primary flex items-center gap-0.5">
                    {ad.cta_text || 'Tazama'} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
