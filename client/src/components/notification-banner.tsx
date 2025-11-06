import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function NotificationBanner() {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000, // Recarrega a cada 1 minuto
  });

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {notifications.map((notification) => {
        const Icon = notificationIcons[notification.type] || Info;
        
        return (
          <Alert
            key={notification.id}
            variant={notification.type === "error" ? "destructive" : "default"}
            className={
              notification.type === "warning"
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                : notification.type === "success"
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : notification.type === "info"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                : ""
            }
          >
            <Icon className="h-4 w-4" />
            <AlertTitle>{notification.title}</AlertTitle>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
