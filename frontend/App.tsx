import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { RAGModeProvider } from "./hooks/useRAGMode";
import Index from "./pages/Index";
import Features from "./pages/Features";
import Workflow from "./pages/Workflow";
import Dashboard from "./pages/Dashboard";
import DashboardTest from "./pages/DashboardTest";
import Docs from "./pages/Docs";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import IntelligentDemo from "./pages/IntelligentDemo";
import TestAIAssistant from "./pages/TestAIAssistant";
import AutoDeploy from "./pages/AutoDeploy";
import DockerMonitor from "./pages/DockerMonitor";
import DockerStatus from "./pages/DockerStatus";
import DockerBuildFix from "./pages/DockerBuildFix";
import DockerAutoFix from "./pages/DockerAutoFix";
import LangChainDockerFix from "./pages/LangChainDockerFix";
import DeploymentDashboard from "./pages/DeploymentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RAGModeProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/features" element={<Features />} />
              <Route path="/workflow" element={<Workflow />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard-test" element={<DashboardTest />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/intelligent-demo" element={<IntelligentDemo />} />
              <Route path="/test-ai-assistant" element={<TestAIAssistant />} />
              <Route path="/auto-deploy" element={<AutoDeploy />} />
              <Route path="/docker-monitor" element={<DockerMonitor />} />
              <Route path="/docker-status" element={<DockerStatus />} />
              <Route path="/docker-build-fix" element={<DockerBuildFix />} />
              <Route path="/docker-auto-fix" element={<DockerAutoFix />} />
              <Route path="/langchain-docker-fix" element={<LangChainDockerFix />} />
              <Route path="/deployment-dashboard" element={<DeploymentDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </RAGModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
