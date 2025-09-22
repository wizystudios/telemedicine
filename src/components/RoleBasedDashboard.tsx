import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { ComprehensiveChatbot } from '@/components/ComprehensiveChatbot';

export default function RoleBasedDashboard() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Single comprehensive chatbot interface for all functionality
  return <ComprehensiveChatbot />;
}