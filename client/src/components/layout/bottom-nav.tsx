import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Wheat,
  Truck,
  BarChart3,
  Menu,
  Factory,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
};

// Items principais (4 máximo no bottom nav)
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/campo", label: "Campo", icon: Wheat, roles: ["campo", "admin", "superadmin"] },
  { href: "/transporte", label: "Transporte", icon: Truck, roles: ["transporte", "admin", "superadmin"] },
  { href: "/reports", label: "Relatórios", icon: BarChart3, roles: ["admin", "superadmin"] },
];

// Items secundários (aparecem no menu "Mais")
const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/algodoeira", label: "Algodoeira", icon: Factory, roles: ["algodoeira", "admin", "superadmin"] },
  { href: "/talhao-stats", label: "Estatísticas", icon: BarChart3, roles: ["admin", "superadmin"] },
];

function parseRoles(user: any): string[] {
  if (!user?.roles) return [];
  try {
    return Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles);
  } catch {
    return [];
  }
}

function canAccess(roles: string[] | undefined, userRoles: string[], selectedRole?: string | null) {
  if (!roles || roles.length === 0) return true;
  const activeRoles = new Set([...(userRoles || []), selectedRole].filter(Boolean));
  return roles.some((role) => activeRoles.has(role));
}

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { user, selectedRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const userRoles = useMemo(() => parseRoles(user), [user]);

  // Filtrar items baseado nas roles
  const primaryItems = useMemo(() =>
    PRIMARY_NAV_ITEMS.filter((item) => canAccess(item.roles, userRoles, selectedRole)),
    [userRoles, selectedRole]
  );

  const secondaryItems = useMemo(() =>
    SECONDARY_NAV_ITEMS.filter((item) => canAccess(item.roles, userRoles, selectedRole)),
    [userRoles, selectedRole]
  );

  const hasSecondaryItems = secondaryItems.length > 0;

  // Limitar a 4 items (ou 3 + "Mais")
  const visibleItems = useMemo(() =>
    hasSecondaryItems ? primaryItems.slice(0, 3) : primaryItems.slice(0, 4),
    [hasSecondaryItems, primaryItems]
  );

  if (visibleItems.length === 0) return null;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-bottom">
        {/* Glass background */}
        <div className="absolute inset-0 glass-strong border-t border-border/30" />

        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Navigation items */}
        <div className="relative flex items-center justify-around h-16 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location === item.href || location.startsWith(`${item.href}/`);

            return (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className={cn(
                  "bottom-nav-item flex-1 max-w-[72px]",
                  isActive && "active"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={cn(
                    "relative p-2 rounded-xl transition-all duration-300",
                    isActive && "bg-primary/20"
                  )}
                >
                  {/* Glow effect for active */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg" />
                  )}
                  <Icon
                    className={cn(
                      "relative h-5 w-5 transition-all duration-300 bottom-nav-icon",
                      isActive && "text-primary"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-300",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* "Mais" button se houver items secundários */}
          {hasSecondaryItems && (
            <button
              onClick={() => setMoreMenuOpen(true)}
              className="bottom-nav-item flex-1 max-w-[72px]"
              aria-label="Mais opções"
            >
              <div className="p-2 rounded-xl transition-all duration-300">
                <Menu className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                Mais
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Sheet com mais opções */}
      <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <SheetContent
          side="bottom"
          className="glass-strong border-t border-border/30 rounded-t-3xl"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left font-display">
              Mais opções
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-3 gap-4 pb-4">
            {/* Items que não estão visíveis na barra + secundários */}
            {[
              ...primaryItems.filter(
                (item) => !visibleItems.some((v) => v.href === item.href)
              ),
              ...secondaryItems,
            ].map((item) => {
              const Icon = item.icon;
              const isActive =
                location === item.href || location.startsWith(`${item.href}/`);

              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    setMoreMenuOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300",
                    isActive
                      ? "bg-primary/20 text-primary shadow-glow-sm"
                      : "bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-surface-elevated"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Theme Toggle */}
          <div className="border-t border-border/50 pt-4 pb-8">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              <div className="p-3 rounded-xl bg-surface-elevated">
                {theme === "dark" ? (
                  <Sun className="h-6 w-6" />
                ) : (
                  <Moon className="h-6 w-6" />
                )}
              </div>
              <span className="text-sm font-medium">
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
