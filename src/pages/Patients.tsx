
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { PatientCard } from '@/components/PatientCard';
import { Search, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: string;
  email: string;
  phone?: string;
  country?: string;
  created_at: string;
}

export default function Patients() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Get user profile to check role from database
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id
  });

  // Check role from either database profile or user metadata
  const userRole = userProfile?.role || user?.user_metadata?.role;

  // Only allow doctors to access this page
  if (userRole && userRole !== 'doctor') {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Hairuhusiwi Kuingia
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Ukurasa huu unapatikana kwa madaktari tu.
          </p>
        </div>
      </div>
    );
  }

  // Fetch patients with urgent problem indicators
  const { data: allPatients = [], isLoading, error } = useQuery({
    queryKey: ['patients-list', debouncedSearch],
    queryFn: async () => {
      console.log('🔍 Fetching patients from profiles table...');
      
      let query = supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, avatar_url, role, email, phone, country, created_at,
          patient_problem_indicators(has_urgent_problem)
        `)
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

      if (debouncedSearch) {
        query = query.or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching patients:', error);
        throw error;
      }
      
      console.log('✅ Patients fetched successfully:', data?.length || 0);
      return data || [];
    },
    retry: 2,
    retryDelay: 1000
  });

  // Group patients into rows of 20
  const groupedPatients = [];
  for (let i = 0; i < allPatients.length; i += 20) {
    groupedPatients.push(allPatients.slice(i, i + 20));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Inapakia wagonjwa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('🚨 Error in Patients component:', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Hitilafu katika Kupakia Wagonjwa
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Imeshindwa kupakia wagonjwa: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Search only */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tafuta mgonjwa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Patients Grid - Football Card Design */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allPatients.slice(0, 20).map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              hasUrgentProblem={patient.patient_problem_indicators?.[0]?.has_urgent_problem || false}
            />
          ))}
        </div>
        
        {allPatients.length > 20 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Kuonyesha wagonjwa 20 wa kwanza. Tumia utafutaji kupata zaidi.
            </p>
          </div>
        )}

        {allPatients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Hakuna wagonjwa waliopatikana' : 'Hakuna wagonjwa kwa sasa'}
            </p>
          </div>
        )}
        
      </div>
    </div>
  );
}
