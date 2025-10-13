
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationSidebar } from "@/components/layout/NotificationSidebar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { WelcomePages } from "@/components/welcome/WelcomePages";
import { AppointmentNotificationHandler } from "@/components/AppointmentNotificationHandler";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import TeleMedHome from "./pages/TeleMedHome";
import Auth from "./pages/Auth";
import RoleBasedDashboard from "./components/RoleBasedDashboard";
import BookAppointment from "./pages/BookAppointment";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

import DoctorProfile from './pages/DoctorProfile';
import PharmacyProfile from './pages/PharmacyProfile';
import HospitalProfile from './pages/HospitalProfile';
import DoctorsList from './pages/DoctorsList';
import Appointments from './pages/Appointments';
import Notifications from './pages/Notifications';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import PatientProblems from './pages/PatientProblems';
import HospitalManagement from './pages/HospitalManagement';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Check if current route is messages page
  const isMessagesPage = location.pathname.startsWith('/messages');
  
  useEffect(() => {
    // Check if user has seen welcome pages before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome && !user) {
      setShowWelcome(true);
    }
  }, [user]);

  useEffect(() => {
    // Listen for notification toggle event
    const handleToggleNotifications = () => {
      setShowNotifications(!showNotifications);
    };

    window.addEventListener('toggleNotifications', handleToggleNotifications);
    return () => {
      window.removeEventListener('toggleNotifications', handleToggleNotifications);
    };
  }, [showNotifications]);

  const handleWelcomeComplete = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };
  
  if (loading) {
    return <LoadingScreen />;
  }

  // Show welcome pages if user hasn't seen them and isn't logged in
  if (showWelcome && !user) {
    return <WelcomePages onComplete={handleWelcomeComplete} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      {/* Navbar - Only show when user is logged in */}
      {user && <Navbar />}
      
      {/* Main Content */}
      <main className="flex-1">
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <TeleMedHome />} />
            <Route path="/chatbot" element={user ? <Navigate to="/dashboard" replace /> : <TeleMedHome />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <RoleBasedDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
           <Route 
            path="/book-appointment" 
            element={
              <ProtectedRoute>
                <BookAppointment />
              </ProtectedRoute>
            } 
           />
           
           <Route path="/doctor-profile/:doctorId" element={<ProtectedRoute><DoctorProfile /></ProtectedRoute>} />
           <Route path="/pharmacy-profile/:pharmacyId" element={<ProtectedRoute><PharmacyProfile /></ProtectedRoute>} />
           <Route path="/hospital-profile/:hospitalId" element={<ProtectedRoute><HospitalProfile /></ProtectedRoute>} />
           <Route path="/doctors-list" element={<ProtectedRoute><DoctorsList /></ProtectedRoute>} />
           <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
           <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
           <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
           <Route path="/patient-detail/:patientId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
           <Route path="/patient-problems" element={<ProtectedRoute><PatientProblems /></ProtectedRoute>} />
           <Route path="/hospital-management" element={<ProtectedRoute><HospitalManagement /></ProtectedRoute>} />
        </Routes>
      </main>
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
