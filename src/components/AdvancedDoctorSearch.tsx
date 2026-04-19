import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
  initialSearchTerm?: string;
}

export function AdvancedDoctorSearch({ onSearch, initialSearchTerm = '' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: initialSearchTerm, specialty: '', location: '', minPrice: 0, maxPrice: 200000, isAvailable: undefined
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data } = await supabase.from('specialties').select('*').order('name');
      return data || [];
    }
  });

  const activeCount = useMemo(() => [filters.specialty, filters.isAvailable].filter(Boolean).length, [filters.specialty, filters.isAvailable]);

  const apply = (nextFilters = filters) => onSearch(nextFilters);

  // Debounce so search bar doesn't refetch on every keystroke (was causing UI flicker)
  const debounceRef = useRef<number | null>(null);
  const onSearchTermChange = (value: string) => {
    const next = { ...filters, searchTerm: value };
    setFilters(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => apply(next), 350);
  };
  useEffect(() => () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); }, []);

  const reset = () => {
    const r: SearchFilters = { searchTerm: '', specialty: '', location: '', minPrice: 0, maxPrice: 200000, isAvailable: undefined };
    setFilters(r);
    onSearch(r);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tafuta daktari..."
            value={filters.searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            className="h-9 pl-9 text-sm"
          />
        </div>
        <Button size="icon" variant={expanded ? 'secondary' : 'outline'} className="h-9 w-9" onClick={() => setExpanded(!expanded)}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="h-6 px-2.5 text-[11px] font-medium">
          {activeCount > 0 ? `${activeCount} kichujio` : 'Vichujio'}
        </Badge>
        {filters.specialty && (
          <button
            onClick={() => {
              const nextFilters = { ...filters, specialty: '' };
              setFilters(nextFilters);
              apply(nextFilters);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            Utaalamu <X className="h-3 w-3" />
          </button>
        )}
        {filters.isAvailable && (
          <button
            onClick={() => {
              const nextFilters = { ...filters, isAvailable: undefined };
              setFilters(nextFilters);
              apply(nextFilters);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            Wapo sasa <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground">Utaalamu</span>
            <Select
              value={filters.specialty || 'all'}
              onValueChange={(value) => {
                const nextFilters = { ...filters, specialty: value === 'all' ? '' : value };
                setFilters(nextFilters);
                apply(nextFilters);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Chagua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Zote</SelectItem>
                {specialties.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-2">
            <span className="text-[11px] text-muted-foreground">Upatikanaji</span>
            <button
              onClick={() => {
                const nextFilters = { ...filters, isAvailable: filters.isAvailable ? undefined : true };
                setFilters(nextFilters);
                apply(nextFilters);
              }}
              className={`rounded-full px-3 py-1 text-[11px] transition-colors ${filters.isAvailable ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground'}`}
            >
              Wapo Sasa
            </button>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={reset}>Futa</Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setExpanded(false)}>Sawa</Button>
          </div>
        </div>
      )}
    </div>
  );
}
