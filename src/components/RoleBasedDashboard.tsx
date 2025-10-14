import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { ComprehensiveChatbot } from '@/components/ComprehensiveChatbot';
import { supabase } from '@/integrations/supabase/client';
import { PatientDashboard } from '@/components/PatientDashboard';
import { DoctorDashboard } from '@/components/DoctorDashboard';
import HospitalOwnerDashboard from '@/components/HospitalOwnerDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) return;
      // Fetch from new secure user_roles table
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Role-based dashboard
  if (userRole === 'super_admin') return <SuperAdminDashboard />;
  if (userRole === 'doctor') return <DoctorDashboard />;
  if (userRole === 'hospital_owner') return <HospitalOwnerDashboard />;
  if (userRole === 'pharmacy_owner' || userRole === 'lab_owner' || userRole === 'polyclinic_owner') {
    return <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Welcome {userRole === 'pharmacy_owner' ? 'Pharmacy' : userRole === 'lab_owner' ? 'Lab' : 'Polyclinic'} Owner
      </h1>
      <p>Your dashboard is coming soon. Manage your {userRole === 'pharmacy_owner' ? 'pharmacy' : userRole === 'lab_owner' ? 'laboratory' : 'polyclinic'} here.</p>
    </div>;
  }

  // Default: Patient gets chatbot
  return <ComprehensiveChatbot />;
}
