import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAnswersStore } from "@/lib/stores";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Assessment from "./pages/Assessment";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardGRC from "./pages/DashboardGRC";
import DashboardSpecialist from "./pages/DashboardSpecialist";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const loadAnswers = useAnswersStore(state => state.loadAnswers);
  const { user } = useAuth();

  useEffect(() => {
    // Only load answers when user is authenticated
    if (user) {
      loadAnswers();
    }
  }, [loadAnswers, user]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="assessment" element={<Assessment />} />
          <Route path="dashboard" element={<Navigate to="/dashboard/executive" replace />} />
          <Route path="dashboard/executive" element={<DashboardExecutive />} />
          <Route path="dashboard/grc" element={<DashboardGRC />} />
          <Route path="dashboard/specialist" element={<DashboardSpecialist />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
