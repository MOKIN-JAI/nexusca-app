import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import EmployeeOverview from "./pages/EmployeeOverview";
import EmployeeClients from "./pages/EmployeeClients";
import EmployeeBanks from "./pages/EmployeeBanks";
import EmployeeRisks from "./pages/EmployeeRisks";
import EmployeeTax from "./pages/EmployeeTax";
import EmployeeSettings from "./pages/EmployeeSettings";
import ClientHub from "./pages/ClientHub";

import { EmployeeLayout } from "./components/layout/EmployeeLayout";
import { ClientLayout } from "./components/layout/ClientLayout";
import { RoleGuard } from "./components/common/RoleGuard";
import { useAuth } from "./lib/auth-store";
import { useTheme } from "./lib/theme-store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

function AppShell() {
  const initAuth = useAuth((s) => s.init);
  const initTheme = useTheme((s) => s.init);

  useEffect(() => {
    initTheme();
    const cleanup = initAuth();
    return cleanup;
  }, [initAuth, initTheme]);

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Employee */}
      <Route
        element={
          <RoleGuard allow={["employee", "admin"]}>
            <EmployeeLayout />
          </RoleGuard>
        }
      >
        <Route path="/employee" element={<EmployeeOverview />} />
        <Route path="/employee/clients" element={<EmployeeClients />} />
        <Route path="/employee/banks" element={<EmployeeBanks />} />
        <Route path="/employee/risks" element={<EmployeeRisks />} />
        <Route path="/employee/tax" element={<EmployeeTax />} />
        <Route path="/employee/settings" element={<EmployeeSettings />} />
        <Route path="/employee/client/:id" element={<ClientHub />} />
      </Route>

      {/* Customer */}
      <Route
        element={
          <RoleGuard allow={["customer"]}>
            <ClientLayout />
          </RoleGuard>
        }
      >
        <Route path="/client" element={<ClientHub />} />
      </Route>

      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors closeButton position="top-right" />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppShell />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
