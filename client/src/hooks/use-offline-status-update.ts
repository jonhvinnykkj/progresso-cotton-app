import { useMutation } from '@tanstack/react-query';
import { offlineStorage } from '@/lib/offline-storage';
import { queryClient } from '@/lib/queryClient';
import { useToast } from './use-toast';
import type { BaleStatus } from '@shared/schema';

interface UpdateStatusData {
  id: string;
  status: BaleStatus;
  userId: string;
}

export function useOfflineStatusUpdate() {
  const { toast } = useToast();

  const updateStatus = useMutation({
    mutationFn: async (data: UpdateStatusData) => {
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Tentar atualizar online primeiro
        try {
          const encodedId = encodeURIComponent(data.id);
          const response = await fetch(`/api/bales/${encodedId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              status: data.status,
              userId: data.userId,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update status');
          }

          const result = await response.json();
          return result;
        } catch (error) {
          // Se falhar online, salvar offline
          console.warn('⚠️ Falha ao atualizar online, salvando offline:', error);
          return saveStatusUpdateOffline(data);
        }
      } else {
        // Salvar offline diretamente
        return saveStatusUpdateOffline(data);
      }
    },
    onSuccess: (result, data) => {
      if (result.offline) {
        toast({
          variant: 'default',
          title: 'Status atualizado localmente',
          description: 'Será sincronizado quando houver conexão.',
        });
      } else {
        const statusLabel = data.status === 'patio' ? 'Em Pátio' : 'Beneficiado';
        toast({
          variant: 'success',
          title: 'Status atualizado',
          description: `Fardo marcado como ${statusLabel}.`,
        });
      }

      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['/api/bales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bales', data.id] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });

  return {
    updateStatus,
  };
}

async function saveStatusUpdateOffline(data: UpdateStatusData) {
  const operationId = await offlineStorage.savePendingOperation({
    type: 'update_status',
    data: data,
  });

  // Atualizar o cache local para refletir a mudança na UI
  await offlineStorage.updateBaleStatus(data.id, data.status);

  return { offline: true, id: operationId };
}
