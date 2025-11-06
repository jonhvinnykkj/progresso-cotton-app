import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export function usePushNotifications() {
  useEffect(() => {
    // Só funciona em plataformas nativas (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initNotifications = async () => {
      try {
        // Criar canal de notificação personalizado (Android 8+)
        await LocalNotifications.createChannel({
          id: 'cotton-app-notifications',
          name: 'Notificações do Sistema',
          description: 'Avisos importantes do sistema Cotton App',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#10b981'
        });

        // Solicitar permissão para notificações locais
        const permission = await LocalNotifications.requestPermissions();
        
        if (permission.display === 'granted') {
          console.log('✅ Permissão de notificações concedida');
        } else {
          console.log('⚠️ Permissão de notificações negada');
        }
      } catch (error) {
        console.error('❌ Erro ao solicitar permissão:', error);
      }
    };

    initNotifications();
  }, []);

  // Função para mostrar notificação local
  const showLocalNotification = useCallback(async (title: string, body: string, data?: any) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Notificação (web):', { title, body });
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 100) },
            extra: data,
            smallIcon: 'ic_stat_notification',
            iconColor: '#10b981',
            channelId: 'cotton-app-notifications',
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            group: 'cotton-notifications'
          }
        ]
      });
      console.log('✅ Notificação exibida:', title);
    } catch (error) {
      console.error('❌ Erro ao exibir notificação:', error);
    }
  }, []);

  return { showLocalNotification };
}
