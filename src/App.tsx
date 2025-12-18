import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NavProvider } from "@/contexts/NavContext";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useRealtimeChatNotifications } from "@/hooks/useRealtimeChatNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import TeleMedHome from "./pages/TeleMedHome";
import Auth from "./pages/Auth";
import RoleBasedDashboard from "./components/RoleBasedDashboard";
import BookAppointment from "./pages/BookAppointment";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import DoctorProfile from './pages/DoctorProfile';
import DoctorsList from './pages/DoctorsList';
import Appointments from './pages/Appointments';
import Notifications from './pages/Notifications';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import PatientProblems from './pages/PatientProblems';

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
  usePushNotifications(); // Enable push notifications

  if (loading) return <LoadingScreen />;
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {user && <Navbar />}
      
      <main className="flex-1 pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <TeleMedHome />} />
          <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><RoleBasedDashboard /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/book-appointment" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
          <Route path="/doctor-profile/:doctorId" element={<ProtectedRoute><DoctorProfile /></ProtectedRoute>} />
          <Route path="/doctors-list" element={<ProtectedRoute><DoctorsList /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          <Route path="/patient-detail/:patientId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
          <Route path="/patient-problems" element={<ProtectedRoute><PatientProblems /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <NavProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </NavProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
