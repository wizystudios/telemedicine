import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PatientHome from '@/pages/PatientHome';
import { DoctorDashboard } from '@/components/DoctorDashboard';
import HospitalOwnerDashboard from '@/components/HospitalOwnerDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import PharmacyOwnerDashboard from '@/components/PharmacyOwnerDashboard';
import LabOwnerDashboard from '@/components/LabOwnerDashboard';
import PolyclinicOwnerDashboard from '@/components/PolyclinicOwnerDashboard';
import { Loader2 } from 'lucide-react';
import { RoleOnboarding, shouldShowOnboarding } from '@/components/RoleOnboarding';

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) return;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      let resolved: string;
      if (!data?.role) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        resolved = profile?.role || user.user_metadata?.role || 'patient';
      } else {
        resolved = data.role;
      }
      setUserRole(resolved);
      setShowOnboarding(shouldShowOnboarding(user.id, resolved));
      setLoading(false);
    }
    fetchUserRole();
  }, [user]);

  if (!user) return <Navigate to="/auth" replace />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  let dashboard: React.ReactNode;
  switch (userRole) {
    case 'super_admin': dashboard = <SuperAdminDashboard />; break;
    case 'doctor': dashboard = <DoctorDashboard />; break;
    case 'hospital_owner': dashboard = <HospitalOwnerDashboard />; break;
    case 'pharmacy_owner': dashboard = <PharmacyOwnerDashboard />; break;
    case 'lab_owner': dashboard = <LabOwnerDashboard />; break;
    case 'polyclinic_owner': dashboard = <PolyclinicOwnerDashboard />; break;
    default: dashboard = <PatientHome />;
  }

  return (
    <>
      {dashboard}
      {showOnboarding && userRole && (
        <RoleOnboarding
          userId={user.id}
          role={userRole}
          onDone={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}
