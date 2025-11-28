import { useMemo, useCallback, forwardRef } from "react";
import { useLocation } from "wouter";
import logoFavicon from "/favicon.png";
import {
  LayoutDashboard,
  Wheat,
  Truck,
  BarChart3,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Factory,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useLayout } from "./app-shell";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Forward ref button for Tooltip compatibility
const SidebarButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button ref={ref} className={className} {...props}>
    {children}
  </button>
));
SidebarButton.displayName = "SidebarButton";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Estatísticas", href: "/talhao-stats", icon: BarChart3, roles: ["admin", "superadmin"] },
  { title: "Relatórios", href: "/reports", icon: FileText, roles: ["admin", "superadmin"] },
  { title: "Campo", href: "/campo", icon: Wheat, roles: ["campo", "admin", "superadmin"] },
  { title: "Transporte", href: "/transporte", icon: Truck, roles: ["transporte", "admin", "superadmin"] },
  { title: "Algodoeira", href: "/algodoeira", icon: Factory, roles: ["algodoeira", "admin", "superadmin"] },
  { title: "Usuários", href: "/users", icon: Users, roles: ["superadmin"] },
  { title: "Configurações", href: "/settings", icon: Settings, roles: ["superadmin"] },
];

function parseRoles(user: any): string[] {
  if (!user?.roles) return [];
  try {
    return Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles);
  } catch {
    return [];
  }
}

function canAccess(roles: string[] | undefined, userRoles: string[]) {
  if (!roles || roles.length === 0) return true;
  return roles.some((role) => userRoles.includes(role));
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, selectedRole, logout, clearCacheAndReload } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen } = useLayout();
  const { toast } = useToast();

  const userRoles = useMemo(() => parseRoles(user), [user]);
  const isSuperAdmin = useMemo(() => userRoles.includes("superadmin"), [userRoles]);

  const filteredNavItems = useMemo(() =>
    NAV_ITEMS.filter((item) => canAccess(item.roles, userRoles)),
    [userRoles]
  );

  const handleLogout = useCallback(() => {
    logout();
    setLocation("/");
  }, [logout, setLocation]);

  const handleClearCache = useCallback(async () => {
    toast({
      variant: "default",
      title: "Limpando cache...",
      description: "Todos os dados em cache serão removidos.",
    });
    setTimeout(() => {
      clearCacheAndReload();
    }, 1000);
  }, [toast, clearCacheAndReload]);

  // Conteúdo comum do sidebar
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col text-sidebar-foreground">
      {/* Header com Logo */}
      <div
        className={cn(
          "flex items-center border-b border-border/50 h-16",
          sidebarCollapsed && !mobile ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {(!sidebarCollapsed || mobile) && (
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-sm overflow-hidden">
              <img src={logoFavicon} alt="Cotton" className="h-7 w-7 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg gradient-text">
                Cotton
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Grupo Progresso
              </span>
            </div>
          </div>
        )}
        {sidebarCollapsed && !mobile && (
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-sm overflow-hidden">
            <img src={logoFavicon} alt="Cotton" className="h-7 w-7 object-contain" />
          </div>
        )}

        {/* Close button for mobile */}
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      {(!sidebarCollapsed || mobile) && user && (
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-sm">
              <span className="text-primary-foreground font-semibold text-sm">
                {user.username.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-sidebar-foreground">
                {user.username}
              </p>
              {selectedRole && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary mt-1">
                  {selectedRole}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(`${item.href}/`);

          const buttonContent = (
            <>
              <Icon className={cn("h-5 w-5 nav-icon", !sidebarCollapsed && !mobile && "mr-3")} />
              {(!sidebarCollapsed || mobile) && (
                <span className="flex-1 text-left text-sm">{item.title}</span>
              )}
            </>
          );

          const buttonClassName = cn(
            "nav-item w-full",
            isActive && "active",
            sidebarCollapsed && !mobile && "justify-center px-2"
          );

          const handleClick = () => {
            setLocation(item.href);
            if (mobile) setSidebarOpen(false);
          };

          // Wrap in tooltip when collapsed
          if (sidebarCollapsed && !mobile) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <SidebarButton onClick={handleClick} className={buttonClassName}>
                    {buttonContent}
                  </SidebarButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="glass-card">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <button
              key={item.href}
              onClick={handleClick}
              className={buttonClassName}
            >
              {buttonContent}
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-border/50 p-3 space-y-2">
        {/* Theme Toggle */}
        {sidebarCollapsed && !mobile ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <SidebarButton
                onClick={toggleTheme}
                className="nav-item w-full justify-center px-2"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </SidebarButton>
            </TooltipTrigger>
            <TooltipContent side="right" className="glass-card">
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="nav-item w-full"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 mr-3" />
            ) : (
              <Moon className="h-5 w-5 mr-3" />
            )}
            <span className="flex-1 text-left text-sm">
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </span>
          </button>
        )}

        {isSuperAdmin && (
          sidebarCollapsed && !mobile ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <SidebarButton
                  onClick={handleClearCache}
                  className="nav-item w-full justify-center px-2"
                >
                  <RefreshCw className="h-5 w-5" />
                </SidebarButton>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass-card">
                Limpar Cache
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleClearCache}
              className="nav-item w-full"
            >
              <RefreshCw className="h-5 w-5 mr-3" />
              <span className="flex-1 text-left text-sm">Limpar Cache</span>
            </button>
          )
        )}

        {sidebarCollapsed && !mobile ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <SidebarButton
                onClick={handleLogout}
                className="nav-item w-full text-destructive hover:bg-destructive/10 justify-center px-2"
              >
                <LogOut className="h-5 w-5" />
              </SidebarButton>
            </TooltipTrigger>
            <TooltipContent side="right" className="glass-card">
              Sair
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="nav-item w-full text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="flex-1 text-left text-sm">Sair</span>
          </button>
        )}

        {/* Collapse toggle - desktop only */}
        {!mobile && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "nav-item w-full text-muted-foreground",
              sidebarCollapsed && "justify-center px-2"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left text-sm">Recolher</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block fixed left-0 top-0 z-40 h-screen transition-all duration-300",
          "bg-sidebar border-r border-border/50",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-sidebar border-r border-border/50"
        >
          <SidebarContent mobile />
        </SheetContent>
      </Sheet>
    </>
  );
}
