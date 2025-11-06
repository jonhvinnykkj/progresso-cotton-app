import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  useEffect(() => {
    // Só funciona em plataformas nativas (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Notificações: não é plataforma nativa, pulando inicialização');
      return;
    }

    const initPushNotifications = async () => {
      try {
        console.log('📱 Inicializando notificações push...');
        
        // Importar dinamicamente os plugins
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        // Solicitar permissão para notificações
        const permStatus = await PushNotifications.requestPermissions();
        console.log('📱 Permissão de notificações:', permStatus);
        
        if (permStatus.receive === 'granted') {
          // Registrar para receber notificações push
          await PushNotifications.register();
          console.log('📱 Registro de push notifications concluído');
        }

        // Também solicitar permissão para notificações locais
        const localPermStatus = await LocalNotifications.requestPermissions();
        console.log('📱 Permissão de notificações locais:', localPermStatus);

        // Listener para quando o registro for bem-sucedido
        await PushNotifications.addListener('registration', (token) => {
          console.log('📱 Push registration success, token:', token.value);
        });

        // Listener para erros de registro
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Error on registration:', error);
        });

        // Listener para quando uma notificação push chegar (app em primeiro plano)
        await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          console.log('📬 Push received:', notification);
          
          try {
            // Mostrar notificação local quando app está aberto
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: notification.title || 'Cotton App',
                  body: notification.body || '',
                  id: Date.now(),
                  schedule: { at: new Date(Date.now() + 1000) },
                  sound: undefined,
                  attachments: undefined,
                  actionTypeId: '',
                  extra: notification.data
                }
              ]
            });
          } catch (err) {
            console.error('❌ Erro ao agendar notificação local:', err);
          }
        });

        // Listener para quando usuário toca na notificação
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('👆 Push action performed:', notification);
        });

        // Listener para notificações locais
        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('👆 Local notification action performed:', notification);
        });

        console.log('✅ Notificações push inicializadas com sucesso');

        // Cleanup
        return async () => {
          await PushNotifications.removeAllListeners();
          await LocalNotifications.removeAllListeners();
        };

      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
      }
    };

    initPushNotifications();
  }, []);

  // Função para mostrar notificação local
  const showLocalNotification = async (title: string, body: string, data?: any) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Local notification (web):', { title, body });
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: data
          }
        ]
      });
      console.log('✅ Notificação local agendada:', title);
    } catch (error) {
      console.error('❌ Error showing local notification:', error);
    }
  };

  return { showLocalNotification };
}
