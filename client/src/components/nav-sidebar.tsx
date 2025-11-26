import { useState, useEffect, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Create context for sidebar state
const SidebarContext = createContext<{ collapsed: boolean; shouldShowNavbar: boolean }>({ 
  collapsed: false,
  shouldShowNavbar: true
});

export function useSidebar() {
  return useContext(SidebarContext);
}
import {
  LayoutDashboard,
  Truck,
  Wheat,
  BarChart3,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  RefreshCw,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import logoProgresso from "/favicon.svg";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: string;
  roles?: string[];
  showInMobileBar?: boolean; // Se true, aparece na barra inferior mobile
}

export function NavSidebar() {
  const [location, setLocation] = useLocation();
  const { logout, user, selectedRole, clearCacheAndReload } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleClearCache = async () => {
    toast({
      variant: "info",
      title: "Limpando cache...",
      description: "Todos os dados em cache serão removidos.",
    });
    
    setTimeout(() => {
      clearCacheAndReload();
    }, 1000);
  };

  const navItems: NavItem[] = [
    // Itens prioritários para admin/superadmin (aparecem na barra mobile)
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "superadmin"],
      showInMobileBar: true,
    },
    {
      title: "Estatísticas",
      href: "/talhao-stats",
      icon: BarChart3,
      roles: ["admin", "superadmin"],
      showInMobileBar: true,
    },
    {
      title: "Relatórios",
      href: "/reports",
      icon: FileText,
      roles: ["admin", "superadmin"],
      showInMobileBar: true,
    },
    {
      title: "Usuários",
      href: "/users",
      icon: Users,
      roles: ["superadmin"],
      showInMobileBar: true,
    },
    {
      title: "Configurações",
      href: "/settings",
      icon: Settings,
      roles: ["superadmin"],
      showInMobileBar: true,
    },
    // Itens operacionais (aparecem na barra para usuários campo/transporte/algodoeira, só no hambúrguer para admin/superadmin)
    {
      title: "Campo",
      href: "/campo",
      icon: Wheat,
      roles: ["campo", "admin", "superadmin"],
      showInMobileBar: true, // Aparece na barra, mas será filtrado dinamicamente
    },
    {
      title: "Transporte",
      href: "/transporte",
      icon: Truck,
      roles: ["transporte", "admin", "superadmin"],
      showInMobileBar: true,
    },
    {
      title: "Algodoeira",
      href: "/algodoeira",
      icon: FileBarChart,
      roles: ["algodoeira", "admin", "superadmin"],
      showInMobileBar: true,
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true; // Item sem restrição de roles
    if (!user) return false; // Sem usuário, não mostra
    
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
    
    // Verificar se o usuário tem ALGUMA das roles necessárias para o item
    return item.roles.some(role => userRoles.includes(role));
  });

  // Determinar quais itens aparecem na barra mobile baseado nas roles do usuário
  const isAdminUser = user && (() => {
    try {
      const userRoles = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles || [];
      return userRoles.includes('admin') || userRoles.includes('superadmin');
    } catch (e) {
      return false;
    }
  })();

  // Para admin/superadmin: esconder campo/transporte/algodoeira da barra mobile
  const mobileBarItems = filteredNavItems.map(item => {
    if (isAdminUser && ['Campo', 'Transporte', 'Algodoeira'].includes(item.title)) {
      return { ...item, showInMobileBar: false };
    }
    return item;
  });

  // Sempre mostrar navbar (mesmo com 1 item, usuário precisa do botão de logout)
  const shouldShowNavbar = filteredNavItems.length >= 1;

  // Se não deve mostrar a navbar, não renderizar nada
  if (!shouldShowNavbar) {
    return (
      <SidebarContext.Provider value={{ collapsed, shouldShowNavbar }}>
        {null}
      </SidebarContext.Provider>
    );
  }

  return (
    <SidebarContext.Provider value={{ collapsed, shouldShowNavbar }}>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out bg-white border-r border-green-100 shadow-[6px_0_24px_rgba(0,0,0,0.05)]",
          collapsed ? "w-20" : "w-64"
        )}
      >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-green-100 px-4 bg-white">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img 
                src={logoProgresso} 
                alt="Progresso" 
                className="h-8 w-auto"
              />
              <div className="flex flex-col">
                <span className="font-bold text-green-700 text-sm">
                  Cotton ID
                </span>
                <span className="text-xs text-muted-foreground">
                  Grupo Progresso
                </span>
              </div>
            </div>
          )}
          {collapsed && (
            <img 
              src={logoProgresso} 
              alt="Progresso" 
              className="h-8 w-auto mx-auto"
            />
          )}
        </div>

        {/* User Info */}
        {!collapsed && user && (
          <div className="p-4 border-b border-green-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {user.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900">
                  {user.username}
                </p>
                {selectedRole && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full font-semibold">
                      {selectedRole}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start transition-colors duration-150",
                  isActive
                    ? "bg-green-100 text-green-900 border border-green-200 shadow-[0_2px_10px_rgba(22,163,74,0.12)]"
                    : "bg-transparent hover:bg-green-50 text-gray-800",
                  collapsed && "justify-center px-2"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setLocation(item.href)}
              >
                <Icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                {!collapsed && (
                  <span className="flex-1 text-left">{item.title}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-green-100 p-3 space-y-2 bg-white">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start transition-colors duration-150 hover:bg-green-50",
              collapsed && "lg:justify-center lg:px-2"
            )}
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          >
            {theme === "dark" ? (
              <Sun className={cn("h-5 w-5", !collapsed && "mr-3")} />
            ) : (
              <Moon className={cn("h-5 w-5", !collapsed && "mr-3")} />
            )}
            {!collapsed && (theme === "dark" ? "Modo Claro" : "Modo Escuro")}
          </Button>

          {selectedRole === "superadmin" && (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start transition-colors duration-150 hover:bg-green-50",
                collapsed && "lg:justify-center lg:px-2"
              )}
              onClick={handleClearCache}
              title="Limpar Cache"
            >
              <RefreshCw className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && "Limpar Cache"}
            </Button>
          )}
          
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-150",
              collapsed && "lg:justify-center lg:px-2"
            )}
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
            {!collapsed && "Sair"}
          </Button>
          
          {/* Botão de recolher apenas em desktop */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full hover:bg-green-100"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-xs">Recolher</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>

      {/* Mobile Bottom Navigation - reformulada */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-green-100 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-600 via-yellow-400 to-green-600" />

        <div className="flex items-center justify-around h-16 px-2 gap-1">
          {mobileBarItems
            .filter(item => item.showInMobileBar !== false)
            .slice(0, 4)
            .map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 active:scale-95",
                    isActive ? "text-green-900" : "text-gray-700 hover:text-green-700"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-600 via-green-500 to-yellow-400 shadow-lg shadow-green-500/20 animate-fade-in" />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5 relative z-10",
                      isActive ? "text-white drop-shadow-sm" : ""
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium relative z-10",
                      isActive ? "text-white" : ""
                    )}
                  >
                    {item.title}
                  </span>
                </button>
              );
            })}

          {(() => {
            const visibleInBar = mobileBarItems.filter(item => item.showInMobileBar !== false);
            const hasHiddenItems = mobileBarItems.some(item => item.showInMobileBar === false);
            const needsHamburger = hasHiddenItems || visibleInBar.length > 4;
            
            if (!needsHamburger) return null;
            
            return (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 active:scale-95 text-gray-700 hover:text-green-700"
              >
                <Menu className="h-5 w-5" strokeWidth={2} />
                <span className="text-[10px] font-medium">
                  Mais
                </span>
              </button>
            );
          })()}
        </div>
      </nav>

      {/* Sheet com todos os itens de navegação */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Menu de Navegação</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all duration-300",
                    isActive && "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md",
                    !isActive && "hover:bg-green-100 dark:hover:bg-gray-800"
                  )}
                  onClick={() => {
                    setLocation(item.href);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="flex-1 text-left">{item.title}</span>
                </Button>
              );
            })}
          </div>

          {/* Footer com ações */}
          <div className="mt-6 pt-6 border-t space-y-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-green-100"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 mr-3" />
              ) : (
                <Moon className="h-5 w-5 mr-3" />
              )}
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </Button>

            {selectedRole === "superadmin" && (
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-green-100"
                onClick={() => {
                  handleClearCache();
                  setMobileMenuOpen(false);
                }}
              >
                <RefreshCw className="h-5 w-5 mr-3" />
                Limpar Cache
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </SidebarContext.Provider>
  );
}
