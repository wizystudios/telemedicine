import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_text: string | null;
  target_pages: string[] | null;
}

interface Props {
  page: string; // e.g. 'home', 'doctors', 'pharmacy'
  className?: string;
}

export function AdBanner({ page, className = '' }: Props) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from('ads')
      .select('id, title, description, image_url, link_url, cta_text, target_pages')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        const filtered = (data || []).filter(a => !a.target_pages?.length || a.target_pages.includes(page));
        setAds(filtered);
      });
  }, [page]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % ads.length), 6000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[idx];

  const onClick = () => {
    if (!ad.link_url) return;
    if (ad.link_url.startsWith('http')) window.open(ad.link_url, '_blank', 'noopener');
    else window.location.assign(ad.link_url);
  };

  return (
    <button
      onClick={onClick}
      className={`group w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-left transition-all hover:border-primary/40 ${className}`}
    >
      <div className="flex items-center gap-3 p-3">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} className="h-14 w-14 rounded-xl object-cover shrink-0" loading="lazy" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-primary/20 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
          {ad.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{ad.description}</p>}
        </div>
        {ad.link_url && (
          <div className="text-[11px] text-primary font-medium flex items-center gap-1 shrink-0">
            {ad.cta_text || 'Tazama'}
            <ExternalLink className="h-3 w-3" />
          </div>
        )}
      </div>
      {ads.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {ads.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === idx ? 'w-4 bg-primary' : 'w-1 bg-muted-foreground/30'}`}
            />
          ))}
        </div>
      )}
    </button>
  );
}
