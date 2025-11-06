import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { useRealtime } from "./hooks/use-realtime";
import { useVersionCheck } from "./hooks/use-version-check";
import { useProductivityMonitor } from "./hooks/use-productivity-monitor";
import { useNotifications } from "./hooks/use-notifications";
import { useOfflineSync } from "./lib/use-offline-sync";
import { useCounterSync } from "./hooks/use-counter-sync";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Campo from "@/pages/campo";
import Transporte from "@/pages/transporte";
import Algodoeira from "@/pages/algodoeira";
import BaleDetails from "@/pages/bale-details";
import Etiqueta from "@/pages/etiqueta";
import SettingsPage from "@/pages/settings";
import TalhaoStats from "@/pages/talhao-stats";
import UserManagement from "@/pages/user-management";
import ReportsPage from "@/pages/reports";

function ProtectedRoute({ component: Component, allowedRoles }: { 
  component: () => JSX.Element; 
  allowedRoles?: string[] 
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  if (allowedRoles && user) {
    // Parsear roles do usuário (vem como string JSON do banco)
    let userRoles: string[] = [];
    try {
      userRoles = typeof user.roles === 'string' 
        ? JSON.parse(user.roles) 
        : user.roles || [];
    } catch (e) {
      console.error('Erro ao parsear roles do usuário:', e);
      userRoles = [];
    }
    
    // Verificar se o usuário tem ALGUMA das roles permitidas
    const hasAccess = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasAccess) {
      console.log('❌ Acesso negado. Roles do usuário:', userRoles, 'Roles necessárias:', allowedRoles);
      return <Redirect to="/" />;
    }
  }

  return <Component />;
}

// Component to enable real-time updates and version checking
function RealtimeProvider() {
  const { isAuthenticated } = useAuth();

  // Always call the hook, but pass authentication status
  useRealtime(isAuthenticated);

  // Check for new versions periodically
  useVersionCheck();

  // Sync offline operations when online
  const sync = useOfflineSync();

  // Sync counters from server (hooks must be called unconditionally)
  useCounterSync();
  useProductivityMonitor();
  useNotifications();

  // Render a small progress bar when syncing
  return (
    <>
      {sync && sync.isSyncing && (
        <div style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 9999 }}>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.1)' }} />
          <div
            role="progressbar"
            aria-valuenow={sync.progress}
            style={{
              height: 4,
              width: `${sync.progress}%`,
              maxWidth: '100%',
              background: 'linear-gradient(90deg,#10b981,#f59e0b)',
              transition: 'width 300ms ease',
            }}
          />
        </div>
      )}
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/campo">
        <ProtectedRoute component={Campo} allowedRoles={["campo", "admin", "superadmin"]} />
      </Route>

      <Route path="/etiqueta">
        <ProtectedRoute component={Etiqueta} allowedRoles={["campo", "admin", "superadmin"]} />
      </Route>

      <Route path="/transporte">
        <ProtectedRoute component={Transporte} allowedRoles={["transporte", "admin", "superadmin"]} />
      </Route>

      <Route path="/algodoeira">
        <ProtectedRoute component={Algodoeira} allowedRoles={["algodoeira", "admin", "superadmin"]} />
      </Route>
      
      <Route path="/bale/:id">
        <ProtectedRoute component={BaleDetails} />
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} allowedRoles={["superadmin"]} />
      </Route>
      
      <Route path="/talhao-stats">
        <ProtectedRoute component={TalhaoStats} allowedRoles={["admin", "superadmin"]} />
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} allowedRoles={["admin", "superadmin"]} />
      </Route>
      
      <Route path="/users">
        <ProtectedRoute component={UserManagement} allowedRoles={["superadmin"]} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <RealtimeProvider />
          <Router />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
