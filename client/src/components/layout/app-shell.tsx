import { type ReactNode, createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";

// Context para estado do layout
interface LayoutContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export function useLayout() {
  return useContext(LayoutContext);
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LayoutContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      <div className="min-h-dvh bg-background">
        {/* Gradient overlay no topo */}
        <div className="fixed inset-x-0 top-0 h-64 hero-gradient pointer-events-none z-0" />

        {/* Sidebar - Desktop only */}
        <Sidebar />

        {/* Main content area */}
        <div
          className={cn(
            "relative z-10 flex flex-col min-h-dvh transition-all duration-300",
            // Offset para sidebar no desktop
            sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          )}
        >
          {/* Header */}
          <Header />

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>
        </div>

        {/* Bottom nav - Mobile only */}
        <BottomNav />
      </div>
    </LayoutContext.Provider>
  );
}

// Re-export layout components
export { PageContent, PageHeader, Section } from "./page-components";
