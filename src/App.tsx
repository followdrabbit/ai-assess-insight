import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAnswersStore } from "@/lib/stores";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { VoiceSettingsProvider } from "@/contexts/VoiceSettingsContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Assessment from "./pages/Assessment";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardGRC from "./pages/DashboardGRC";
import DashboardSpecialist from "./pages/DashboardSpecialist";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const loadAnswers = useAnswersStore(state => state.loadAnswers);

  useEffect(() => {
    loadAnswers();
  }, [loadAnswers]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/demo" element={<Demo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="assessment" element={<Assessment />} />
          <Route path="dashboard" element={<Navigate to="/dashboard/executive" replace />} />
          <Route path="dashboard/executive" element={<DashboardExecutive />} />
          <Route path="dashboard/grc" element={<DashboardGRC />} />
          <Route path="dashboard/specialist" element={<DashboardSpecialist />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <VoiceSettingsProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </VoiceSettingsProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
