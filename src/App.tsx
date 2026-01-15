import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAnswersStore } from "@/lib/stores";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Assessment from "./pages/Assessment";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardGRC from "./pages/DashboardGRC";
import DashboardSpecialist from "./pages/DashboardSpecialist";
import Settings from "./pages/Settings";
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="assessment" element={<Assessment />} />
          <Route path="dashboard" element={<Navigate to="/dashboard/executive" replace />} />
          <Route path="dashboard/executive" element={<DashboardExecutive />} />
          <Route path="dashboard/grc" element={<DashboardGRC />} />
          <Route path="dashboard/specialist" element={<DashboardSpecialist />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
