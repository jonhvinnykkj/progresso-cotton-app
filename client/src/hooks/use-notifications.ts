import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export function useNotifications() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setupNotifications();
    }
  }, []);

  const setupNotifications = async () => {
    try {
      // Solicitar permissões
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        console.log('✅ Permissão de notificações concedida');
      } else {
        console.log('❌ Permissão de notificações negada');
      }
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
    }
  };

  const scheduleNotification = async (title: string, body: string, id: number = 1) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 1000) }, // Notifica em 1 segundo
            sound: undefined,
            attachments: undefined,
            actionTypeId: "",
            extra: null,
          },
        ],
      });
      console.log('📱 Notificação agendada:', title);
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
    }
  };

  const notifyMilestone = async (count: number) => {
    if (count > 0 && count % 1000 === 0) {
      await scheduleNotification(
        '🎯 Marco Alcançado!',
        `Parabéns! ${count.toLocaleString('pt-BR')} fardos cadastrados no sistema.`,
        count
      );
    }
  };

  const notifyLowProductivity = async (talhao: string, currentRate: number, avgRate: number) => {
    await scheduleNotification(
      '⚠️ Produtividade Baixa',
      `Talhão ${talhao}: ${currentRate.toFixed(2)} fardos/ha (média: ${avgRate.toFixed(2)} fardos/ha)`,
      Date.now()
    );
  };

  return {
    scheduleNotification,
    notifyMilestone,
    notifyLowProductivity,
  };
}
