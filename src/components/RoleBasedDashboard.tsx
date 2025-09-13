import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import PatientDashboard from '@/pages/Dashboard';
import HospitalOwnerDashboard from '@/components/HospitalOwnerDashboard';

export default function RoleBasedDashboard() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // For now, show appropriate dashboard based on user existence
  // Hospital owners can access hospital management, others see patient dashboard
  return <PatientDashboard />;
}