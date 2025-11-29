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
      {/* iOS-style glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

      {/* Content */}
      <div className="relative flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Logo/Brand - mobile */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
              <img src={logoFavicon} alt="Cotton" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-semibold text-[17px] text-foreground">
              Cotton
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Theme toggle - iOS style */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-all duration-200 active:scale-95"
            title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications - iOS style */}
          <button className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-all duration-200 active:scale-95 relative">
            <Bell className="h-5 w-5" />
            {/* Notification dot */}
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
          </button>

          {/* User menu - iOS style */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 pr-2.5 rounded-full hover:bg-surface/80 transition-all duration-200 active:scale-97 ml-1">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold text-[13px]">
                    {user?.username?.substring(0, 2).toUpperCase() || "U"}
                  </span>
                </div>

                {/* User info - hidden on mobile */}
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-[15px] font-medium text-foreground">
                    {user?.username || "Usuário"}
                  </span>
                  {selectedRole && (
                    <span className="text-[11px] text-primary font-medium">
                      {selectedRole}
                    </span>
                  )}
                </div>

                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border-0 bg-card p-1.5"
            >
              <DropdownMenuLabel className="font-normal px-3 py-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-[15px] font-semibold">{user?.username}</p>
                  {selectedRole && (
                    <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                      {selectedRole}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border/50 my-1" />

              {isSuperAdmin && (
                <>
                  <DropdownMenuItem
                    onClick={handleClearCache}
                    className="cursor-pointer rounded-lg mx-1 px-3 py-2.5 text-[15px] focus:bg-surface"
                  >
                    <RefreshCw className="mr-2.5 h-4 w-4" />
                    <span>Limpar Cache</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50 my-1" />
                </>
              )}

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer rounded-lg mx-1 px-3 py-2.5 text-[15px] text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Subtle bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/40" />
    </header>
  );
}
