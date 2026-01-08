import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

interface InsuranceSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}

export function InsuranceSelector({ value, onChange, label = "Bima ya Afya" }: InsuranceSelectorProps) {
  const { data: insuranceProviders, isLoading } = useQuery({
    queryKey: ['insurance-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_providers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse h-10 bg-muted rounded-md"></div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" />
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Chagua bima yako (si lazima)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sina Bima</SelectItem>
          {insuranceProviders?.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              <div className="flex items-center gap-2">
                <span>{provider.name}</span>
                {provider.short_code && (
                  <Badge variant="outline" className="text-xs">
                    {provider.short_code}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Display component for showing accepted insurance
interface InsuranceDisplayProps {
  insuranceIds: string[];
}

export function InsuranceDisplay({ insuranceIds }: InsuranceDisplayProps) {
  const { data: providers } = useQuery({
    queryKey: ['insurance-providers-display', insuranceIds],
    queryFn: async () => {
      if (!insuranceIds?.length) return [];
      const { data, error } = await supabase
        .from('insurance_providers')
        .select('*')
        .in('id', insuranceIds);
      
      if (error) throw error;
      return data;
    },
    enabled: insuranceIds?.length > 0
  });

  if (!providers?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((provider) => (
        <Badge 
          key={provider.id} 
          variant="secondary" 
          className="flex items-center gap-1.5 px-3 py-1"
        >
          <Shield className="w-3 h-3 text-blue-500" />
          <span>{provider.short_code || provider.name}</span>
        </Badge>
      ))}
    </div>
  );
}
