import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { Notification } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const notificationIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function NotificationBanner() {
  const { showLocalNotification } = usePushNotifications();
  const previousNotificationsRef = useRef<Set<string>>(new Set());

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 60000, // Recarrega a cada 1 minuto
  });

  // Detectar novas notificações e mostrar notificação nativa
  useEffect(() => {
    if (notifications.length === 0) return;

    notifications.forEach((notification) => {
      // Se é uma notificação nova (não estava no ref anterior)
      if (!previousNotificationsRef.current.has(notification.id)) {
        // Mostrar notificação nativa do Android
        showLocalNotification(
          notification.title,
          notification.message,
          { type: notification.type, id: notification.id }
        );
        
        // Adicionar ao set de notificações já mostradas
        previousNotificationsRef.current.add(notification.id);
      }
    });

    // Limpar notificações que não existem mais
    const currentIds = new Set(notifications.map(n => n.id));
    previousNotificationsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        previousNotificationsRef.current.delete(id);
      }
    });
  }, [notifications, showLocalNotification]);

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
