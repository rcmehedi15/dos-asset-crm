import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import NewLead from "./pages/NewLead";
import LeadDetail from "./pages/LeadDetail";
import LeadDistribution from "./pages/LeadDistribution";
import Reports from "./pages/Reports";
import ProjectManagement from "./pages/ProjectManagement";
import SourceManagement from "./pages/SourceManagement";
import Users from "./pages/Users";
import LeadList from "./pages/LeadList";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import Messenger from "./pages/Messenger";
import Notices from "./pages/Notices";
import NoticeManagement from "./pages/NoticeManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads"
                element={
                  <ProtectedRoute>
                    <Leads />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads/new"
                element={
                  <ProtectedRoute>
                    <NewLead />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads/:id"
                element={
                  <ProtectedRoute>
                    <LeadDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lead-distribution"
                element={
                  <ProtectedRoute>
                    <LeadDistribution />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lead-list"
                element={
                  <ProtectedRoute>
                    <LeadList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project-management"
                element={
                  <ProtectedRoute>
                    <ProjectManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/source-management"
                element={
                  <ProtectedRoute>
                    <SourceManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messenger"
                element={
                  <ProtectedRoute>
                    <Messenger />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notices"
                element={
                  <ProtectedRoute>
                    <Notices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notice-management"
                element={
                  <ProtectedRoute>
                    <NoticeManagement />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;