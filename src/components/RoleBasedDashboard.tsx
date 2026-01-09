import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedChatbot } from '@/components/UnifiedChatbot';
import { DoctorDashboard } from '@/components/DoctorDashboard';
import HospitalOwnerDashboard from '@/components/HospitalOwnerDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import PharmacyOwnerDashboard from '@/components/PharmacyOwnerDashboard';
import LabOwnerDashboard from '@/components/LabOwnerDashboard';
import PolyclinicOwnerDashboard from '@/components/PolyclinicOwnerDashboard';
import { Loader2 } from 'lucide-react';

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setUserRole(data?.role || 'patient');
      setLoading(false);
    }
    fetchUserRole();
  }, [user]);

  if (!user) return <Navigate to="/auth" replace />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  switch (userRole) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'hospital_owner':
      return <HospitalOwnerDashboard />;
    case 'pharmacy_owner':
      return <PharmacyOwnerDashboard />;
    case 'lab_owner':
      return <LabOwnerDashboard />;
    case 'polyclinic_owner':
      return <PolyclinicOwnerDashboard />;
    default:
      // Patients see the unified chatbot as their main interface - NO navigation pages
      return <UnifiedChatbot />;
  }
}
