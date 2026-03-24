import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2 } from 'lucide-react';

export default function ContactsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', currentUserProfile?.role, debouncedSearch],
    queryFn: async () => {
      if (!currentUserProfile?.role) return [];
      const targetRole = currentUserProfile.role === 'patient' ? 'doctor' : 'patient';
      let query = supabase.from('profiles').select('id, first_name, last_name, avatar_url, role').eq('role', targetRole);
      if (debouncedSearch) {
        query = query.or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%`);
      }
      const { data } = await query.order('first_name');
      return data || [];
    },
    enabled: !!currentUserProfile?.role
  });

  const handleContactClick = (contact: any) => {
    const paramName = contact.role === 'doctor' ? 'doctor' : 'patient';
    navigate(`/messages?${paramName}=${contact.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-20">
      <h1 className="text-lg font-bold mb-3">Ujumbe</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Tafuta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div className="space-y-1">
        {contacts.map((contact) => {
          const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
          return (
            <button
              key={contact.id}
              onClick={() => handleContactClick(contact)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {contact.role === 'doctor' ? 'Dk. ' : ''}{name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {contact.role === 'doctor' ? 'Daktari' : 'Mgonjwa'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {contacts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Hakuna aliyepatikana' : 'Hakuna watu kwa sasa'}
          </p>
        </div>
      )}
    </div>
  );
}
