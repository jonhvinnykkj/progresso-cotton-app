import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePushNotifications } from './use-push-notifications';
import type { Notification } from '@shared/schema';

/**
 * Hook que monitora notificações e dispara notificações nativas instantaneamente
 * Funciona tanto para web quanto para Android
 */
export function useNotificationListener() {
  const { showLocalNotification } = usePushNotifications();
  const queryClient = useQueryClient();
  const processedNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Listener para invalidações da query de notificações
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === '/api/notifications') {
        const notifications = event.query.state.data as Notification[] | undefined;
        
        if (!notifications) return;

        // Processar cada notificação
        notifications.forEach((notification) => {
          // Se é nova e ainda não foi processada
          if (!processedNotificationsRef.current.has(notification.id)) {
            console.log('🔔 Nova notificação detectada:', notification.title);
            
            // Exibir notificação nativa IMEDIATAMENTE
            showLocalNotification(
              notification.title,
              notification.message,
              { 
                type: notification.type, 
                id: notification.id,
                createdAt: notification.createdAt 
              }
            );
            
            // Marcar como processada
            processedNotificationsRef.current.add(notification.id);
          }
        });

        // Limpar IDs de notificações que foram deletadas
        const currentIds = new Set(notifications.map(n => n.id));
        processedNotificationsRef.current.forEach((id) => {
          if (!currentIds.has(id)) {
            processedNotificationsRef.current.delete(id);
          }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, showLocalNotification]);
}
