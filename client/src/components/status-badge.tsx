import { Badge } from "@/components/ui/badge";
import type { BaleStatus } from "@shared/schema";
import { Package, Truck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: BaleStatus;
  size?: "default" | "sm" | "lg";
}

const statusConfig = {
  campo: {
    label: "Campo",
    icon: Package,
    className: "bg-primary/20 text-primary border-primary/30",
    glowClass: "shadow-glow-sm",
  },
  patio: {
    label: "Pátio",
    icon: Truck,
    className: "bg-neon-orange/20 text-neon-orange border-neon-orange/30",
    glowClass: "shadow-glow-orange",
  },
  beneficiado: {
    label: "Beneficiado",
    icon: CheckCircle,
    className: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30",
    glowClass: "shadow-glow-cyan",
  },
};

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2.5 py-1 gap-1",
    default: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    default: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <Badge
      className={cn(
        "font-medium inline-flex items-center rounded-full border",
        config.className,
        sizeClasses[size]
      )}
      data-testid={`badge-status-${status}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </Badge>
  );
}
