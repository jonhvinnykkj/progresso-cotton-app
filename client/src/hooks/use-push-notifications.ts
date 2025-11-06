import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  useEffect(() => {
    // Só funciona em plataformas nativas (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initPushNotifications = async () => {
      try {
        // Solicitar permissão para notificações
        const permStatus = await PushNotifications.requestPermissions();
        
        if (permStatus.receive === 'granted') {
          // Registrar para receber notificações push
          await PushNotifications.register();
        }

        // Também solicitar permissão para notificações locais
        await LocalNotifications.requestPermissions();

        // Listener para quando o registro for bem-sucedido
        PushNotifications.addListener('registration', (token) => {
          console.log('📱 Push registration success, token:', token.value);
          // Aqui você pode enviar o token para o backend se quiser push notifications do servidor
        });

        // Listener para erros de registro
        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Error on registration:', error);
        });

        // Listener para quando uma notificação push chegar (app em primeiro plano)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📬 Push received:', notification);
          
          // Mostrar notificação local quando app está aberto
          LocalNotifications.schedule({
            notifications: [
              {
                title: notification.title || 'Cotton App',
                body: notification.body || '',
                id: Date.now(),
                schedule: { at: new Date(Date.now() + 1000) }, // 1 segundo de delay
                sound: 'default',
                attachments: undefined,
                actionTypeId: '',
                extra: notification.data
              }
            ]
          });
        });

        // Listener para quando usuário toca na notificação
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('👆 Push action performed:', notification);
          // Aqui você pode navegar para uma tela específica baseado nos dados da notificação
        });

        // Listener para notificações locais
        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('👆 Local notification action performed:', notification);
        });

      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
      }
    };

    initPushNotifications();

    // Cleanup
    return () => {
      PushNotifications.removeAllListeners();
      LocalNotifications.removeAllListeners();
    };
  }, []);

  // Função para mostrar notificação local
  const showLocalNotification = async (title: string, body: string, data?: any) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Local notification (web):', { title, body });
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: data
          }
        ]
      });
    } catch (error) {
      console.error('❌ Error showing local notification:', error);
    }
  };

  return { showLocalNotification };
}
