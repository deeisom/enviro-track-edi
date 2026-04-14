import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ProjectsList from "@/pages/ProjectsList";
import CreateProject from "@/pages/CreateProject";
import ProjectDetail from "@/pages/ProjectDetail";
import ClientsPage from "@/pages/ClientsPage";
import RatesPage from "@/pages/RatesPage";
import InvoicesPage from "@/pages/InvoicesPage";
import ProposalsPage from "@/pages/ProposalsPage";
import ProposalBuilder from "@/pages/ProposalBuilder";
import AuthPage from "@/pages/AuthPage";
import UsersPage from "@/pages/UsersPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/projects/new" element={<CreateProject />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientsPage />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/proposals/new" element={<ProposalBuilder />} />
        <Route path="/proposals/:id" element={<ProposalBuilder />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
