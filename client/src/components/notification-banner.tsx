import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const notificationConfig = {
  info: {
    icon: Info,
    bgColor: "bg-blue-500",
    lightBg: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800/50",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-500",
    lightBg: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800/50",
    textColor: "text-green-700 dark:text-green-300",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-500",
    lightBg: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800/50",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-500",
    lightBg: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800/50",
    textColor: "text-red-700 dark:text-red-300",
  },
};

export function NotificationBanner() {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  if (visibleNotifications.length === 0) {
    return null;
  }

  const handleDismiss = (id: number) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  return (
    <div className="space-y-3 mb-6">
      {visibleNotifications.map((notification) => {
        const config = notificationConfig[notification.type] || notificationConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={notification.id}
            className={cn(
              "relative flex items-start gap-3 p-4 rounded-2xl border transition-all",
              config.lightBg,
              config.borderColor
            )}
          >
            {/* Icon */}
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              config.bgColor
            )}>
              <Icon className="h-4 w-4 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className={cn("text-[15px] font-semibold", config.textColor)}>
                {notification.title}
              </p>
              <p className="text-[14px] text-muted-foreground mt-0.5 leading-relaxed">
                {notification.message}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => handleDismiss(notification.id)}
              className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-surface transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
