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
import NearbyPlaces from "./pages/NearbyPlaces";
import Appointments from "./pages/Appointments";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import DoctorsList from "./pages/DoctorsList";
import Patients from "./pages/Patients";
import PatientProblems from "./pages/PatientProblems";
import PatientProblemForm from "./pages/PatientProblemForm";
import PatientDetail from "./pages/PatientDetail";
import PatientProfile from "./pages/PatientProfile";
import DoctorProfile from "./pages/DoctorProfile";
import HospitalProfile from "./pages/HospitalProfile";
import PharmacyProfile from "./pages/PharmacyProfile";
import BookAppointment from "./pages/BookAppointment";
import HospitalManagement from "./pages/HospitalManagement";
import Notifications from "./pages/Notifications";

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
        
        {/* Core Pages */}
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        
        {/* Doctor related */}
        <Route path="/doctors-list" element={<ProtectedRoute><DoctorsList /></ProtectedRoute>} />
        <Route path="/doctor-profile/:doctorId" element={<ProtectedRoute><DoctorProfile /></ProtectedRoute>} />
        <Route path="/book-appointment" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
        
        {/* Patient related */}
        <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
        <Route path="/patient-detail/:patientId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
        <Route path="/patient-profile/:patientId" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />
        <Route path="/patient-problems" element={<ProtectedRoute><PatientProblems /></ProtectedRoute>} />
        <Route path="/patient-problem-form" element={<ProtectedRoute><PatientProblemForm /></ProtectedRoute>} />
        
        {/* Institution Profiles */}
        <Route path="/hospital-profile/:hospitalId" element={<ProtectedRoute><HospitalProfile /></ProtectedRoute>} />
        <Route path="/pharmacy-profile/:pharmacyId" element={<ProtectedRoute><PharmacyProfile /></ProtectedRoute>} />
        <Route path="/laboratory-profile/:labId" element={<ProtectedRoute><LaboratoryProfile /></ProtectedRoute>} />
        <Route path="/polyclinic-profile/:polyclinicId" element={<ProtectedRoute><PolyclinicProfile /></ProtectedRoute>} />
        
        {/* Management */}
        <Route path="/hospital-management" element={<ProtectedRoute><HospitalManagement /></ProtectedRoute>} />
        <Route path="/nearby" element={<ProtectedRoute><NearbyPlaces /></ProtectedRoute>} />
        
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
