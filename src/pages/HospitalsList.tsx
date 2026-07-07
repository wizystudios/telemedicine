import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { UniversalSearch } from '@/components/UniversalSearch';
import { Loader2, Building2, MapPin, Star, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function HospitalsList() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['hospitals-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hospitals')
        .select('id, name, address, logo_url, rating, total_reviews, is_verified, has_ambulance')
        .order('is_verified', { ascending: false })
        .order('rating', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((h: any) => `${h.name} ${h.address ?? ''}`.toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-3 pt-3 pb-24">
      <div>
        <h1 className="text-base font-semibold">Hospitali</h1>
        <p className="text-xs text-muted-foreground">Chagua hospitali kuona madaktari na huduma zake.</p>
      </div>
      <UniversalSearch placeholder="Tafuta hospitali..." onLocalFilter={setQ} />
      <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/nearby?type=hospitals')}>
        <MapPin className="h-3.5 w-3.5 mr-1.5" /> Onyesha zilizo karibu nawe
      </Button>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Hakuna hospitali kwa sasa
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((h: any) => (
            <button
              key={h.id}
              onClick={() => navigate(`/hospital-profile/${h.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-12 w-12 rounded-xl">
                <AvatarImage src={h.logo_url} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold truncate">{h.name}</h3>
                  {h.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" />{h.address || '—'}</p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {(h.rating || 0).toFixed(1)} ({h.total_reviews || 0})
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
