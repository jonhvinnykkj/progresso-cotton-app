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
            extra: data
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
