
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Import pages
import Login from "@/pages/Login";
import Index from "@/pages/Index";
import Projects from "@/pages/Projects";
import Tasks from "@/pages/Tasks";
import Clients from "@/pages/Clients";
import Employees from "@/pages/Employees";
import Sprints from "@/pages/Sprints";
import TimeUntil from "@/pages/TimeUntil";
import RoutinesTracker from "@/pages/RoutinesTracker";
import FixedSlots from "@/pages/FixedSlots";
import Reminders from "@/pages/Reminders";
import TimelineSlots from "@/pages/TimelineSlots";
import Invoices from "@/pages/Invoices";
import Payments from "@/pages/Payments";
import Services from "@/pages/Services";
import Wages from "@/pages/Wages";
import Invitations from "@/pages/Invitations";
import Roles from "@/pages/Roles";
import GanttView from "@/pages/GanttView";
import AgendaCal from "@/pages/AgendaCal";
import LogCal from "@/pages/LogCal";
import WorkloadCal from "@/pages/WorkloadCal";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute pageName="dashboard">
                    <Index />
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
                path="/tasks"
                element={
                  <ProtectedRoute pageName="tasks">
                    <Tasks />
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
                path="/sprints"
                element={
                  <ProtectedRoute pageName="sprints">
                    <Sprints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/time-until"
                element={
                  <ProtectedRoute pageName="time-until">
                    <TimeUntil />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/routines-tracker"
                element={
                  <ProtectedRoute requireAdmin>
                    <RoutinesTracker />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fixed-slots"
                element={
                  <ProtectedRoute requireAdmin>
                    <FixedSlots />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reminders"
                element={
                  <ProtectedRoute requireAdmin>
                    <Reminders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timeline-slots"
                element={
                  <ProtectedRoute requireAdmin>
                    <TimelineSlots />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workload-cal"
                element={
                  <ProtectedRoute pageName="workload-cal">
                    <WorkloadCal />
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
              <Route
                path="/gantt-view"
                element={
                  <ProtectedRoute pageName="gantt-view">
                    <GanttView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agenda-cal"
                element={
                  <ProtectedRoute pageName="agenda-cal">
                    <AgendaCal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/log-cal"
                element={
                  <ProtectedRoute pageName="log-cal">
                    <LogCal />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
