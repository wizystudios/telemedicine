import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { UniversalSearch } from '@/components/UniversalSearch';
import { Loader2, FlaskConical, MapPin, Star, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function LaboratoriesList() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['labs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laboratories')
        .select('id, name, address, logo_url, rating, total_reviews, is_verified')
        .order('is_verified', { ascending: false })
        .order('rating', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((l: any) => `${l.name} ${l.address ?? ''}`.toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3 pb-24">
      <div>
        <h1 className="text-base font-semibold">Maabara</h1>
        <p className="text-xs text-muted-foreground">Fungua maabara kuona vipimo na kuagiza.</p>
      </div>
      <UniversalSearch placeholder="Tafuta maabara..." onLocalFilter={setQ} />
      <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/nearby?type=laboratories')}>
        <MapPin className="h-3.5 w-3.5 mr-1.5" /> Onyesha zilizo karibu nawe
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Hakuna maabara kwa sasa
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((l: any) => (
            <button
              key={l.id}
              onClick={() => navigate(`/laboratory-profile/${l.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-12 w-12 rounded-xl">
                <AvatarImage src={l.logo_url} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-rose-500/10 text-rose-500"><FlaskConical className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold truncate">{l.name}</h3>
                  {l.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" />{l.address || '—'}</p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {(l.rating || 0).toFixed(1)} ({l.total_reviews || 0})
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
