import { useLocation } from "wouter";
import { LayoutDashboard, Wheat, Truck, BarChart3, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campo", label: "Campo", icon: Wheat, roles: ["campo", "admin", "superadmin"] },
  { href: "/transporte", label: "Transporte", icon: Truck, roles: ["transporte", "admin", "superadmin"] },
  { href: "/reports", label: "Relatórios", icon: BarChart3, roles: ["admin", "superadmin"] },
  { href: "/settings", label: "Config", icon: Settings2, roles: ["superadmin"] },
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
  const userRoles = parseRoles(user);

  const items = NAV_ITEMS.filter((item) => canAccess(item.roles, userRoles, selectedRole));

  if (items.length === 0) return null;

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-40 px-4 sm:hidden">
      <div className="mx-auto max-w-xl rounded-2xl border bg-background/95 backdrop-blur shadow-lg ring-1 ring-border/70">
        <div className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-xs font-semibold transition-colors",
                  active
                    ? "text-primary bg-primary/10 rounded-xl"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
