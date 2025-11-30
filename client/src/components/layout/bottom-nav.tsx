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
      {/* iOS-style Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-bottom">
        {/* iOS glass background */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/30" />

        {/* Navigation items - iOS tab bar style */}
        <div className="relative flex items-center justify-around h-[56px] px-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location === item.href || location.startsWith(`${item.href}/`);

            return (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all duration-200 active:scale-95"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={cn(
                    "flex flex-col items-center justify-center px-2 py-1 rounded-full transition-all",
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-semibold transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}

          {/* "Mais" button */}
          {hasSecondaryItems && (
            <button
              onClick={() => setMoreMenuOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all duration-200 active:scale-95"
              aria-label="Mais opções"
            >
              <div className="flex flex-col items-center justify-center px-2 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-6 w-6" strokeWidth={2} />
                <span className="text-[11px] font-semibold">Mais</span>
              </div>
            </button>
          )}
        </div>
      </nav>

      {/* iOS-style Action Sheet */}
      <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <SheetContent
          side="bottom"
          className="bg-card border-0 rounded-t-3xl p-0 max-h-[85vh]"
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-5 pb-4">
            <SheetTitle className="text-left text-[17px] font-semibold">
              Mais opções
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 px-5 pb-4">
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
                    "flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200 active:scale-95",
                    isActive
                      ? "bg-primary/10"
                      : "bg-surface hover:bg-surface-hover"
                  )}
                >
                  <div
                    className={cn(
                      "p-3.5 rounded-xl transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-elevated text-muted-foreground"
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className={cn(
                    "text-[13px] font-semibold",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Theme Toggle - inline action */}
          <div className="border-t border-border/50 mx-5 pt-4 pb-8">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-4 w-full p-4 rounded-2xl bg-surface hover:bg-surface-hover transition-all duration-200 active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-xl bg-surface-elevated">
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className="text-[15px] font-medium text-foreground">
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
