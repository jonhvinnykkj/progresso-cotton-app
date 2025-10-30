import { Badge } from "@/components/ui/badge";
import type { BaleStatus } from "@shared/schema";
import { Package, Truck, CheckCircle } from "lucide-react";

interface StatusBadgeProps {
  status: BaleStatus;
  size?: "default" | "sm" | "lg";
}

const statusConfig = {
  campo: {
    label: "Campo",
    icon: Package,
    className: "bg-bale-campo text-white border-bale-campo",
  },
  patio: {
    label: "Pátio",
    icon: Truck,
    className: "bg-bale-patio text-white border-bale-patio",
  },
  beneficiado: {
    label: "Beneficiado",
    icon: CheckCircle,
    className: "bg-bale-beneficiado text-white border-bale-beneficiado",
  },
};

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    default: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <Badge
      className={`${config.className} ${sizeClasses[size]} font-semibold inline-flex items-center gap-1.5`}
      data-testid={`badge-status-${status}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      {config.label}
    </Badge>
  );
}
