import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-context";
import { useRealtime } from "./hooks/use-realtime";
import { useVersionCheck } from "./hooks/use-version-check";
import { useProductivityMonitor } from "./hooks/use-productivity-monitor";
import { useOfflineSync } from "./lib/use-offline-sync";
import { useCounterSync } from "./hooks/use-counter-sync";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Lazy load pages for better initial bundle size
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Campo = lazy(() => import("@/pages/campo"));
const Transporte = lazy(() => import("@/pages/transporte"));
const Algodoeira = lazy(() => import("@/pages/algodoeira"));
const BaleDetails = lazy(() => import("@/pages/bale-details"));
const Etiqueta = lazy(() => import("@/pages/etiqueta"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const TalhaoStats = lazy(() => import("@/pages/talhao-stats"));
const Talhoes = lazy(() => import("@/pages/talhoes"));
const TalhaoDetail = lazy(() => import("@/pages/talhao-detail"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const ReportsPage = lazy(() => import("@/pages/reports"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component, allowedRoles }: {
  component: React.ComponentType;
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
    <Suspense fallback={<PageLoader />}>
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

      <Route path="/talhoes">
        <ProtectedRoute component={Talhoes} />
      </Route>

      <Route path="/talhoes/:id">
        <ProtectedRoute component={TalhaoDetail} />
      </Route>

      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} allowedRoles={["admin", "superadmin"]} />
      </Route>
      
      <Route path="/users">
        <ProtectedRoute component={UserManagement} allowedRoles={["superadmin"]} />
      </Route>
      
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <RealtimeProvider />
            <Router />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
