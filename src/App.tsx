
import React from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Clients from "./pages/Clients";
import Employees from "./pages/Employees";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Sprints from "./pages/Sprints";
import Services from "./pages/Services";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Wages from "./pages/Wages";
import Invitations from "./pages/Invitations";
import Roles from "./pages/Roles";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import GanttView from "./pages/GanttView";
import AgendaCal from "./pages/AgendaCal";
import LogCal from "./pages/LogCal";
import WorkloadCal from "./pages/WorkloadCal";
import FixedSlots from "./pages/FixedSlots";
import TimelineSlots from "./pages/TimelineSlots";
import Reminders from "./pages/Reminders";
import TimeUntil from "./pages/TimeUntil";
import RoutinesTracker from "./pages/RoutinesTracker";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                <Route path="/sprints" element={<ProtectedRoute><Sprints /></ProtectedRoute>} />
                <Route path="/fixed-slots" element={<ProtectedRoute><FixedSlots /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                <Route path="/wages" element={<ProtectedRoute><Wages /></ProtectedRoute>} />
                <Route path="/invitations" element={<ProtectedRoute requireAdmin><Invitations /></ProtectedRoute>} />
                <Route path="/roles" element={<ProtectedRoute requireSuperAdmin><Roles /></ProtectedRoute>} />
                <Route path="/gantt-view" element={<ProtectedRoute><GanttView /></ProtectedRoute>} />
                <Route path="/agenda-cal" element={<ProtectedRoute><AgendaCal /></ProtectedRoute>} />
                <Route path="/log-cal" element={<ProtectedRoute><LogCal /></ProtectedRoute>} />
                <Route path="/workload-cal" element={<ProtectedRoute><WorkloadCal /></ProtectedRoute>} />
                <Route path="/team-slots" element={<ProtectedRoute requireAdmin><TimelineSlots /></ProtectedRoute>} />
                <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
                <Route path="/time-until" element={<ProtectedRoute><TimeUntil /></ProtectedRoute>} />
                <Route path="/routines-tracker" element={<ProtectedRoute requireAdmin><RoutinesTracker /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
