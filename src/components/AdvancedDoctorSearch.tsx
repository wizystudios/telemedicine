import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';

export interface SearchFilters {
  searchTerm: string;
  specialty?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
}

interface Props {
  onSearch: (filters: SearchFilters) => void;
}

export function AdvancedDoctorSearch({ onSearch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '', specialty: '', location: '', minPrice: 0, maxPrice: 200000, isAvailable: undefined
  });
  const [priceRange, setPriceRange] = useState([0, 200000]);

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data } = await supabase.from('specialties').select('*').order('name');
      return data || [];
    }
  });

  const apply = () => onSearch({ ...filters, minPrice: priceRange[0], maxPrice: priceRange[1] });
  const reset = () => {
    const r: SearchFilters = { searchTerm: '', specialty: '', location: '', minPrice: 0, maxPrice: 200000, isAvailable: undefined };
    setFilters(r); setPriceRange([0, 200000]); onSearch(r);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tafuta daktari..."
            value={filters.searchTerm}
            onChange={(e) => { setFilters({ ...filters, searchTerm: e.target.value }); }}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Button size="sm" variant={expanded ? 'default' : 'outline'} className="h-8 w-8 p-0"
          onClick={() => setExpanded(!expanded)}>
          <Filter className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 p-3 rounded-xl bg-card border border-border text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Utaalamu</span>
            <select value={filters.specialty} onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
              className="w-full mt-1 h-8 px-2 rounded-lg border border-border bg-background text-sm">
              <option value="">Zote</option>
              {specialties.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Bei (TSh)</span>
              <span>{priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}</span>
            </div>
            <Slider value={priceRange} onValueChange={setPriceRange} max={200000} step={10000} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFilters({ ...filters, isAvailable: filters.isAvailable ? undefined : true })}
              className={`text-xs px-3 py-1 rounded-full ${filters.isAvailable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Wapo Sasa
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={apply}>Tafuta</Button>
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={reset}><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
