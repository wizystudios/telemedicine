import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, DollarSign, Filter, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdvancedDoctorSearchProps {
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  searchTerm: string;
  specialty?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
}

export function AdvancedDoctorSearch({ onSearch }: AdvancedDoctorSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    specialty: '',
    location: '',
    minPrice: 0,
    maxPrice: 200000,
    isAvailable: undefined
  });
  const [priceRange, setPriceRange] = useState([0, 200000]);

  // Fetch specialties
  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const handleSearch = () => {
    onSearch({
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1]
    });
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      searchTerm: '',
      specialty: '',
      location: '',
      minPrice: 0,
      maxPrice: 200000,
      isAvailable: undefined
    };
    setFilters(resetFilters);
    setPriceRange([0, 200000]);
    onSearch(resetFilters);
  };

  const activeFiltersCount = 
    (filters.specialty ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0) +
    (filters.isAvailable !== undefined ? 1 : 0);

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        {/* Main Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search doctors..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 h-9"
            />
          </div>
          <Button
            size="sm"
            variant={isExpanded ? 'default' : 'outline'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative h-9"
          >
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t animate-in slide-in-from-top-2">
            {/* Specialty Filter */}
            <div>
              <Label className="text-xs">Specialty</Label>
              <select
                value={filters.specialty}
                onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                className="w-full mt-1 h-8 px-2 rounded-md border bg-background text-sm"
              >
                <option value="">All Specialties</option>
                {specialties.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <Label className="text-xs">Location</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="City or area..."
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="pl-7 h-8 text-sm"
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Price Range (TSh)</Label>
                <span className="text-xs text-muted-foreground">
                  {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
                </span>
              </div>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                max={200000}
                step={10000}
                className="mt-2"
              />
            </div>

            {/* Availability */}
            <div className="flex items-center gap-2">
              <Label className="text-xs">Show only:</Label>
              <Button
                size="sm"
                variant={filters.isAvailable === true ? 'default' : 'outline'}
                onClick={() => setFilters({ 
                  ...filters, 
                  isAvailable: filters.isAvailable === true ? undefined : true 
                })}
                className="h-7 text-xs"
              >
                Available Now
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSearch} size="sm" className="flex-1 h-8">
                <Search className="h-3 w-3 mr-1" />
                Apply Filters
              </Button>
              <Button onClick={handleReset} size="sm" variant="outline" className="h-8">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
