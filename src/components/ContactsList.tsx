import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContactsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Get current user profile to determine role
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch contacts based on user role
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', currentUserProfile?.role, searchTerm],
    queryFn: async () => {
      if (!currentUserProfile?.role) return [];
      
      // If user is a patient, show doctors. If user is a doctor, show patients
      const targetRole = currentUserProfile.role === 'patient' ? 'doctor' : 'patient';
      
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role')
        .eq('role', targetRole);

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('first_name');
      
      if (error) throw error;
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Inapakia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Chagua Mtu wa Kuzungumza Naye
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="max-w-4xl mx-auto relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tafuta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Hakuna mtu aliyepatikana' : 'Hakuna watu kwa sasa'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => {
              const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
              return (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.avatar_url} alt={contactName} />
                    <AvatarFallback>
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {contact.role === 'doctor' ? 'Dkt. ' : ''}{contactName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contact.role === 'doctor' ? 'Daktari' : 'Mgonjwa'}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}