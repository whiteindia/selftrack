
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Page imports
import Login from '@/pages/Login';
import Index from '@/pages/Index';
import Projects from '@/pages/Projects';
import Tasks from '@/pages/Tasks';
import Sprints from '@/pages/Sprints';
import Invoices from '@/pages/Invoices';
import Payments from '@/pages/Payments';
import Wages from '@/pages/Wages';
import Clients from '@/pages/Clients';
import Employees from '@/pages/Employees';
import Services from '@/pages/Services';
import Roles from '@/pages/Roles';
import Invitations from '@/pages/Invitations';
import GanttView from '@/pages/GanttView';
import AgendaCal from '@/pages/AgendaCal';
import LogCal from '@/pages/LogCal';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
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
                path="/sprints"
                element={
                  <ProtectedRoute pageName="sprints">
                    <Sprints />
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
                path="/wages"
                element={
                  <ProtectedRoute pageName="wages">
                    <Wages />
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
                path="/services"
                element={
                  <ProtectedRoute pageName="services">
                    <Services />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute pageName="roles">
                    <Roles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invitations"
                element={
                  <ProtectedRoute pageName="invitations">
                    <Invitations />
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
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
