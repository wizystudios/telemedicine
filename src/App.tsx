import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NavProvider } from "@/contexts/NavContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useRealtimeChatNotifications } from "@/hooks/useRealtimeChatNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { BottomNav } from "./components/layout/BottomNav";
import { Navbar } from "./components/layout/Navbar";
import { RoleSidebar } from "./components/layout/RoleSidebar";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import RoleBasedDashboard from "./components/RoleBasedDashboard";
import ChatbotPage from "./pages/ChatbotPage";
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
import Prescriptions from "./pages/Prescriptions";
import MedicalRecords from "./pages/MedicalRecords";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthRoute = location.pathname === '/auth' || location.pathname === '/reset-password';
  
  useRealtimeChatNotifications();
  usePushNotifications();

  if (loading) return <LoadingScreen />;
  
  const showSidebar = !!user && !isAuthRoute;

  return (
    <div className="min-h-screen bg-background">
      {!isAuthRoute && <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
      <div className="flex">
        {showSidebar && (
          <RoleSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <main className={`flex-1 min-w-0 ${isAuthRoute ? 'h-screen overflow-hidden' : 'pb-14 md:pb-0'}`}>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
            <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><RoleBasedDashboard /></ProtectedRoute>} />
            <Route path="/chatbot" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/doctors-list" element={<ProtectedRoute><DoctorsList /></ProtectedRoute>} />
            <Route path="/doctor-profile/:doctorId" element={<ProtectedRoute><DoctorProfile /></ProtectedRoute>} />
            <Route path="/book-appointment" element={<ProtectedRoute><BookAppointment /></ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
            <Route path="/patient-detail/:patientId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
            <Route path="/patient-profile/:patientId" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />
            <Route path="/patient-problems" element={<ProtectedRoute><PatientProblems /></ProtectedRoute>} />
            <Route path="/patient-problem-form" element={<ProtectedRoute><PatientProblemForm /></ProtectedRoute>} />
            <Route path="/hospital-profile/:hospitalId" element={<ProtectedRoute><HospitalProfile /></ProtectedRoute>} />
            <Route path="/pharmacy-profile/:pharmacyId" element={<ProtectedRoute><PharmacyProfile /></ProtectedRoute>} />
            <Route path="/laboratory-profile/:labId" element={<ProtectedRoute><LaboratoryProfile /></ProtectedRoute>} />
            <Route path="/polyclinic-profile/:polyclinicId" element={<ProtectedRoute><PolyclinicProfile /></ProtectedRoute>} />
            <Route path="/hospital-management" element={<ProtectedRoute><HospitalManagement /></ProtectedRoute>} />
            <Route path="/nearby" element={<ProtectedRoute><NearbyPlaces /></ProtectedRoute>} />
            <Route path="/prescriptions" element={<ProtectedRoute><Prescriptions /></ProtectedRoute>} />
            <Route path="/medical-records" element={<ProtectedRoute><MedicalRecords /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      {!isAuthRoute && <BottomNav />}
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
            <NavProvider>
              <AppContent />
            </NavProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
