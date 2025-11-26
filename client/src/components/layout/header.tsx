import { Bell, LogOut, RefreshCw, ChevronDown, Sun, Moon } from "lucide-react";
import logoFavicon from "/favicon.png";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { user, selectedRole, logout, clearCacheAndReload } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const handleClearCache = async () => {
    toast({
      variant: "default",
      title: "Limpando cache...",
      description: "Todos os dados em cache serão removidos.",
    });

    setTimeout(() => {
      clearCacheAndReload();
    }, 1000);
  };

  // Parse user roles
  const userRoles = (() => {
    try {
      return typeof user?.roles === "string"
        ? JSON.parse(user.roles)
        : user?.roles || [];
    } catch {
      return [];
    }
  })();

  const isSuperAdmin = userRoles.includes("superadmin");

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Glass background */}
      <div className="absolute inset-0 glass-strong" />

      {/* Content */}
      <div className="relative flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Logo/Brand - mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
              <img src={logoFavicon} alt="Cotton" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-display font-bold text-lg gradient-text">
              Cotton
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications - placeholder */}
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors relative">
            <Bell className="h-5 w-5" />
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 pr-3 rounded-full glass hover:bg-surface-hover transition-all group">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-sm">
                  <span className="text-primary-foreground font-semibold text-sm">
                    {user?.username?.substring(0, 2).toUpperCase() || "U"}
                  </span>
                </div>

                {/* User info - hidden on mobile */}
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {user?.username || "Usuário"}
                  </span>
                  {selectedRole && (
                    <span className="text-xs text-primary">
                      {selectedRole}
                    </span>
                  )}
                </div>

                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 glass-card border-border/50"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRole && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                        {selectedRole}
                      </span>
                    )}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border/50" />

              {isSuperAdmin && (
                <>
                  <DropdownMenuItem
                    onClick={handleClearCache}
                    className="cursor-pointer hover:bg-surface focus:bg-surface"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span>Limpar Cache</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                </>
              )}

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </header>
  );
}
