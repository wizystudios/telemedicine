import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useRealtimeChatNotifications } from "@/hooks/useRealtimeChatNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import Auth from "./pages/Auth";
import RoleBasedDashboard from "./components/RoleBasedDashboard";
import NotFound from "./pages/NotFound";
import LaboratoryProfile from "./pages/LaboratoryProfile";
import PolyclinicProfile from "./pages/PolyclinicProfile";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}

function AppContent() {
  const { user, loading } = useAuth();
  
  useRealtimeChatNotifications();
  usePushNotifications();

  if (loading) return <LoadingScreen />;
  
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Unauthenticated users go to auth, authenticated go to dashboard (chatbot) */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        
        {/* Main dashboard - chatbot is the home for patients, role-based for others */}
        <Route path="/dashboard" element={<ProtectedRoute><RoleBasedDashboard /></ProtectedRoute>} />
        
        {/* Laboratory Profile */}
        <Route path="/laboratory-profile/:labId" element={<ProtectedRoute><LaboratoryProfile /></ProtectedRoute>} />
        
        {/* Polyclinic Profile */}
        <Route path="/polyclinic-profile/:polyclinicId" element={<ProtectedRoute><PolyclinicProfile /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
