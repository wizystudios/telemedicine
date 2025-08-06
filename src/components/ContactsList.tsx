import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeft, MessageCircle, Users } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-white/20 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-semibold text-gray-800 dark:text-white">Mazungumzo</h1>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="max-w-4xl mx-auto relative">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tafuta mtu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-white/30 focus:border-emerald-300 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {searchTerm ? 'Hakuna mtu aliyepatikana' : 'Hakuna watu kwa sasa'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, index) => {
              const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
              const colors = [
                'from-emerald-400 to-emerald-600',
                'from-blue-400 to-blue-600', 
                'from-purple-400 to-purple-600',
                'from-pink-400 to-pink-600',
                'from-orange-400 to-orange-600',
                'from-cyan-400 to-cyan-600'
              ];
              const colorClass = colors[index % colors.length];
              
              return (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className="flex items-center space-x-4 p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-white/30 hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-all duration-200 shadow-sm"
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14 ring-2 ring-white/50">
                      <AvatarImage src={contact.avatar_url} alt={contactName} />
                      <AvatarFallback className={`bg-gradient-to-br ${colorClass} text-white text-lg font-semibold`}>
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                      {contact.role === 'doctor' ? 'Dkt. ' : ''}{contactName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                      <span>{contact.role === 'doctor' ? 'Daktari' : 'Mgonjwa'}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}