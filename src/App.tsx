
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navigation from "@/components/Navigation";

// Import pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Clients from "./pages/Clients";
import Employees from "./pages/Employees";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Services from "./pages/Services";
import Wages from "./pages/Wages";
import Sprints from "./pages/Sprints";
import Invitations from "./pages/Invitations";
import Roles from "./pages/Roles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// AppContent component that uses auth context
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {user ? (
        <div className="min-h-screen w-full">
          <Navigation>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute pageName="dashboard">
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute pageName="tasks">
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute pageName="projects">
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute pageName="clients">
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute pageName="employees">
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute pageName="invoices">
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute pageName="payments">
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services"
                element={
                  <ProtectedRoute pageName="services">
                    <Services />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wages"
                element={
                  <ProtectedRoute pageName="wages">
                    <Wages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sprints"
                element={
                  <ProtectedRoute pageName="sprints">
                    <Sprints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invitations"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <Invitations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute requireSuperAdmin>
                    <Roles />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Navigation>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
