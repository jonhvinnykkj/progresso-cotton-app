import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Container principal para o conteúdo da página
 */
export function PageContent({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 w-full",
        padded && "container mx-auto px-4 sm:px-6 py-6 max-w-7xl",
        // Extra padding for bottom nav on mobile
        "pb-24 lg:pb-8",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Header da página com título, subtítulo, ícone e ações
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6",
        className
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        {icon && (
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 shadow-glow-sm">
            {icon}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight gradient-text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {meta}
        </div>
      </div>
      {actions && (
        <div className="shrink-0 flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/**
 * Seção com card glass
 */
interface SectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  glow?: boolean;
}

export function Section({
  title,
  description,
  action,
  children,
  className,
  padded = true,
  glow = false,
}: SectionProps) {
  return (
    <div
      className={cn(
        "glass-card",
        glow && "shadow-glow-sm",
        className
      )}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="space-y-1">
            {title && (
              <h3 className="text-base font-semibold text-foreground">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(padded ? "p-4 sm:p-6" : "p-0", (title || description || action) && padded && "pt-4")}>
        {children}
      </div>
    </div>
  );
}

/**
 * Grid responsivo para cards
 */
export function CardGrid({
  children,
  className,
  cols = 3,
}: {
  children: ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}) {
  const colsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4 sm:gap-6", colsClass[cols], className)}>
      {children}
    </div>
  );
}

/**
 * Stat Card para exibir métricas
 */
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    positive?: boolean;
  };
  className?: string;
  glowColor?: "primary" | "accent" | "cyan" | "orange";
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  className,
  glowColor = "primary",
}: StatCardProps) {
  const glowClasses = {
    primary: "shadow-glow-sm hover:shadow-glow",
    accent: "shadow-glow-accent",
    cyan: "shadow-glow-cyan",
    orange: "shadow-glow-orange",
  };

  return (
    <div
      className={cn(
        "glass-card-hover p-6",
        glowClasses[glowColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="stat-label">{label}</p>
          <p className="stat-value-primary">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-primary" : "text-destructive"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state para listas vazias
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="p-4 rounded-2xl bg-surface mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/**
 * Skeleton loader para cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-6 space-y-4", className)}>
      <div className="skeleton-shimmer h-4 w-1/3 rounded" />
      <div className="skeleton-shimmer h-8 w-2/3 rounded" />
      <div className="skeleton-shimmer h-3 w-1/2 rounded" />
    </div>
  );
}

/**
 * Divider com glow opcional
 */
export function Divider({ glow = false }: { glow?: boolean }) {
  return <div className={glow ? "divider-glow my-6" : "divider my-6"} />;
}
